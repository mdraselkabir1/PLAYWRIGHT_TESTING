# ZAP Security Testing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate OWASP ZAP security scanning into the Playwright suite using Docker proxy mode — Playwright navigates all pages through ZAP, ZAP records traffic and scans it, reports saved to `security-reports/`.

**Architecture:** ZapPage manages the ZAP Docker container lifecycle and REST API calls. Three independent spec files (baseline, full-scan, api-scan) each start ZAP, proxy Playwright through it using existing POMs, trigger their specific scan type, and always save HTML + JSON reports. Tests never fail — they always report.

**Tech Stack:** TypeScript, Playwright, OWASP ZAP (Docker image `softwaresecurityproject/zap2docker-stable`), Node.js `child_process`, native `fetch`, Node.js `fs`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `locators/ZapLocators.ts` | Create | All ZAP config constants: Docker image, ports, API key, API endpoint paths |
| `pages/ZapPage.ts` | Create | ZAP lifecycle (Docker start/stop), proxy config, navigation, scan APIs, report saving |
| `tests/security/baseline.spec.ts` | Create | Passive spider scan spec |
| `tests/security/full-scan.spec.ts` | Create | Active attack scan spec |
| `tests/security/api-scan.spec.ts` | Create | AJAX spider scan spec |
| `.gitignore` | Modify | Add `security-reports/` |
| `README.md` | Create | Full project README with security testing section |

---

## Task 1: Project Setup

**Files:**
- Modify: `.gitignore`
- Create: `security-reports/.gitkeep`

- [ ] **Step 1: Add security-reports to .gitignore**

Open `.gitignore` and add after the existing entries:

```
# ZAP security scan reports
/security-reports/
```

- [ ] **Step 2: Create the output directory with a .gitkeep**

```bash
mkdir -p security-reports
touch security-reports/.gitkeep
```

- [ ] **Step 3: Verify directory exists**

```bash
ls security-reports/
```

Expected output: `.gitkeep`

- [ ] **Step 4: Commit**

```bash
git add .gitignore security-reports/.gitkeep
git commit -m "chore: add security-reports output dir and gitignore entry"
```

---

## Task 2: Create ZapLocators.ts

**Files:**
- Create: `locators/ZapLocators.ts`

- [ ] **Step 1: Create the file**

```typescript
// locators/ZapLocators.ts

export class ZapLocators {
  // Docker
  static readonly ZAP_IMAGE = 'softwaresecurityproject/zap2docker-stable';
  static readonly CONTAINER_NAME = 'zap-container';
  static readonly PROXY_PORT = 8080;
  static readonly API_KEY = 'zapkey';
  static readonly API_BASE = 'http://localhost:8080';

  // Startup
  static readonly VERSION = '/JSON/core/view/version/';

  // Spider (passive)
  static readonly SPIDER_SCAN = '/JSON/spider/action/scan/';
  static readonly SPIDER_STATUS = '/JSON/spider/view/status/';

  // Active scan
  static readonly ASCAN_SCAN = '/JSON/ascan/action/scan/';
  static readonly ASCAN_STATUS = '/JSON/ascan/view/status/';

  // AJAX spider
  static readonly AJAX_SPIDER_SCAN = '/JSON/ajaxSpider/action/scan/';
  static readonly AJAX_SPIDER_STATUS = '/JSON/ajaxSpider/view/status/';

  // Reports
  static readonly HTML_REPORT = '/OTHER/core/other/htmlreport/';
  static readonly ALERTS_JSON = '/JSON/core/view/alerts/';
}
```

- [ ] **Step 2: Commit**

```bash
git add locators/ZapLocators.ts
git commit -m "feat: add ZapLocators with all ZAP config constants"
```

---

## Task 3: Create ZapPage.ts

**Files:**
- Create: `pages/ZapPage.ts`

This is the full class. All methods are defined together because they share `apiUrl()` and the same import set.

- [ ] **Step 1: Create the file with full implementation**

