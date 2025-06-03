const fastify = require("fastify")({
  logger: { level: "error" },
  trustProxy: true,
});
const puppeteer = require("puppeteer");
const PORT = process.env.PORT || 3000;
fastify.register(require("@fastify/cors"));

// Root test
fastify.get("/", async (req, reply) => {
  return { hello: "from nodejs" };
});

// Simple 401 route
fastify.get("/401", async (req, reply) => {
  return reply
    .code(401)
    .header("Content-Type", "application/json; charset=utf-8")
    .send({ hello: "401" });
});

// Env route (use with caution!)
fastify.get("/env/:env", async (req, reply) => {
  const env = req.params.env;
  if (!env.match(/^[A-Z0-9_]+$/))
    return reply.code(400).send({ error: "Invalid key" });
  return { [env]: process.env[env] || null };
});

// Health check
fastify.get("/health", async (req, reply) => "OK");

// 🎯 SCRAPER route (via Puppeteer)
fastify.get("/scrape", async function (req, reply) {
  const { url } = req.query;

  if (!url) {
    return reply.code(400).send({ error: "URL parameter is required" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    // Set user agent to avoid being blocked
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );

    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });

    // Navigate to the URL
    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Get basic page information
    const pageData = await page.evaluate(() => {
      return {
        title: document.title,
        url: window.location.href,
        html: document.documentElement.outerHTML,
        text: document.body.innerText,
        links: Array.from(document.querySelectorAll("a"))
          .map((a) => ({
            text: a.innerText.trim(),
            href: a.href,
          }))
          .filter((link) => link.text && link.href),
        images: Array.from(document.querySelectorAll("img"))
          .map((img) => ({
            src: img.src,
            alt: img.alt,
          }))
          .filter((img) => img.src),
        headings: Array.from(
          document.querySelectorAll("h1, h2, h3, h4, h5, h6")
        )
          .map((h) => ({
            tag: h.tagName.toLowerCase(),
            text: h.innerText.trim(),
          }))
          .filter((h) => h.text),
      };
    });

    return {
      success: true,
      data: pageData,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Scraping error:", error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Custom scrape endpoint for specific selectors
fastify.post("/scrape/custom", async function (req, reply) {
  const { url, selectors } = req.body;

  if (!url) {
    return reply.code(400).send({ error: "URL is required" });
  }

  if (!selectors || typeof selectors !== "object") {
    return reply.code(400).send({ error: "selectors object is required" });
  }

  let browser;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-gpu",
      ],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setViewport({ width: 1280, height: 720 });

    await page.goto(url, {
      waitUntil: "networkidle2",
      timeout: 30000,
    });

    // Extract data based on provided selectors
    const extractedData = await page.evaluate((selectors) => {
      const results = {};

      for (const [key, selector] of Object.entries(selectors)) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length === 0) {
            results[key] = null;
          } else if (elements.length === 1) {
            results[key] = elements[0].innerText.trim();
          } else {
            results[key] = Array.from(elements).map((el) =>
              el.innerText.trim()
            );
          }
        } catch (error) {
          results[key] = { error: error.message };
        }
      }

      return results;
    }, selectors);

    return {
      success: true,
      url,
      data: extractedData,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Custom scraping error:", error);
    return reply.code(500).send({
      success: false,
      error: error.message,
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

// Start server
const start = async () => {
  try {
    await fastify.listen({ host: "0.0.0.0", port: PORT });
    console.log(`Server listening on http://localhost:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", () => fastify.close().then(() => process.exit(0)));
process.on("SIGTERM", () => fastify.close().then(() => process.exit(0)));

start();
