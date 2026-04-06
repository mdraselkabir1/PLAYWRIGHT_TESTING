# ZAP Security Testing Design

**Date:** 2026-04-06
**Target:** https://www.dsinnovators.com
**Status:** Approved

---

## Overview

Integrate OWASP ZAP security scanning into the existing Playwright + TypeScript test suite using the **proxy recording pattern**. Playwright navigates all pages through a ZAP proxy, ZAP records the traffic, then performs security scans. Results are saved as HTML and JSON reports. Tests never fail — they always report.

---

## Architecture

### New Files

```
locators/
  ZapLocators.ts            ← All ZAP config constants (Docker image, ports, API paths)

pages/
  ZapPage.ts                ← ZAP lifecycle manager (Docker, proxy, scan API, reports)

tests/security/
  baseline.spec.ts          ← Passive scan: spider + passive analysis
  full-scan.spec.ts         ← Active scan: spider + active attack testing
  api-scan.spec.ts          ← AJAX spider scan for JS-heavy / API endpoints

security-reports/           ← Output directory (gitignored)
  baseline/
    report.html
    report.json
  full-scan/
    report.html
    report.json
  api-scan/
    report.html
    report.json
```

### Existing Files (unchanged)

```
pages/HomePage.ts
pages/ServicesPage.ts
pages/BlogPage.ts
pages/ContactPage.ts
```

All existing POMs are reused as-is for navigation.

---

## Runtime Dependencies

- **Docker** must be installed and running (`docker` in PATH)
- **ZAP Docker image**: `softwaresecurityproject/zap2docker-stable` (pulled automatically on first run)
- No local ZAP installation required

---

## Data Flow

```
1. ZapPage.startZap()
   └─ docker run -d --name zap-container
      -p 8080:8080 -p 8090:8090
      softwaresecurityproject/zap2docker-stable
      zap.sh -daemon -host 0.0.0.0 -port 8090
              -config api.addrs.addr.name=.*
              -config api.addrs.addr.regex=true
              -config api.key=zapkey
   └─ polls GET /JSON/core/view/version/ until 200 (~30s timeout)

2. Playwright browser launched with proxy config
   └─ chromium.launch({ proxy: { server: 'http://localhost:8080' } })
   └─ context created with ignoreHTTPSErrors: true

3. Navigation via existing POMs
   └─ HomePage.goto()      → https://www.dsinnovators.com/
   └─ ServicesPage.goto()  → https://www.dsinnovators.com/services
   └─ BlogPage.goto()      → https://www.dsinnovators.com/blog
   └─ ContactPage.goto()   → https://www.dsinnovators.com/contact

4. Scan triggered via ZAP REST API
   └─ baseline:   POST /JSON/spider/action/scan/  (passive scan auto-follows)
   └─ full-scan:  POST /JSON/spider/action/scan/  then
                  POST /JSON/ascan/action/scan/
   └─ api-scan:   POST /JSON/ajaxSpider/action/scan/

5. ZapPage.waitForXxxComplete(scanId)
   └─ polls GET /JSON/*/view/status/ every 5s until progress = 100

6. ZapPage.saveReports(scanType)   ← always runs in test.afterAll, never throws
   └─ GET /OTHER/core/other/htmlreport/  → security-reports/<scanType>/report.html
   └─ GET /JSON/core/view/alerts/        → security-reports/<scanType>/report.json
   └─ Creates output directory if missing

7. ZapPage.stopZap()   ← always runs in test.afterAll
   └─ docker stop zap-container
   └─ docker rm zap-container
```

---

## ZapLocators.ts — Constants

```typescript
export class ZapLocators {
  static readonly ZAP_IMAGE = 'softwaresecurityproject/zap2docker-stable';
  static readonly CONTAINER_NAME = 'zap-container';
  static readonly PROXY_PORT = 8080;
  static readonly API_PORT = 8090;
  static readonly API_KEY = 'zapkey';
  static readonly API_BASE = `http://localhost:8090`;

  // API paths
  static readonly VERSION = '/JSON/core/view/version/';
  static readonly SPIDER_SCAN = '/JSON/spider/action/scan/';
  static readonly SPIDER_STATUS = '/JSON/spider/view/status/';
  static readonly ASCAN_SCAN = '/JSON/ascan/action/scan/';
  static readonly ASCAN_STATUS = '/JSON/ascan/view/status/';
  static readonly AJAX_SPIDER_SCAN = '/JSON/ajaxSpider/action/scan/';
  static readonly AJAX_SPIDER_STATUS = '/JSON/ajaxSpider/view/status/';
  static readonly HTML_REPORT = '/OTHER/core/other/htmlreport/';
  static readonly ALERTS_JSON = '/JSON/core/view/alerts/';
}
```

---

## ZapPage.ts — Method Contract

| Method | Description |
|--------|-------------|
| `startZap()` | Runs ZAP Docker container, polls until API ready |
| `stopZap()` | Stops and removes Docker container (always safe to call) |
| `getProxyConfig()` | Returns `{ server: 'http://localhost:8080' }` for Playwright |
| `navigateAllPages(page)` | Home → Services → Blog → Contact via existing POMs |
| `runBaselineScan(target)` | Triggers spider scan, returns scanId |
| `runFullScan(target)` | Triggers spider + active scan, returns active scanId |
| `runApiScan(target)` | Triggers AJAX spider scan |
| `waitForSpiderComplete(scanId)` | Polls spider status until 100% |
| `waitForActiveScanComplete(scanId)` | Polls active scan status until 100% |
| `waitForAjaxSpiderComplete()` | Polls AJAX spider until stopped |
| `saveReports(scanType)` | Downloads HTML + JSON reports, never throws |

---

## Spec File Pattern

All three specs follow identical structure:

```typescript
test.describe('ZAP <Type> Security Scan', () => {
  let zap: ZapPage;

  test.beforeAll(async () => {
    zap = new ZapPage();
    await zap.startZap();
  });

  test.afterAll(async () => {
    await zap.saveReports('<type>');   // always runs
    await zap.stopZap();               // always cleans up
  });

  test('navigate site through ZAP proxy and run <type> scan', async () => {
    const browser = await chromium.launch({ proxy: zap.getProxyConfig() });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    await zap.navigateAllPages(page);
    const scanId = await zap.<runXxxScan>(TARGET_URL);
    await zap.<waitForXxxComplete>(scanId);

    await browser.close();
  });
});
```

---

## Report Guarantee

`saveReports()` is wrapped in try/catch and always runs in `test.afterAll`. The `security-reports/<type>/` directory is created before writing. Reports are always present after a run, even if the scan step errored.

---

## Running the Scans

```bash
# Passive scan only (fastest, safest)
npx playwright test tests/security/baseline.spec.ts --project=chromium

# Active scan (slower, sends attack traffic)
npx playwright test tests/security/full-scan.spec.ts --project=chromium

# AJAX/API spider scan
npx playwright test tests/security/api-scan.spec.ts --project=chromium
```

---

## README Update

A new **Security Testing** section will be added to `README.md` covering:
- Prerequisites (Docker)
- How to run each scan
- Where to find reports
- Scan type descriptions and trade-offs
- Warning about active scan on production targets
