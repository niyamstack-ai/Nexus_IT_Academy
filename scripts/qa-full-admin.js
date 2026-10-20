/**
 * Full admin regression matrix (API + renderer), independent of reported bugs.
 * Run with server up: node scripts/qa-full-admin.js
 */
const fs = require("fs");
const path = require("path");
const { createBlock, CATALOG, BLOCK_TYPES } = require("../lib/section-catalog");
const { renderSite } = require("../lib/renderer");

const BASE = process.env.QA_BASE || "http://127.0.0.1:3000";
const USER = process.env.ADMIN_USERNAME || "NexusITAcademy";
const PASS = process.env.ADMIN_PASSWORD || "GaurHari@109";

const results = [];
let cookie = "";

function record(area, caseName, pass, detail = "") {
  results.push({ area, caseName, pass: !!pass, detail: String(detail || "") });
}

async function req(pathname, options = {}) {
  const res = await fetch(`${BASE}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Cookie: cookie,
      ...(options.headers || {})
    }
  });
  const set = res.headers.getSetCookie?.() || [];
  for (const c of set) {
    const part = c.split(";")[0];
    if (part) cookie = cookie ? `${cookie}; ${part}` : part;
  }
  // Node older: raw header
  const raw = res.headers.get("set-cookie");
  if (raw && !set.length) {
    const part = raw.split(";")[0];
    cookie = cookie ? `${cookie}; ${part}` : part;
  }
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {
    /* html */
  }
  return { res, text, json };
}

function assertHtml(area, name, html, needles, anti = []) {
  const missing = needles.filter((n) => !html.includes(n));
  const bad = anti.filter((n) => html.includes(n));
  if (missing.length || bad.length) {
    record(area, name, false, `missing=${missing.join("|")} bad=${bad.join("|")}`);
  } else {
    record(area, name, true);
  }
}

async function main() {
  // Health
  try {
    const home = await req("/");
    record("server", "GET / returns HTML", home.res.ok && home.text.includes("<!DOCTYPE html"));
  } catch (e) {
    record("server", "Server reachable", false, e.message);
    printAndExit();
    return;
  }

  // Auth
  const badLogin = await req("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username: "x", password: "y" })
  });
  record("auth", "Bad login rejected", badLogin.res.status === 401);

  const login = await req("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username: USER, password: PASS })
  });
  record("auth", "Good login", login.res.ok && login.json?.ok);

  const me = await req("/api/admin/me");
  record("auth", "Session /me", me.json?.authenticated === true);

  const adminPage = await req("/admin/");
  record("admin-shell", "Admin HTML loads", adminPage.res.ok && adminPage.text.includes("section-tree"));
  record("admin-shell", "Has Add section button", adminPage.text.includes("add-section-btn"));
  record("admin-shell", "Has undo/redo/discard", adminPage.text.includes("undo-btn") && adminPage.text.includes("discard-btn"));
  record("admin-shell", "Has cropper CSS", adminPage.text.includes("cropper.min.css"));
  record("admin-shell", "Has cropper JS", adminPage.text.includes("cropper.min.js"));
  record("admin-shell", "Has catalog modal", adminPage.text.includes("section-catalog-modal"));
  record("admin-shell", "Has media library modal", adminPage.text.includes("media-library-modal"));
  record("admin-shell", "Has version history modal", adminPage.text.includes("version-history-modal"));

  // APIs
  const siteRes = await req("/api/admin/site");
  record("api", "GET site", siteRes.res.ok && siteRes.json?.siteName);
  const site = siteRes.json;

  const themes = await req("/api/admin/themes");
  record("api", "GET themes", themes.res.ok && Array.isArray(themes.json?.presets));
  record("api", "themes include allFonts", Array.isArray(themes.json?.allFonts) && themes.json.allFonts.length > 20);
  record("api", "themes include bulletStyles", Array.isArray(themes.json?.bulletStyles) && themes.json.bulletStyles.length >= 5);

  const catalog = await req("/api/admin/section-catalog");
  record("api", "GET section-catalog", catalog.res.ok && Array.isArray(catalog.json?.catalog));
  record("api", "catalog has builtins + blocks", (catalog.json?.catalog || []).some((c) => c.kind === "builtin") && (catalog.json?.catalog || []).some((c) => c.kind === "block"));

  const media = await req("/api/admin/media");
  record("api", "GET media library", media.res.ok && Array.isArray(media.json?.files));

  const versions = await req("/api/admin/versions");
  record("api", "GET versions", versions.res.ok && Array.isArray(versions.json?.versions));

  const presets = await req("/api/admin/image-presets");
  record("api", "GET image-presets", presets.res.ok && presets.json?.presets);

  // Preview draft roundtrip
  const draftSite = JSON.parse(JSON.stringify(site));
  draftSite.hero = { ...(draftSite.hero || {}), headline: "QA_HEADLINE_UNIQUE_998877" };
  const draftPut = await req("/api/admin/preview-draft", {
    method: "PUT",
    body: JSON.stringify(draftSite)
  });
  record("preview", "PUT preview-draft", draftPut.res.ok);

  const preview = await req("/preview");
  record("preview", "GET /preview reflects draft headline", preview.text.includes("QA_HEADLINE_UNIQUE_998877"));
  record("preview", "Preview has builder attrs", preview.text.includes("data-nexus-section"));
  record("preview", "Preview loads builder-bridge", preview.text.includes("builder-bridge.js"));

  // Live home should NOT have draft headline until save
  const live = await req("/");
  record("preview", "Live / does not show unsaved draft", !live.text.includes("QA_HEADLINE_UNIQUE_998877"));

  // Builtin section render coverage from current site
  const order = Array.isArray(site.sectionOrder) ? site.sectionOrder : [];
  const builtins = ["hero", "partners", "alumni", "journey", "guarantee", "course", "jobs", "fees", "eligibility", "batch", "contact"];
  for (const id of builtins) {
    const html = renderSite(site, { builder: true });
    if (order.includes(id) || id === "contact") {
      // contact always in order typically
      const visibleJobs = site.jobProfiles?.enabled === true && site.sectionHidden?.jobs !== true;
      if (id === "jobs" && !visibleJobs && !site.sectionOrder?.includes("jobs")) {
        record("builtin-render", `jobs skipped when disabled`, true);
        continue;
      }
    }
    const built = renderSite(
      {
        ...site,
        sectionHidden: { ...(site.sectionHidden || {}), jobs: false },
        jobProfiles: { ...(site.jobProfiles || {}), enabled: true },
        course: { ...(site.course || {}), enabled: true },
        eligibility: { ...(site.eligibility || {}), enabled: true },
        nextBatch: { ...(site.nextBatch || {}), enabled: true },
        sectionOrder: builtins
      },
      { builder: true }
    );
    record("builtin-render", `${id} has data-nexus-section`, built.includes(`data-nexus-section="${id}"`) || (id === "fees" && built.includes('data-nexus-section="fees"')));
  }

  // Every catalog block type: create + render + key content
  for (const t of BLOCK_TYPES) {
    const created = await req("/api/admin/section-catalog/create", {
      method: "POST",
      body: JSON.stringify({ type: t.type })
    });
    record("blocks-api", `create ${t.type}`, created.res.ok && created.json?.id);

    if (!created.json?.id) continue;
    const block = created.json.data;
    block.title = `T_${t.type}`;
    if (block.label) block.label = `L_${t.type}`;
    if (Array.isArray(block.items) && typeof block.items[0] === "string") block.items = ["A1", "A2"];
    if (Object.prototype.hasOwnProperty.call(block, "image")) block.image = "/uploads/qa.webp";

    const html = renderSite(
      {
        ...site,
        blocks: { [created.json.id]: block },
        sectionOrder: ["hero", created.json.id, "contact"]
      },
      { builder: true }
    );

    record("blocks-render", `${t.type} marked for builder`, html.includes(`data-nexus-section="${created.json.id}"`));

    if (["single-image", "mobile-image"].includes(t.type)) {
      record(
        "blocks-render",
        `${t.type} shows title in HTML`,
        html.includes(`T_${t.type}`),
        html.includes(`T_${t.type}`) ? "" : "title field ignored by renderer"
      );
    }
    if (["custom-button", "android-button"].includes(t.type)) {
      record("blocks-render", `${t.type} shows label`, html.includes(`L_${t.type}`));
    }
    if (t.type === "modern-bullets") {
      record("blocks-render", "modern-bullets shows items", html.includes("A1"));
    }
    if (t.type === "faq-accordion") {
      record("blocks-render", "faq renders details", html.includes("<details"));
    }
    if (t.type === "bold-heading") {
      record("blocks-render", "bold-heading shows title", html.includes(`T_${t.type}`));
    }
  }

  // Hide section in draft
  const hiddenDraft = JSON.parse(JSON.stringify(site));
  hiddenDraft.sectionHidden = { ...(hiddenDraft.sectionHidden || {}), hero: true };
  await req("/api/admin/preview-draft", { method: "PUT", body: JSON.stringify(hiddenDraft) });
  const prevHidden = await req("/preview");
  record(
    "visibility",
    "Hidden hero still in builder preview with data-nexus-hidden",
    prevHidden.text.includes('data-nexus-section="hero"') && prevHidden.text.includes("data-nexus-hidden")
  );

  // Domain setup endpoint
  const domain = await req("/api/admin/domain/setup");
  record("api", "domain setup", domain.res.ok);

  // Unauthorized without cookie
  const bare = await fetch(`${BASE}/api/admin/site`);
  record("auth", "Site API requires auth", bare.status === 401);

  printAndExit();
}

function printAndExit() {
  const fail = results.filter((r) => !r.pass);
  const pass = results.filter((r) => r.pass);
  const byArea = {};
  for (const r of results) {
    byArea[r.area] = byArea[r.area] || { pass: 0, fail: 0 };
    byArea[r.area][r.pass ? "pass" : "fail"] += 1;
  }

  console.log("\n========== FULL ADMIN QA MATRIX ==========\n");
  Object.entries(byArea).forEach(([area, s]) => {
    console.log(`${area}: ${s.pass} pass / ${s.fail} fail`);
  });
  console.log(`\nTOTAL: ${pass.length} pass / ${fail.length} fail / ${results.length} cases\n`);

  if (fail.length) {
    console.log("--- FAILURES ---");
    fail.forEach((f, i) => {
      console.log(`${i + 1}. [${f.area}] ${f.caseName}${f.detail ? " — " + f.detail : ""}`);
    });
  }

  console.log("\n--- ALL CASES ---");
  results.forEach((r) => {
    console.log(`${r.pass ? "PASS" : "FAIL"} | ${r.area} | ${r.caseName}${r.detail ? " | " + r.detail : ""}`);
  });

  const outPath = path.join(__dirname, "../data/qa-full-admin-report.json");
  fs.writeFileSync(outPath, JSON.stringify({ at: new Date().toISOString(), base: BASE, results }, null, 2));
  console.log(`\nWrote ${outPath}`);
  process.exit(fail.length ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
