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

1. ZAP starts as a Docker container (`ghcr.io/zaproxy/zaproxy:stable`) with its proxy on port `8080`
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
docker pull ghcr.io/zaproxy/zaproxy:stable
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
