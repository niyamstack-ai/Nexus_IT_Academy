const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "..", "data");
const SITE_FILE = path.join(DATA_DIR, "site.json");
const DEFAULT_FILE = path.join(DATA_DIR, "site.default.json");

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DEFAULT_SECTION_ORDER = [
  "hero",
  "partners",
  "alumni",
  "journey",
  "guarantee",
  "course",
  "jobs",
  "fees",
  "eligibility",
  "batch",
  "contact"
];

function isKnownSectionId(id) {
  return DEFAULT_SECTION_ORDER.includes(id) || (typeof id === "string" && id.startsWith("blk_"));
}

function mergeSectionOrder(siteOrder, fallbackOrder) {
  const fallback = Array.isArray(fallbackOrder) && fallbackOrder.length
    ? fallbackOrder.filter((id) => isKnownSectionId(id))
    : DEFAULT_SECTION_ORDER.slice();
  if (!Array.isArray(siteOrder) || !siteOrder.length) return fallback.slice();
  // Keep the admin's explicit order (built-ins + custom blocks); do not re-add removed sections.
  const cleaned = siteOrder.filter((id) => isKnownSectionId(id));
  return cleaned.length ? cleaned : fallback.slice();
}

function mergeDefaults(defaults, site) {
  return {
    ...defaults,
    ...site,
    sectionOrder: mergeSectionOrder(site.sectionOrder || defaults.sectionOrder, defaults.sectionOrder),
    sectionHidden: { ...(defaults.sectionHidden || {}), ...(site.sectionHidden || {}) },
    blocks: { ...(defaults.blocks || {}), ...(site.blocks || {}) },
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

const VERSIONS_DIR = path.join(DATA_DIR, "versions");
const MAX_VERSIONS = 20;

function ensureVersionsDir() {
  ensureDataDir();
  if (!fs.existsSync(VERSIONS_DIR)) fs.mkdirSync(VERSIONS_DIR, { recursive: true });
}

function listVersions() {
  ensureVersionsDir();
  return fs
    .readdirSync(VERSIONS_DIR)
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .map((f) => {
      try {
        const raw = JSON.parse(fs.readFileSync(path.join(VERSIONS_DIR, f), "utf8"));
        return {
          id: f.replace(/\.json$/, ""),
          savedAt: raw.updatedAt || raw.savedAt || null,
          siteName: raw.siteName || "Nexus IT Academy"
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => String(b.savedAt || "").localeCompare(String(a.savedAt || "")));
}

function getVersion(id) {
  ensureVersionsDir();
  const safe = String(id || "").replace(/[^a-zA-Z0-9_-]/g, "");
  const file = path.join(VERSIONS_DIR, `${safe}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function pruneVersions() {
  const versions = listVersions();
  if (versions.length <= MAX_VERSIONS) return;
  versions.slice(MAX_VERSIONS).forEach((v) => {
    const file = path.join(VERSIONS_DIR, `${v.id}.json`);
    if (fs.existsSync(file)) fs.unlinkSync(file);
  });
}

function pushVersion(data) {
  ensureVersionsDir();
  const stamp = (data.updatedAt || new Date().toISOString()).replace(/[:.]/g, "-");
  const id = `v-${stamp}`;
  const payload = { ...data, savedAt: data.updatedAt || new Date().toISOString() };
  fs.writeFileSync(path.join(VERSIONS_DIR, `${id}.json`), JSON.stringify(payload, null, 2));
  pruneVersions();
  return { id, savedAt: payload.savedAt, siteName: payload.siteName };
}

function restoreVersion(id) {
  const version = getVersion(id);
  if (!version) return null;
  const restored = {
    ...version,
    updatedAt: new Date().toISOString()
  };
  delete restored.savedAt;
  return saveSite(restored);
}

function saveSite(data, options = {}) {
  ensureDataDir();
  if (options.version !== false) {
    try {
      if (fs.existsSync(SITE_FILE)) {
        const previous = JSON.parse(fs.readFileSync(SITE_FILE, "utf8"));
        pushVersion(previous);
      }
    } catch {
      /* ignore version archive errors */
    }
  }
  fs.writeFileSync(SITE_FILE, JSON.stringify(data, null, 2));
  return data;
}

function resetSite() {
  const defaults = JSON.parse(fs.readFileSync(DEFAULT_FILE, "utf8"));
  defaults.updatedAt = new Date().toISOString();
  return saveSite(defaults);
}

module.exports = {
  getSite,
  saveSite,
  resetSite,
  listVersions,
  getVersion,
  restoreVersion,
  pushVersion,
  SITE_FILE,
  MAX_VERSIONS
};
