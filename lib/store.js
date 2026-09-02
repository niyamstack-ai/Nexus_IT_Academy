const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const SITE_FILE = path.join(DATA_DIR, "site.json");
const DEFAULT_FILE = path.join(DATA_DIR, "site.default.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getSite() {
  ensureDataDir();
  if (!fs.existsSync(SITE_FILE)) {
    const defaults = JSON.parse(fs.readFileSync(DEFAULT_FILE, "utf8"));
    fs.writeFileSync(SITE_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  return JSON.parse(fs.readFileSync(SITE_FILE, "utf8"));
}

function saveSite(data) {
  ensureDataDir();
  fs.writeFileSync(SITE_FILE, JSON.stringify(data, null, 2));
  return data;
}

function resetSite() {
  const defaults = JSON.parse(fs.readFileSync(DEFAULT_FILE, "utf8"));
  return saveSite(defaults);
}

module.exports = { getSite, saveSite, resetSite, SITE_FILE };
