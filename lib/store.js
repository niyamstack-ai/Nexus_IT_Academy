const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const SITE_FILE = path.join(DATA_DIR, "site.json");
const DEFAULT_FILE = path.join(DATA_DIR, "site.default.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function mergeDefaults(defaults, site) {
  return {
    ...defaults,
    ...site,
    meta: { ...defaults.meta, ...(site.meta || {}) },
    ticker: { ...defaults.ticker, ...(site.ticker || {}) },
    navigation: {
      ...defaults.navigation,
      ...(site.navigation || {}),
      register: { ...defaults.navigation?.register, ...(site.navigation?.register || {}) },
      login: { ...defaults.navigation?.login, ...(site.navigation?.login || {}) }
    },
    hero: { ...defaults.hero, ...(site.hero || {}) },
    hiringPartners: { ...defaults.hiringPartners, ...(site.hiringPartners || {}) },
    alumni: { ...defaults.alumni, ...(site.alumni || {}) },
    journey: { ...defaults.journey, ...(site.journey || {}) },
    placementGuarantee: { ...defaults.placementGuarantee, ...(site.placementGuarantee || {}) },
    course: { ...defaults.course, ...(site.course || {}) },
    jobProfiles: { ...defaults.jobProfiles, ...(site.jobProfiles || {}) },
    feeStructure: { ...defaults.feeStructure, ...(site.feeStructure || {}) },
    eligibility: { ...defaults.eligibility, ...(site.eligibility || {}) },
    nextBatch: { ...defaults.nextBatch, ...(site.nextBatch || {}) },
    community: { ...defaults.community, ...(site.community || {}) },
    contact: { ...defaults.contact, ...(site.contact || {}) },
    footerPartners: { ...defaults.footerPartners, ...(site.footerPartners || {}) },
    theme: {
      ...defaults.theme,
      ...(site.theme || {}),
      custom: {
        ...defaults.theme?.custom,
        ...(site.theme?.custom || {}),
        colors: { ...(defaults.theme?.custom?.colors || {}), ...(site.theme?.custom?.colors || {}) }
      }
    },
    domain: { ...defaults.domain, ...(site.domain || {}) }
  };
}

function getSite() {
  ensureDataDir();
  const defaults = JSON.parse(fs.readFileSync(DEFAULT_FILE, "utf8"));
  if (!fs.existsSync(SITE_FILE)) {
    fs.writeFileSync(SITE_FILE, JSON.stringify(defaults, null, 2));
    return defaults;
  }
  const site = JSON.parse(fs.readFileSync(SITE_FILE, "utf8"));
  return mergeDefaults(defaults, site);
}

function saveSite(data) {
  ensureDataDir();
  fs.writeFileSync(SITE_FILE, JSON.stringify(data, null, 2));
  return data;
}

function resetSite() {
  const defaults = JSON.parse(fs.readFileSync(DEFAULT_FILE, "utf8"));
  defaults.updatedAt = new Date().toISOString();
  return saveSite(defaults);
}

module.exports = { getSite, saveSite, resetSite, SITE_FILE };
