import { browserManager } from "./browser-manager";

const LOGIN_URL = "https://www.linkedin.com/login";
const FEED_URL = "https://www.linkedin.com/feed/";
const AUTH_CHECK_TIMEOUT = 10000;

class SessionManager {
  private authenticated: boolean | null = null;

  async isAuthenticated(): Promise<boolean> {
    if (this.authenticated !== null) return this.authenticated;

    try {
      const page = await browserManager.newPage();

      try {
        await page.goto(FEED_URL, {
          waitUntil: "domcontentloaded",
          timeout: AUTH_CHECK_TIMEOUT,
        });

        const currentUrl = page.url();
        this.authenticated =
          !currentUrl.includes("/login") && !currentUrl.includes("/authwall");
      } finally {
        await page.close();
      }
    } catch {
      this.authenticated = false;
    }

    return this.authenticated;
  }

  async validateSession(): Promise<void> {
    const ok = await this.isAuthenticated();
    if (!ok) {
      throw new Error(
        "LinkedIn session is not authenticated. Open the browser profile and log in to LinkedIn manually, then restart the backend.",
      );
    }
  }

  getLoginUrl(): string {
    return LOGIN_URL;
  }

  invalidate(): void {
    this.authenticated = null;
  }
}

export const sessionManager = new SessionManager();
