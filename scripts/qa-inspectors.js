const fs = require("fs");
const path = require("path");
const { renderSite } = require("../lib/renderer");

const site = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/site.json"), "utf8"));
const app = fs.readFileSync(path.join(__dirname, "../admin/app.js"), "utf8");
const cases = [];

function check(name, ok, detail = "") {
  cases.push({ name, ok: !!ok, detail });
}

const clones = JSON.parse(JSON.stringify(site));
clones.ticker = { ...clones.ticker, items: ["QA_TICKER_XYZ"], enabled: true };
clones.hero = {
  ...clones.hero,
  headline: "QA_HERO_XYZ",
  features: ["QA_FEAT_1"],
  headlineColor: "#ff00aa",
  bulletStyle: "star"
};
clones.hiringPartners = {
  ...clones.hiringPartners,
  title: "QA_PARTNERS_XYZ",
  headingColor: "#112233",
  headingSize: 41
};
clones.alumni = { ...clones.alumni, title: "QA_ALUMNI_XYZ", headingSize: 39 };
clones.journey = { ...clones.journey, title: "QA_JOURNEY_XYZ" };
clones.placementGuarantee = { ...clones.placementGuarantee, title: "QA_GUARANTEE_XYZ" };
clones.course = { ...clones.course, enabled: true, title: "QA_COURSE_XYZ" };
clones.jobProfiles = { ...clones.jobProfiles, enabled: true, title: "QA_JOBS_XYZ", items: ["QA_JOB_1"] };
clones.feeStructure = { ...clones.feeStructure, title: "QA_FEES_XYZ" };
clones.eligibility = { ...clones.eligibility, enabled: true, title: "QA_ELIG_XYZ", items: ["QA_E1"] };
clones.nextBatch = { ...clones.nextBatch, enabled: true, title: "QA_BATCH_XYZ" };
clones.contact = { ...clones.contact, title: "QA_CONTACT_XYZ" };
clones.sectionHidden = {};
clones.sectionOrder = [
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

const html = renderSite(clones, { builder: true });
const needles = [
  ["ticker", "QA_TICKER_XYZ"],
  ["hero headline", "QA_HERO_XYZ"],
  ["hero feature", "QA_FEAT_1"],
  ["partners title", "QA_PARTNERS_XYZ"],
  ["partners color", "#112233"],
  ["partners size", "41px"],
  ["alumni", "QA_ALUMNI_XYZ"],
  ["journey", "QA_JOURNEY_XYZ"],
  ["guarantee", "QA_GUARANTEE_XYZ"],
  ["course", "QA_COURSE_XYZ"],
  ["jobs", "QA_JOBS_XYZ"],
  ["fees", "QA_FEES_XYZ"],
  ["eligibility", "QA_ELIG_XYZ"],
  ["batch", "QA_BATCH_XYZ"],
  ["contact", "QA_CONTACT_XYZ"],
  ["hero bullet class", "hero-feature--star"]
];

for (const [n, v] of needles) {
  check(`builtin field renders: ${n}`, html.includes(v), v);
}

const sections = [
  "ticker",
  "navigation",
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
  "contact",
  "themes",
  "domain",
  "settings"
];

for (const s of sections) {
  const re = new RegExp(`activeSection === "${s}"`);
  check(`inspector branch exists: ${s}`, re.test(app));
}

const fail = cases.filter((c) => !c.ok);
const pass = cases.filter((c) => c.ok);
console.log(`FIELD/INSPECTOR MATRIX ${pass.length} pass / ${fail.length} fail / ${cases.length}`);
fail.forEach((f, i) => console.log(`FAIL ${i + 1} ${f.name} ${f.detail || ""}`));
pass.forEach((p) => console.log(`PASS ${p.name}`));
process.exit(fail.length ? 1 : 0);
