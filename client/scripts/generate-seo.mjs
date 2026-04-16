import { writeFile } from "node:fs/promises";

const siteUrl = (process.env.VITE_SITE_URL || "https://example.com").replace(/\/$/, "");
const routes = [
  "/",
  "/partners",
  "/synthesis",
  "/products",
  "/events",
  "/references",
  "/notices",
  "/inquiry",
  "/customer/order-guide",
  "/customer/about",
  "/customer/directions",
];

const robots = [
  "User-agent: *",
  "Allow: /",
  `Sitemap: ${siteUrl}/sitemap.xml`,
  "",
].join("\n");

const sitemap = [
  '<?xml version="1.0" encoding="UTF-8"?>',
  '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  ...routes.map((route) => `  <url><loc>${siteUrl}${route}</loc></url>`),
  "</urlset>",
  "",
].join("\n");

await writeFile("public/robots.txt", robots, "utf8");
await writeFile("public/sitemap.xml", sitemap, "utf8");

console.log(`[seo] generated with VITE_SITE_URL=${siteUrl}`);
