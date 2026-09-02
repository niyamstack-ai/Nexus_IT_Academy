const express = require("express");
const session = require("express-session");
const path = require("path");
const { getSite, saveSite, resetSite } = require("./lib/store");
const { renderSite } = require("./lib/renderer");
const { THEME_PRESETS, FONT_OPTIONS } = require("./lib/themes");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "nexusadmin2026";
const SESSION_SECRET = process.env.SESSION_SECRET || "nexus-it-academy-secret-change-in-production";

app.use(express.json({ limit: "2mb" }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000, httpOnly: true }
  })
);

app.use("/assets", express.static(path.join(__dirname, "public", "assets")));
app.use("/admin", express.static(path.join(__dirname, "admin")));

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
  const { password } = req.body || {};
  if (password === ADMIN_PASSWORD) {
    req.session.authenticated = true;
    return res.json({ ok: true });
  }
  res.status(401).json({ error: "Invalid password" });
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

app.listen(PORT, () => {
  console.log(`Nexus IT Academy CMS running at http://localhost:${PORT}`);
  console.log(`Admin panel: http://localhost:${PORT}/admin/`);
});
