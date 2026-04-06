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