```typescript
// pages/ZapPage.ts

import { Page } from '@playwright/test';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { ZapLocators } from '../locators/ZapLocators';
import { HomePage } from './HomePage';
import { ServicesPage } from './ServicesPage';
import { BlogPage } from './BlogPage';
import { ContactPage } from './ContactPage';

export class ZapPage {
  private readonly apiBase = ZapLocators.API_BASE;
  private readonly apiKey = ZapLocators.API_KEY;

  // Build a full ZAP API URL with apikey and any extra params
  private apiUrl(endpoint: string, params: Record<string, string> = {}): string {
    const query = new URLSearchParams({ apikey: this.apiKey, ...params });
    return `${this.apiBase}${endpoint}?${query}`;
  }

  // ── Lifecycle ──────────────────────────────────────────────────────────────

  async startZap(): Promise<void> {
    execSync(
      `docker run -d --name ${ZapLocators.CONTAINER_NAME} ` +
      `-p ${ZapLocators.PROXY_PORT}:${ZapLocators.PROXY_PORT} ` +
      `${ZapLocators.ZAP_IMAGE} ` +
      `zap.sh -daemon -host 0.0.0.0 -port ${ZapLocators.PROXY_PORT} ` +
      `-config api.addrs.addr.name=.* ` +
      `-config api.addrs.addr.regex=true ` +
      `-config api.key=${ZapLocators.API_KEY}`,
      { stdio: 'pipe' }
    );
    await this.waitForZapReady();
  }

  async stopZap(): Promise<void> {
    try {
      execSync(`docker stop ${ZapLocators.CONTAINER_NAME}`, { stdio: 'pipe' });
      execSync(`docker rm ${ZapLocators.CONTAINER_NAME}`, { stdio: 'pipe' });
    } catch {
      // container may already be stopped or removed — safe to ignore
    }
  }

  getProxyConfig(): { server: string } {
    return { server: `http://localhost:${ZapLocators.PROXY_PORT}` };
  }

  // Poll until ZAP REST API responds — timeout after 2 minutes
  private async waitForZapReady(timeoutMs = 120_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(this.apiUrl(ZapLocators.VERSION));
        if (res.ok) return;
      } catch {
        // ZAP not ready yet
      }
      await new Promise(r => setTimeout(r, 3000));
    }
    throw new Error('ZAP did not become ready within 2 minutes. Is Docker running?');
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  // Navigate all pages using existing POMs so ZAP records all traffic
  async navigateAllPages(page: Page): Promise<void> {
    const home = new HomePage(page);
    const services = new ServicesPage(page);
    const blog = new BlogPage(page);
    const contact = new ContactPage(page);

    await home.goto();
    await page.waitForLoadState('networkidle');

    await services.goto();
    await page.waitForLoadState('networkidle');

    await blog.goto();
    await page.waitForLoadState('networkidle');

    await contact.goto();
    await page.waitForLoadState('networkidle');
  }

  // ── Baseline scan (spider + passive) ──────────────────────────────────────

  async runBaselineScan(target: string): Promise<string> {
    const res = await fetch(this.apiUrl(ZapLocators.SPIDER_SCAN, { url: target }));
    const json = await res.json() as { scan: string };
    return json.scan;
  }

  async waitForSpiderComplete(scanId: string): Promise<void> {
    while (true) {
      const res = await fetch(this.apiUrl(ZapLocators.SPIDER_STATUS, { scanId }));
      const json = await res.json() as { status: string };
      if (json.status === '100') return;
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // ── Full scan (spider + active attack) ────────────────────────────────────

  // Runs spider first (to discover URLs), then active scan on discovered URLs
  async runFullScan(target: string): Promise<string> {
    const spiderRes = await fetch(this.apiUrl(ZapLocators.SPIDER_SCAN, { url: target }));
    const spiderId = (await spiderRes.json() as { scan: string }).scan;
    await this.waitForSpiderComplete(spiderId);

    const ascanRes = await fetch(this.apiUrl(ZapLocators.ASCAN_SCAN, { url: target }));
    const json = await ascanRes.json() as { scan: string };
    return json.scan;
  }

  async waitForActiveScanComplete(scanId: string): Promise<void> {
    while (true) {
      const res = await fetch(this.apiUrl(ZapLocators.ASCAN_STATUS, { scanId }));
      const json = await res.json() as { status: string };
      if (json.status === '100') return;
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // ── API / AJAX spider scan ─────────────────────────────────────────────────

  async runApiScan(target: string): Promise<void> {
    await fetch(this.apiUrl(ZapLocators.AJAX_SPIDER_SCAN, { url: target }));
  }

  async waitForAjaxSpiderComplete(): Promise<void> {
    while (true) {
      const res = await fetch(this.apiUrl(ZapLocators.AJAX_SPIDER_STATUS));
      const json = await res.json() as { status: string };
      if (json.status === 'stopped') return;
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  // ── Reports ────────────────────────────────────────────────────────────────

  // Always runs — wrapped in try/catch so reports are saved even on scan error
  async saveReports(scanType: 'baseline' | 'full-scan' | 'api-scan'): Promise<void> {
    try {
      const dir = path.join(process.cwd(), 'security-reports', scanType);
      fs.mkdirSync(dir, { recursive: true });

      // HTML report
      const htmlRes = await fetch(this.apiUrl(ZapLocators.HTML_REPORT));
      const htmlContent = await htmlRes.text();
      fs.writeFileSync(path.join(dir, 'report.html'), htmlContent, 'utf-8');

      // JSON alerts
      const jsonRes = await fetch(this.apiUrl(ZapLocators.ALERTS_JSON));
      const jsonContent = await jsonRes.text();
      fs.writeFileSync(path.join(dir, 'report.json'), jsonContent, 'utf-8');

      console.log(`\n✓ ZAP reports saved to: security-reports/${scanType}/`);
      console.log(`  - security-reports/${scanType}/report.html`);
      console.log(`  - security-reports/${scanType}/report.json`);
    } catch (err) {
      console.error(`\n⚠ Failed to save ZAP reports for "${scanType}": ${err}`);
    }
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add pages/ZapPage.ts
git commit -m "feat: add ZapPage with Docker lifecycle, proxy config, scans, and report saving"
```

---

## Task 4: Create baseline.spec.ts

**Files:**
- Create: `tests/security/baseline.spec.ts`

- [ ] **Step 1: Create the directory and file**

```bash
mkdir -p tests/security
```

```typescript
// tests/security/baseline.spec.ts

import { test } from '@playwright/test';
import { chromium } from '@playwright/test';
import { ZapPage } from '../../pages/ZapPage';

const TARGET_URL = process.env.BASE_URL || 'https://www.dsinnovators.com';

test.describe('ZAP Baseline Security Scan', () => {
  let zap: ZapPage;

  // ZAP startup can take ~60s — allow 3 minutes for the hook
  test.beforeAll({ timeout: 3 * 60 * 1000 }, async () => {
    zap = new ZapPage();
    await zap.startZap();
  });

  // afterAll always runs — reports are saved even if the test errors
  test.afterAll({ timeout: 3 * 60 * 1000 }, async () => {
    await zap.saveReports('baseline');
    await zap.stopZap();
  });

  // Baseline: spider + passive scan. Allow 15 minutes.
  test('navigate site through ZAP proxy and run baseline scan', async () => {
    test.setTimeout(15 * 60 * 1000);

    const browser = await chromium.launch({ proxy: zap.getProxyConfig() });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    await zap.navigateAllPages(page);

    const scanId = await zap.runBaselineScan(TARGET_URL);
    await zap.waitForSpiderComplete(scanId);
    // Passive scan runs automatically after spider — no extra trigger needed

    await browser.close();
  });
});
```

- [ ] **Step 2: Run to verify it is picked up by Playwright**

```bash
npx playwright test tests/security/baseline.spec.ts --list
```

Expected output:
```
  [chromium] › tests/security/baseline.spec.ts:16:7 › ZAP Baseline Security Scan › navigate site through ZAP proxy and run baseline scan
```

- [ ] **Step 3: Commit**

```bash
git add tests/security/baseline.spec.ts
git commit -m "feat: add ZAP baseline (passive) security scan spec"
```

---

## Task 5: Create full-scan.spec.ts

**Files:**
- Create: `tests/security/full-scan.spec.ts`

- [ ] **Step 1: Create the file**

```typescript
// tests/security/full-scan.spec.ts

import { test } from '@playwright/test';
import { chromium } from '@playwright/test';
import { ZapPage } from '../../pages/ZapPage';

const TARGET_URL = process.env.BASE_URL || 'https://www.dsinnovators.com';

test.describe('ZAP Full Active Security Scan', () => {
  let zap: ZapPage;

  test.beforeAll({ timeout: 3 * 60 * 1000 }, async () => {
    zap = new ZapPage();
    await zap.startZap();
  });

  // afterAll always runs — reports saved even if scan errors
  test.afterAll({ timeout: 3 * 60 * 1000 }, async () => {
    await zap.saveReports('full-scan');
    await zap.stopZap();
  });

  // Full active scan: spider then active attack testing. Allow 60 minutes.
  test('navigate site through ZAP proxy and run full active scan', async () => {
    test.setTimeout(60 * 60 * 1000);

    const browser = await chromium.launch({ proxy: zap.getProxyConfig() });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    await zap.navigateAllPages(page);

    // runFullScan internally runs spider first, then triggers active scan
    const scanId = await zap.runFullScan(TARGET_URL);
    await zap.waitForActiveScanComplete(scanId);

    await browser.close();
  });
});
```

- [ ] **Step 2: Verify it is picked up**

```bash
npx playwright test tests/security/full-scan.spec.ts --list
```

Expected output:
```
  [chromium] › tests/security/full-scan.spec.ts:16:7 › ZAP Full Active Security Scan › navigate site through ZAP proxy and run full active scan
```

- [ ] **Step 3: Commit**

```bash
git add tests/security/full-scan.spec.ts
git commit -m "feat: add ZAP full active security scan spec"
```

---

## Task 6: Create api-scan.spec.ts

**Files:**
- Create: `tests/security/api-scan.spec.ts`

- [ ] **Step 1: Create the file**

```typescript
// tests/security/api-scan.spec.ts

import { test } from '@playwright/test';
import { chromium } from '@playwright/test';
import { ZapPage } from '../../pages/ZapPage';

const TARGET_URL = process.env.BASE_URL || 'https://www.dsinnovators.com';

test.describe('ZAP API / AJAX Spider Security Scan', () => {
  let zap: ZapPage;

  test.beforeAll({ timeout: 3 * 60 * 1000 }, async () => {
    zap = new ZapPage();
    await zap.startZap();
  });

  // afterAll always runs — reports saved even if scan errors
  test.afterAll({ timeout: 3 * 60 * 1000 }, async () => {
    await zap.saveReports('api-scan');
    await zap.stopZap();
  });

  // AJAX spider: discovers JS-rendered content and API endpoints. Allow 30 minutes.
  test('navigate site through ZAP proxy and run AJAX spider scan', async () => {
    test.setTimeout(30 * 60 * 1000);

    const browser = await chromium.launch({ proxy: zap.getProxyConfig() });
    const context = await browser.newContext({ ignoreHTTPSErrors: true });
    const page = await context.newPage();

    await zap.navigateAllPages(page);

    await zap.runApiScan(TARGET_URL);
    await zap.waitForAjaxSpiderComplete();

    await browser.close();
  });
});
```

- [ ] **Step 2: Verify all three specs are listed**

```bash
npx playwright test tests/security/ --list
```

Expected: 3 tests listed, one per spec file (chromium only — security scans are browser-agnostic).

- [ ] **Step 3: Commit**

```bash
git add tests/security/api-scan.spec.ts
git commit -m "feat: add ZAP AJAX spider / API security scan spec"
```

---

## Task 7: Create README.md

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create README.md with full documentation**

```markdown
# DS Innovators — Playwright Test Suite

End-to-end and security testing for [DS Innovators](https://www.dsinnovators.com) using Playwright and OWASP ZAP.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Docker](https://www.docker.com/) (required for security scans only)

```bash
npm install
npx playwright install
```

---

## Folder Structure

```
locators/          # Element selectors organized by page
pages/             # Page Object Model classes
tests/
  contact/         # Contact form tests
  navigation/      # Navigation flow tests
  blog/            # Blog page tests
  services/        # Services page tests
  security/        # OWASP ZAP security scan tests (separate from functional tests)
security-reports/  # ZAP scan output — HTML + JSON reports (gitignored)
```

---

## Running Functional Tests

```bash
# All tests across all browsers
npx playwright test

# Single file
npx playwright test tests/contact/contact.spec.ts

# Specific browser
npx playwright test --project=chromium

# Headed mode (visible browser)
npx playwright test --headed

# Debug mode
npx playwright test --debug

# View last HTML report
npx playwright show-report
```

---

## Security Testing with OWASP ZAP

Security tests are in `tests/security/` and are kept **separate from functional tests**. They require Docker and are run independently.

### How it works

1. ZAP starts as a Docker container (`softwaresecurityproject/zap2docker-stable`) with its proxy on port `8080`
2. Playwright launches a browser routed through the ZAP proxy
3. The test navigates all pages (Home → Services → Blog → Contact) — ZAP records all traffic
4. ZAP performs its scan on the recorded traffic
5. Reports are saved to `security-reports/<scan-type>/report.html` and `report.json`
6. **The test never fails** — it always saves the reports regardless of findings

> **Important:** The full active scan (`full-scan.spec.ts`) sends attack-style requests (SQL injection payloads, XSS probes, etc.) to the target. Only run this if you have explicit written authorization to test the target system.

### Prerequisites for security scans

Docker must be installed and the Docker daemon must be running:

```bash
docker --version     # verify Docker is installed
docker ps            # verify Docker daemon is running
```

The ZAP Docker image is pulled automatically on first run (~500MB):

```bash
docker pull softwaresecurityproject/zap2docker-stable
```

### Scan Types

| Scan | File | Description | Approx. Duration |
|------|------|-------------|-----------------|
| **Baseline** | `baseline.spec.ts` | Spider + passive analysis. Read-only. Safe for production. | 5–15 min |
| **Full (Active)** | `full-scan.spec.ts` | Spider + active attack testing (SQLi, XSS, path traversal, etc.). **Do not run on systems you don't own.** | 30–60 min |
| **API / AJAX** | `api-scan.spec.ts` | AJAX spider for JS-rendered content and API endpoint discovery. | 15–30 min |

### Running Security Scans

Run each scan type independently. Always use `--project=chromium` (security scans are browser-agnostic — no need to run across all three browsers).

```bash
# Baseline scan — passive only, safe for production
npx playwright test tests/security/baseline.spec.ts --project=chromium

# Full active scan — sends attack traffic, requires authorization
npx playwright test tests/security/full-scan.spec.ts --project=chromium

# API / AJAX spider scan
npx playwright test tests/security/api-scan.spec.ts --project=chromium
```

### Reading the Reports

After a scan completes, open the HTML report in your browser:

```bash
open security-reports/baseline/report.html    # macOS
start security-reports/baseline/report.html   # Windows
xdg-open security-reports/baseline/report.html # Linux
```

The JSON report (`report.json`) contains all alerts in machine-readable format for further processing.

**Alert severity levels:**
- **High** — Serious vulnerabilities requiring immediate attention
- **Medium** — Issues that should be addressed
- **Low** — Minor issues or improvements
- **Informational** — Observations with no direct security impact

### Custom Base URL

By default, scans target `https://www.dsinnovators.com`. Override with the `BASE_URL` environment variable:

```bash
BASE_URL=https://staging.dsinnovators.com npx playwright test tests/security/baseline.spec.ts --project=chromium
```

### Troubleshooting

**ZAP container already exists:**
```bash
docker stop zap-container && docker rm zap-container
```

**ZAP takes too long to start:**
The `waitForZapReady` method polls for up to 2 minutes. If your machine is slow, check Docker resource allocation (RAM, CPU) in Docker Desktop settings.

**Port 8080 already in use:**
```bash
lsof -i :8080   # find what is using port 8080
```
Stop that process, or change `PROXY_PORT` in `locators/ZapLocators.ts` and re-run.

**`docker` command not found:**
Install Docker Desktop from https://www.docker.com/products/docker-desktop and ensure it is running.
```

- [ ] **Step 2: Verify the file looks correct**

```bash
cat README.md | head -20
```

Expected: first 20 lines of the README header and prerequisites.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add README with security testing guide for OWASP ZAP scans"
```

---

## Self-Review

### Spec coverage check

| Spec requirement | Covered by task |
|-----------------|----------------|
| Docker as ZAP runtime | Task 3 (`startZap` uses `docker run`) |
| All three scan types separate | Tasks 4, 5, 6 |
| ZAP proxy mode (Playwright routes through ZAP) | Tasks 4-6 (`chromium.launch({ proxy })`) |
| Existing POMs for navigation | Task 3 (`navigateAllPages`) |
| Reports always saved | Task 3 (`saveReports` in try/catch, called in `afterAll`) |
| Reports in `security-reports/<type>/` | Task 3 (`saveReports`), Task 1 (directory) |
| HTML + JSON reports | Task 3 (`saveReports` fetches both) |
| Tests never fail | Tasks 4-6 (no assertions, `afterAll` always runs) |
| README | Task 7 |
| `.gitignore` entry | Task 1 |

### Type consistency check

| Name | Defined in | Used in |
|------|-----------|---------|
| `ZapLocators.CONTAINER_NAME` | Task 2 | Task 3 (`startZap`, `stopZap`) |
| `ZapLocators.PROXY_PORT` | Task 2 | Task 3 (`startZap`, `getProxyConfig`) |
| `ZapLocators.API_KEY` | Task 2 | Task 3 (`apiKey`, `startZap`) |
| `ZapLocators.SPIDER_SCAN` | Task 2 | Task 3 (`runBaselineScan`, `runFullScan`) |
| `ZapLocators.SPIDER_STATUS` | Task 2 | Task 3 (`waitForSpiderComplete`) |
| `ZapLocators.ASCAN_SCAN` | Task 2 | Task 3 (`runFullScan`) |
| `ZapLocators.ASCAN_STATUS` | Task 2 | Task 3 (`waitForActiveScanComplete`) |
| `ZapLocators.AJAX_SPIDER_SCAN` | Task 2 | Task 3 (`runApiScan`) |
| `ZapLocators.AJAX_SPIDER_STATUS` | Task 2 | Task 3 (`waitForAjaxSpiderComplete`) |
| `ZapLocators.HTML_REPORT` | Task 2 | Task 3 (`saveReports`) |
| `ZapLocators.ALERTS_JSON` | Task 2 | Task 3 (`saveReports`) |
| `zap.runBaselineScan(TARGET_URL)` | Task 3 | Task 4 |
| `zap.waitForSpiderComplete(scanId)` | Task 3 | Task 4 |
| `zap.runFullScan(TARGET_URL)` | Task 3 | Task 5 |
| `zap.waitForActiveScanComplete(scanId)` | Task 3 | Task 5 |
| `zap.runApiScan(TARGET_URL)` | Task 3 | Task 6 |
| `zap.waitForAjaxSpiderComplete()` | Task 3 | Task 6 |
| `zap.saveReports('baseline')` | Task 3 | Task 4 |
| `zap.saveReports('full-scan')` | Task 3 | Task 5 |
| `zap.saveReports('api-scan')` | Task 3 | Task 6 |

All consistent. ✓
