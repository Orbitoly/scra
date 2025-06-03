import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/scrape", async (_, res) => {
  let browser;
  const result: Record<string, any> = {};

  try {
    // Launch browser with better error handling
    browser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--disable-gpu",
      ],
    });

    const userAgent =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
    const context = await browser.newContext({
      userAgent,
    });

    const page = await context.newPage();

    try {
      const response = await page.goto("https://shoham.biu.ac.il/kabala/", {
        waitUntil: "domcontentloaded",
        timeout: 60000,
      });

      const finalUrl = page.url();
      const status = response?.status() || 0;
      const headers = response?.headers() || {};
      const html = await page.content();

      const isBotChallenge =
        html.includes("stormcaster.js") ||
        html.includes("var __uzdbm_") ||
        html.includes("ssConf(") ||
        html.includes("403 Forbidden");

      const cookies = await context.cookies();
      const cookieHeader = cookies
        .map((c) => `${c.name}=${c.value}`)
        .join("; ");

      const curlCommand = [
        `curl '${finalUrl}' \\`,
        `  -H "Cookie: ${cookieHeader}" \\`,
        `  -H "User-Agent: ${userAgent}"`,
      ].join("\n");

      // Full result object
      Object.assign(result, {
        success: true,
        finalUrl,
        status,
        isBotChallenge,
        headers,
        cookies,
        curlCommand,
        htmlPreview: html.slice(0, 500),
        htmlContains: {
          forbidden: html.includes("403 Forbidden"),
          transactionId: html.match(/Transaction ID:\s*(\w+)/)?.[1] || null,
          hasBody: html.includes("<body>"),
        },
      });

      console.log("🧾 Scrape Result:\n", JSON.stringify(result, null, 2));
      res.status(status).json(result);
    } catch (pageError: any) {
      console.error("💥 Page navigation error:", pageError);
      res.status(500).json({
        success: false,
        error: "Page navigation failed",
        message: pageError.message,
      });
    }
  } catch (browserError: any) {
    console.error("💥 Browser launch error:", browserError);
    res.status(500).json({
      success: false,
      error: "Browser launch failed",
      message: browserError.message,
      hint: "This might be a Playwright browser installation issue",
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Add a health check endpoint
app.get("/health", (_, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.listen(Number(PORT), "0.0.0.0", () => {
  console.log(`🚀 Listening at http://localhost:${PORT}`);
});
