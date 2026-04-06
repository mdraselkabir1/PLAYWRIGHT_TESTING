// tests/security/full-scan.spec.ts

import { test } from '@playwright/test';
import { chromium } from '@playwright/test';
import { ZapPage } from '../../pages/ZapPage';

const TARGET_URL = process.env.BASE_URL || 'https://www.dsinnovators.com';

test.describe('ZAP Full Active Security Scan', () => {
  let zap: ZapPage;

  test.beforeAll(async () => {
    test.setTimeout(3 * 60 * 1000);
    zap = new ZapPage();
    await zap.startZap();
  });

  // afterAll always runs — reports saved even if scan errors
  test.afterAll(async () => {
    test.setTimeout(3 * 60 * 1000);
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
