import path from "node:path";
import fs from "node:fs";
import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { env } from "../config/env";

const USER_DATA_DIR = path.resolve(process.cwd(), "data", "browser-profile");

class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private launching = false;
  private launchPromise: Promise<void> | null = null;

  async getContext(): Promise<BrowserContext> {
    if (this.context) return this.context;

    if (this.launching && this.launchPromise) {
      await this.launchPromise;
      return this.context!;
    }

    this.launching = true;
    this.launchPromise = this.launch();
    await this.launchPromise;
    this.launching = false;

    return this.context!;
  }

  private async launch(): Promise<void> {
    if (!fs.existsSync(USER_DATA_DIR)) {
      fs.mkdirSync(USER_DATA_DIR, { recursive: true });
    }

    this.context = await chromium.launchPersistentContext(USER_DATA_DIR, {
      headless: env.PLAYWRIGHT_HEADLESS,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
        "--disable-infobars",
      ],
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
      timezoneId: "America/New_York",
      ignoreHTTPSErrors: false,
    });

    this.browser = this.context.browser();

    this.context.on("close", () => {
      this.context = null;
      this.browser = null;
    });
  }

  async newPage(): Promise<Page> {
    const ctx = await this.getContext();
    const page = await ctx.newPage();

    // Polyfill esbuild/tsx helper injected into serialized evaluate() callbacks.
    // tsx wraps every named const-arrow function as __name(fn, "name") in compiled
    // output; page.evaluate serializes the function body including those calls, so
    // the browser must have __name available.
    await page.addInitScript(`
      if (typeof __name === "undefined") {
        var __name = function(target, value) {
          try { Object.defineProperty(target, "name", { value: value, configurable: true }); } catch(e) {}
          return target;
        };
      }
    `);

    await page.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
    });

    return page;
  }

  async shutdown(): Promise<void> {
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  isReady(): boolean {
    return this.context !== null;
  }
}

export const browserManager = new BrowserManager();
