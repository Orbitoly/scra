const fastify = require("fastify")({
  logger: { level: "error" },
  trustProxy: true,
});
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

// 🎯 SCRAPER route (via Playwright)
fastify.get("/scrape", async (req, reply) => {
  const { chromium } = require("playwright");

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto("https://shoham.biu.ac.il/kabala/", {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    const pageTitle = await page.title();
    const html = await page.content();

    await browser.close();

    return {
      title: pageTitle,
      success: true,
      htmlSnippet: html.slice(0, 1000), // limit output
    };
  } catch (err) {
    return reply.code(500).send({ success: false, error: err.message });
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
