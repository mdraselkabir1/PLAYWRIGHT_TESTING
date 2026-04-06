// tests/security/baseline.spec.ts

import { test } from '@playwright/test';
import { chromium } from '@playwright/test';
import { ZapPage } from '../../pages/ZapPage';

const TARGET_URL = process.env.BASE_URL || 'https://www.dsinnovators.com';

test.describe('ZAP Baseline Security Scan', () => {
  let zap: ZapPage;

  // ZAP startup can take ~3 min on first run — allow 5 minutes for the hook
  test.beforeAll(async () => {
    test.setTimeout(15 * 60 * 1000);
    zap = new ZapPage();
    await zap.startZap();
  });

  // afterAll always runs — reports are saved even if the test errors
  test.afterAll(async () => {
    test.setTimeout(3 * 60 * 1000);
    await zap.saveReports('baseline');
    // await zap.stopZap();
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
