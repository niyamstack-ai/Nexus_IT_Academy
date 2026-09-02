require("dotenv").config();

function envValue(key, fallback) {
  return String(process.env[key] || fallback).trim().replace(/^\uFEFF/, "");
}

const express = require("express");
const session = require("express-session");
const path = require("path");
const { getSite, saveSite, resetSite } = require("./lib/store");
const { renderSite } = require("./lib/renderer");
const { THEME_PRESETS, FONT_OPTIONS } = require("./lib/themes");
const { buildDnsRecords, buildNginxConfig, buildSetupSteps, isValidIpv4 } = require("./lib/domain");
const { IMAGE_PRESETS, ensureUploadDir, processAndSaveImage } = require("./lib/images");

const app = express();
const PORT = Number(envValue("PORT", "3000")) || 3000;
const ADMIN_USERNAME = envValue("ADMIN_USERNAME", "NexusITAcademy");
const ADMIN_PASSWORD = envValue("ADMIN_PASSWORD", "nexusadmin2026");
const SESSION_SECRET = envValue("SESSION_SECRET", "nexus-it-academy-secret-change-in-production");
const PUBLIC_URL = envValue("PUBLIC_URL", "https://nexusitacad.niyamstack.com");
const isProduction = envValue("NODE_ENV", "development") === "production";
const isLocalDev = envValue("LOCAL_DEV", "false") === "true" || PUBLIC_URL.includes("localhost");

app.set("trust proxy", 1);

app.use(express.json({ limit: "12mb" }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: true,
      secure: isProduction && !isLocalDev,
      sameSite: "lax"
    }
  })
);

app.use("/assets", express.static(path.join(__dirname, "public", "assets")));
app.use("/uploads", express.static(path.join(__dirname, "public", "uploads")));
app.use("/admin", express.static(path.join(__dirname, "admin")));

ensureUploadDir();

function requireAuth(req, res, next) {
  if (req.session?.authenticated) return next();
  res.status(401).json({ error: "Unauthorized" });
}

app.get("/admin", (req, res) => res.redirect("/admin/"));

app.get("/", (req, res) => {
  res.type("html").send(renderSite(getSite()));
});

app.get("/preview", (req, res) => {
  res.type("html").send(renderSite(getSite()));
});

app.post("/api/admin/login", (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "");
  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "Invalid username or password" });
});

app.post("/api/admin/logout", (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

app.get("/api/admin/me", (req, res) => {
  res.json({ authenticated: !!req.session?.authenticated });
});

app.get("/api/admin/site", requireAuth, (req, res) => {
  res.json(getSite());
});

app.put("/api/admin/site", requireAuth, (req, res) => {
  const data = { ...req.body, updatedAt: new Date().toISOString() };
  saveSite(data);
  res.json({ ok: true, site: data });
});

app.post("/api/admin/reset", requireAuth, (req, res) => {
  const site = resetSite();
  res.json({ ok: true, site });
});

app.get("/api/admin/themes", requireAuth, (req, res) => {
  res.json({ presets: THEME_PRESETS, fonts: FONT_OPTIONS });
});

app.get("/api/admin/domain/setup", requireAuth, (req, res) => {
  const site = getSite();
  const dns = buildDnsRecords(site.domain);
  res.json({
    dns,
    steps: buildSetupSteps(site.domain),
    nginxConfig: buildNginxConfig(site.domain),
    liveUrl: dns.ready ? `https://${dns.domain}` : null,
    stagingUrl: site.domain?.stagingUrl || PUBLIC_URL,
    adminUrl: `${(site.domain?.stagingUrl || PUBLIC_URL).replace(/\/$/, "")}/admin`
  });
});

app.get("/api/admin/image-presets", requireAuth, (req, res) => {
  res.json({ presets: IMAGE_PRESETS });
});

app.post("/api/admin/upload", requireAuth, async (req, res) => {
  try {
    const { image, preset } = req.body || {};
    if (!image) return res.status(400).json({ error: "No image provided" });
    const result = await processAndSaveImage(image, preset || "partnerLogo");
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || "Upload failed" });
  }
});

app.post("/api/admin/domain/validate", requireAuth, (req, res) => {
  const { serverIp, customDomain } = req.body || {};
  const errors = [];
  if (!customDomain) errors.push("Custom domain is required");
  if (!serverIp) errors.push("VPS IP address is required");
  else if (!isValidIpv4(serverIp)) errors.push("VPS IP must be a valid IPv4 address (e.g. 203.0.113.10)");
  res.json({ valid: errors.length === 0, errors });
});

app.listen(PORT, () => {
  console.log(`Nexus IT Academy CMS running at http://localhost:${PORT}`);
  console.log(`Public site: ${PUBLIC_URL}`);
  console.log(`Admin panel: ${PUBLIC_URL.replace(/\/$/, "")}/admin/`);
});
