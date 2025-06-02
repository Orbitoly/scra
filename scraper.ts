// import { chromium } from "playwright";
// import readline from "node:readline/promises";
// import { stdin as input, stdout as output } from "node:process";

// async function scrapeShohamKabala() {
//   const browser = await chromium.launch({ headless: false });
//   const page = await browser.newPage();
//   await page.setExtraHTTPHeaders({
//     "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X)...",
//   });

//   try {
//     const response = await page.goto("https://shoham.biu.ac.il/kabala/", {
//       waitUntil: "domcontentloaded",
//       timeout: 60000,
//     });

//     const finalUrl = page.url();
//     const status = response?.status() || 0;

//     console.log(`🌐 Final URL: ${finalUrl}`);
//     console.log(`📶 HTTP Status: ${status}`);

//     if (status >= 200 && status < 300) {
//       const html = await page.content();

//       // Detect bot challenge based on known patterns
//       const isBotChallenge =
//         html.includes("stormcaster.js") ||
//         html.includes("var __uzdbm_") ||
//         html.includes("ssConf(");

//       if (isBotChallenge) {
//         console.log(
//           "🛡 Bot challenge detected (JS redirect or token validation)"
//         );
//       } else {
//         console.log("✅ Page is available and clean");
//         console.log(html.slice(0, 500)); // optional preview
//       }
//     } else if (status >= 300 && status < 400) {
//       console.log("🔁 Redirect detected (3xx)");
//     } else if (status >= 400 && status < 600) {
//       console.log("❌ Page not available (4xx/5xx)");
//     } else {
//       console.log("⚠️ Unknown or missing response");
//     }
//   } catch (err) {
//     console.error("💥 Request failed or timed out:", err);
//   } finally {
//     const rl = readline.createInterface({ input, output });
//     await rl.question("🛑 Press Enter to close the browser...");
//     rl.close();
//     await browser.close();
//     await browser.close();
//   }
// }

// scrapeShohamKabala();

// import { chromium } from "playwright";
// import readline from "node:readline/promises";
// import { stdin as input, stdout as output } from "node:process";

// async function scrapeShohamKabala() {
//   const browser = await chromium.launch({ headless: false });
//   const context = await browser.newContext({
//     userAgent:
//       "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1",
//   });

//   const page = await context.newPage();

//   try {
//     const response = await page.goto("https://shoham.biu.ac.il/kabala/", {
//       waitUntil: "networkidle",
//       timeout: 60000,
//     });

//     const finalUrl = page.url();
//     const status = response?.status() || 0;

//     console.log(`🌐 Final URL: ${finalUrl}`);
//     console.log(`📶 HTTP Status: ${status}`);

//     const html = await page.content();
//     const isBotChallenge =
//       html.includes("stormcaster.js") ||
//       html.includes("var __uzdbm_") ||
//       html.includes("ssConf(");

//     if (isBotChallenge) {
//       console.log(
//         "🛡 Bot challenge was likely present, but we waited for network to idle."
//       );
//     }

//     // 🍪 Extract cookies
//     const cookies = await context.cookies();
//     const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

//     // 🐚 Generate curl command
//     console.log("\n📋 Use this curl command for further scraping:");
//     console.log(`\ncurl '${finalUrl}' \\`);
//     console.log(`  -H "Cookie: ${cookieHeader}" \\`);
//     console.log(
//       `  -H "User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"`
//     );

//     // Optional preview of the HTML
//     console.log("\n🧾 Page HTML Preview:\n", html.slice(0, 500));
//   } catch (err) {
//     console.error("💥 Error:", err);
//   } finally {
//     const rl = readline.createInterface({ input, output });
//     await rl.question("🛑 Press Enter to close the browser...");
//     rl.close();
//     await browser.close();
//   }
// }

// scrapeShohamKabala();
import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = process.env.PORT || 3000;

app.get("/scrape", async (_, res) => {
  const browser = await chromium.launch({ headless: true });
  const userAgent =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1";
  const context = await browser.newContext({
    userAgent,
  });

  const page = await context.newPage();
  const result: Record<string, any> = {};

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
    const cookieHeader = cookies.map((c) => `${c.name}=${c.value}`).join("; ");

    const curlCommand = [
      `curl '${finalUrl}' \\`,
      `  -H "Cookie: ${cookieHeader}" \\`,
      `  -H "User-Agent: ${userAgent}"`,
    ].join("\n");

    // Full result object
    Object.assign(result, {
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
  } catch (err: any) {
    console.error("💥 Scrape error:", err);
    res.status(500).json({
      error: "Scrape failed",
      message: err.message,
    });
  } finally {
    await browser.close();
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Listening at http://localhost:${PORT}`);
});
