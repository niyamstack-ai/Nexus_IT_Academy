/**
 * Offline QA audit of renderer + section catalog (no browser).
 * Run: node scripts/qa-admin-audit.js
 */
const fs = require("fs");
const path = require("path");
const { createBlock, CATALOG, BLOCK_TYPES } = require("../lib/section-catalog");
const { renderSite } = require("../lib/renderer");

const base = JSON.parse(fs.readFileSync(path.join(__dirname, "../data/site.default.json"), "utf8"));
const findings = [];

function add(severity, area, title, detail) {
  findings.push({ severity, area, title, detail });
}

for (const t of BLOCK_TYPES) {
  const created = createBlock(t.type);
  if (!created) {
    add("P0", "catalog", `createBlock failed for ${t.type}`, "");
    continue;
  }
  const { id, data } = created;
  data.title = `TITLE_${t.type}`;
  if (data.label) data.label = `LABEL_${t.type}`;
  if (Array.isArray(data.items) && typeof data.items[0] === "string") {
    data.items = ["ITEM_A", "ITEM_B"];
  }
  if (Object.prototype.hasOwnProperty.call(data, "image")) {
    data.image = "/uploads/test.webp";
  }

  const site = {
    ...base,
    blocks: { [id]: data },
    sectionOrder: ["hero", id, "contact"]
  };
  const html = renderSite(site, { builder: true });
  const live = renderSite(site, { builder: false });

  if (!html.includes(`data-nexus-section="${id}"`)) {
    add("P0", "renderer", `${t.type}: missing builder data-nexus-section`, id);
  }
  if (!live.includes(`nx-block--${t.type}`) && t.type !== "wave-divider") {
    // wave may still have class
  }
  if (!html.includes(`nx-block--${t.type}`)) {
    add("P0", "renderer", `${t.type}: missing block class in HTML`, "");
  }

  // Title should appear for image sections when set
  if (["single-image", "mobile-image"].includes(t.type)) {
    if (!html.includes(`TITLE_${t.type}`)) {
      add(
        "P0",
        "renderer",
        `${t.type}: title field is editable in admin but NOT rendered on the page`,
        "User types title → nothing appears in preview/live"
      );
    }
  }

  if (t.type === "custom-button" || t.type === "android-button") {
    if (!html.includes(`LABEL_${t.type}`)) {
      add("P0", "renderer", `${t.type}: button label not rendered`, "");
    }
  }

  if (t.type === "modern-bullets" && !html.includes("ITEM_A")) {
    add("P0", "renderer", "modern-bullets: items not rendered", "");
  }

  if (t.type === "line-divider" && !html.includes("nx-line-divider")) {
    add("P1", "renderer", "line-divider markup missing", "");
  }
}

// Desktop-only CSS hides on mobile — OK — but builder should still show it
{
  const { id, data } = createBlock("single-image");
  data.image = "/uploads/x.webp";
  const html = renderSite(
    { ...base, blocks: { [id]: data }, sectionOrder: [id, "contact"] },
    { builder: true }
  );
  if (!html.includes("nx-media--desktop")) {
    add("P1", "renderer", "single-image missing desktop class", "");
  }
}

// Catalog search targets from Shopify screenshots
const expected = [
  "bold-heading",
  "modern-bullets",
  "faq-accordion",
  "logo-slider",
  "image-slider",
  "line-divider",
  "wave-divider",
  "custom-button",
  "android-button",
  "institute-comparison",
  "others-vs-us",
  "single-image",
  "mobile-image",
  "text-green-circle",
  "scroll-timeline",
  "rich-text",
  "image-row"
];
for (const type of expected) {
  if (!CATALOG.some((c) => c.type === type)) {
    add("P1", "catalog", `Missing catalog entry: ${type}`, "");
  }
}

console.log("=== QA ADMIN AUDIT ===");
console.log(`Catalog entries: ${CATALOG.length}`);
console.log(`Block types: ${BLOCK_TYPES.length}`);
console.log(`Findings: ${findings.length}`);
const order = { P0: 0, P1: 1, P2: 2 };
findings
  .sort((a, b) => order[a.severity] - order[b.severity])
  .forEach((f, i) => {
    console.log(`\n${i + 1}. [${f.severity}] ${f.area} — ${f.title}`);
    if (f.detail) console.log(`   ${f.detail}`);
  });

process.exit(findings.some((f) => f.severity === "P0") ? 1 : 0);
