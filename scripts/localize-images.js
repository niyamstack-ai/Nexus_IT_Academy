/**
 * Download all external images, compress them, save locally under /uploads,
 * and rewrite site.default.json + site.json to use local paths.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");
const https = require("https");
const http = require("http");

const ROOT = path.join(__dirname, "..");
const UPLOAD_DIR = path.join(ROOT, "public", "uploads");
const DEFAULT_FILE = path.join(ROOT, "data", "site.default.json");
const SITE_FILE = path.join(ROOT, "data", "site.json");

const PRESETS = {
  logo: { width: 500, height: 140, quality: 82 },
  footerLogo: { width: 520, height: 160, quality: 82 },
  partnerLogo: { width: 400, height: 120, quality: 80 },
  alumni: { width: 1200, height: 675, quality: 78 },
  journeyIcon: { width: 128, height: 128, quality: 85 }
};

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function download(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { headers: { "User-Agent": "NexusLocalizer/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return download(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error(`Timeout: ${url}`));
    });
  });
}

function slugFromUrl(url) {
  try {
    const u = new URL(url);
    const base = path.basename(u.pathname).replace(/\.[^.]+$/, "") || "image";
    return base.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 40);
  } catch {
    return "image";
  }
}

async function localizeOne(url, presetId) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("/uploads/")) return url;
  if (!/^https?:\/\//i.test(url)) return url;

  const preset = PRESETS[presetId] || PRESETS.partnerLogo;
  const buffer = await download(url);
  const processed = await sharp(buffer)
    .rotate()
    .resize(preset.width, preset.height, { fit: "inside", withoutEnlargement: true, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: preset.quality, effort: 4 })
    .toBuffer();

  const name = `${presetId}-${slugFromUrl(url)}-${crypto.randomBytes(3).toString("hex")}.webp`;
  fs.writeFileSync(path.join(UPLOAD_DIR, name), processed);
  console.log(`  OK ${presetId}: ${name} (${Math.round(processed.length / 1024)} KB)`);
  return `/uploads/${name}`;
}

async function localizeSite(site) {
  const out = JSON.parse(JSON.stringify(site));
  out.logo = await localizeOne(out.logo, "logo");
  out.footerLogo = await localizeOne(out.footerLogo, "footerLogo");

  for (const logo of out.hiringPartners?.logos || []) {
    logo.url = await localizeOne(logo.url, "partnerLogo");
  }
  for (const item of out.alumni?.items || []) {
    item.image = await localizeOne(item.image, "alumni");
  }
  for (const step of out.journey?.steps || []) {
    step.icon = await localizeOne(step.icon, "journeyIcon");
  }
  for (const logo of out.footerPartners?.logos || []) {
    logo.url = await localizeOne(logo.url, "partnerLogo");
  }
  return out;
}

async function main() {
  ensureDir(UPLOAD_DIR);
  console.log("Localizing default site images...");
  const defaults = JSON.parse(fs.readFileSync(DEFAULT_FILE, "utf8"));
  const localizedDefaults = await localizeSite(defaults);
  localizedDefaults.updatedAt = new Date().toISOString();
  fs.writeFileSync(DEFAULT_FILE, JSON.stringify(localizedDefaults, null, 2));
  console.log("Updated data/site.default.json");

  if (fs.existsSync(SITE_FILE)) {
    console.log("Localizing live site.json...");
    const site = JSON.parse(fs.readFileSync(SITE_FILE, "utf8"));
    const localizedSite = await localizeSite(site);
    localizedSite.updatedAt = new Date().toISOString();
    fs.writeFileSync(SITE_FILE, JSON.stringify(localizedSite, null, 2));
    console.log("Updated data/site.json");
  }

  console.log("Done. All images are now under public/uploads/");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
