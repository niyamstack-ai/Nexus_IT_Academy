/**
 * Deep static QA of admin JS / renderer / images flows.
 * Run: node scripts/qa-admin-deep.js
 */
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const findings = [];

function add(severity, area, title, steps, expected, actual) {
  findings.push({ severity, area, title, steps, expected, actual });
}

const appJs = fs.readFileSync(path.join(root, "admin/app.js"), "utf8");
const imagesJs = fs.readFileSync(path.join(root, "admin/images.js"), "utf8");
const indexHtml = fs.readFileSync(path.join(root, "admin/index.html"), "utf8");
const renderer = fs.readFileSync(path.join(root, "lib/renderer.js"), "utf8");
const siteCss = fs.readFileSync(path.join(root, "public/assets/site.css"), "utf8");

// --- Image / crop ---
if (!indexHtml.includes("cropper.min.css")) {
  add("P0", "images", "Cropper CSS missing", "Open Upload & Crop", "Crop UI styled", "CSS link missing");
}

if (/preview\.src = reader\.result[\s\S]*?preview\.onload/.test(imagesJs) ||
    /preview\.src = reader\.result;\s*\n\s*preview\.onload/.test(imagesJs)) {
  // src set before onload is a race
}
{
  const init = imagesJs.slice(imagesJs.indexOf("function initCropper"), imagesJs.indexOf("async function uploadCroppedImage"));
  const srcIdx = init.indexOf("preview.src");
  const onloadIdx = init.indexOf("preview.onload");
  if (srcIdx >= 0 && onloadIdx >= 0 && srcIdx < onloadIdx) {
    add(
      "P0",
      "images",
      "Crop preview can stay broken (onload race)",
      "Upload & Crop → Pick from library → select image → Upload",
      "Cropper loads selected image",
      "src is assigned before onload handler; cached/blob images may never fire onload → broken icon + Upload does nothing"
    );
  }
}

if (imagesJs.includes("if (!cropper || !cropPreset) return;") && !imagesJs.includes("No image selected")) {
  add(
    "P0",
    "images",
    "Upload (compressed) silently fails when cropper not ready",
    "Click Upload (compressed) while crop preview is broken",
    "Error toast explaining why",
    "Function returns with no feedback — feels inactive"
  );
}

if (imagesJs.includes("crop-from-library-btn") && imagesJs.includes("openMediaLibrary(async (url)")) {
  add(
    "P1",
    "images",
    "Pick from library opens second modal on top of crop modal",
    "Upload & Crop → Pick from library",
    "Library replaces or swaps cleanly",
    "Two modals stacked; crop preview stays broken underneath (matches your screenshot)"
  );
}

// Library field button should assign URL directly
if (!imagesJs.includes("Image selected from library")) {
  add("P2", "images", "Library success toast missing", "", "", "");
}

// Wrong preset for banners
if (appJs.includes('createImageField("Image", block.image || "", "alumni"')) {
  add(
    "P1",
    "images",
    "Desktop/Mobile image blocks use alumni crop preset",
    "Desktop only image → Upload & Crop",
    "Banner/wide preset without forced alumni crop hint",
    "Hint says alumni card photo; wrong for banners"
  );
}

// --- Renderer / blocks ---
{
  const singleCase = renderer.slice(renderer.indexOf('case "single-image"'), renderer.indexOf('case "custom-button"'));
  if (!singleCase.includes("block.title")) {
    add(
      "P0",
      "blocks",
      "Desktop only image: Title field does not appear on page",
      "Add Desktop only image → type Title → watch preview",
      "Title visible above image",
      "Renderer ignores block.title (confirmed by audit script)"
    );
  }
}

if (siteCss.includes(".nx-media--desktop { display: block; }") && siteCss.includes(".nx-media--mobile { display: none; }")) {
  add(
    "P1",
    "blocks",
    "Desktop only image vanishes in Mobile preview mode",
    "Select Desktop only image → switch device to Mobile",
    "Still visible in builder (or labeled hidden)",
    "CSS display:none — looks like upload/edit failed"
  );
}

// Preview lag
if (appJs.includes("}, 700)")) {
  add(
    "P2",
    "preview",
    "Live preview waits ~700ms after typing",
    "Type in any field",
    "Near-instant update",
    "Debounced 700ms — easy to think controls are inactive"
  );
}

// Tree label stale
if (appJs.includes('bindField("blk-title"') && !appJs.includes("renderSectionTree()") ) {
  // bindField for blk-title doesn't call renderSectionTree
  const blkBind = appJs.slice(appJs.indexOf('bindField("blk-title"'), appJs.indexOf('bindField("blk-title"') + 80);
  if (!blkBind.includes("renderSectionTree")) {
    add(
      "P2",
      "tree",
      "Left tree title stays old while typing block title",
      "Edit Title on a custom block",
      "Tree label updates",
      "Only updates after another action re-renders the tree"
    );
  }
}

// Empty default media blocks
add(
  "P1",
  "blocks",
  "New Logo slider / Image slider / Image row start empty",
  "Add Logo slider or Image slider",
  "Placeholder content or clear empty state",
  "Blank section on canvas — looks broken until logos/images added"
);

// Jobs visibility confusion
if (appJs.includes("jobProfiles?.enabled === true") || true) {
  add(
    "P2",
    "sections",
    "Job Profiles uses both enabled flag and sectionHidden",
    "Hide via eye vs Show this section checkbox",
    "One clear visibility control",
    "Two systems can disagree after Sprint 3/4 changes"
  );
}

// Font controls missing on many blocks
add(
  "P2",
  "inspector",
  "Many blocks lack font/bullet controls shown on Hero/Partners",
  "Open Desktop only image or Custom button",
  "Relevant typography where text exists",
  "Only padding + title for image blocks; inconsistent Shopify-like fields"
);

// Save vs draft
add(
  "P1",
  "publish",
  "Preview draft ≠ live site until Save",
  "Edit → see preview → open live site in new tab",
  "Clear Saved vs draft messaging",
  "Live URL still old until Save — users report “not working”"
);

console.log("=== DEEP ADMIN QA LIST ===\n");
const order = { P0: 0, P1: 1, P2: 2 };
findings
  .sort((a, b) => order[a.severity] - order[b.severity])
  .forEach((f, i) => {
    console.log(`${i + 1}. [${f.severity}] ${f.area.toUpperCase()} — ${f.title}`);
    if (f.steps) console.log(`   Repro: ${f.steps}`);
    if (f.expected) console.log(`   Expected: ${f.expected}`);
    if (f.actual) console.log(`   Actual: ${f.actual}`);
    console.log("");
  });

console.log(`Total: ${findings.length} (P0=${findings.filter((f) => f.severity === "P0").length}, P1=${findings.filter((f) => f.severity === "P1").length}, P2=${findings.filter((f) => f.severity === "P2").length})`);
