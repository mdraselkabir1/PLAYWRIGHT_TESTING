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
    // Reuse an already-running ZAP instance — avoids the ~100s startup cost
    if (await this.isZapReady()) {
      console.log('ZAP is already running — skipping container start.');
      return;
    }

    // Clean up any stopped/crashed container with the same name
    try {
      execSync(`docker rm -f ${ZapLocators.CONTAINER_NAME} 2>/dev/null || true`, { stdio: 'pipe' });
    } catch { /* nothing to clean up */ }

    try {
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(
        `Failed to start ZAP container. Is Docker running and is the image pulled?\n` +
        `  docker pull ${ZapLocators.ZAP_IMAGE}\n` +
        `Docker error: ${msg}`
      );
    }

    await this.waitForZapReady();
  }

  // Quick one-shot check: is ZAP already up and responding?
  private async isZapReady(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3000);
      try {
        const res = await fetch(this.apiUrl(ZapLocators.VERSION), { signal: controller.signal });
        return res.ok;
      } finally {
        clearTimeout(timer);
      }
    } catch {
      return false;
    }
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

  // Poll until ZAP REST API responds — timeout after 4 minutes
  private async waitForZapReady(timeoutMs = 240_000): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let attempt = 0;
    while (Date.now() < deadline) {
      attempt++;
      const elapsed = Math.round((Date.now() - (deadline - timeoutMs)) / 1000);
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        try {
          const res = await fetch(this.apiUrl(ZapLocators.VERSION), { signal: controller.signal });
          clearTimeout(timer);
          console.log(`[ZAP] attempt ${attempt} (${elapsed}s): HTTP ${res.status}`);
          if (res.ok) return;
        } catch (fetchErr: unknown) {
          clearTimeout(timer);
          const name = (fetchErr as Error).name ?? 'Error';
          console.log(`[ZAP] attempt ${attempt} (${elapsed}s): ${name} — ${(fetchErr as Error).message}`);
        }
      } catch (err: unknown) {
        console.log(`[ZAP] attempt ${attempt} (${elapsed}s): unexpected error — ${(err as Error).message}`);
      }
      await new Promise(r => setTimeout(r, 3000));
    }
    // Dump logs before throwing so the error is actionable
    let logs = '';
    try { logs = execSync(`docker logs --tail 40 ${ZapLocators.CONTAINER_NAME}`, { stdio: 'pipe' }).toString(); } catch { /* ignore */ }
    throw new Error(
      `ZAP did not become ready within ${timeoutMs / 1000}s.\n` +
      `Make sure Docker is running and the image is pulled:\n` +
      `  docker pull ${ZapLocators.ZAP_IMAGE}\n` +
      (logs ? `Last container logs:\n${logs}` : '')
    );
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
