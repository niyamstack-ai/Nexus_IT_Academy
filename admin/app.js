const DEFAULT_SECTION_ORDER = [
  "hero", "partners", "alumni", "journey", "guarantee", "course", "jobs", "fees", "eligibility", "batch", "contact"
];

const SECTION_LABELS = {
  none: "Settings",
  ticker: "Horizontal Ticker",
  navigation: "Header",
  header: "Header",
  hero: "Hero",
  partners: "Hiring Partners",
  alumni: "Alumni Spotlight",
  journey: "Journey Steps",
  guarantee: "Placement Guarantee",
  course: "Course / Syllabus",
  jobs: "Job Profiles",
  fees: "Fee Structure",
  eligibility: "Eligibility",
  batch: "Next Batch",
  contact: "Footer / Contact",
  themes: "Themes & Design",
  domain: "Domain & Go Live",
  settings: "Site Settings"
};

const SECTION_DESC = {
  none: "Select a section on the preview or from the list",
  ticker: "Scrolling announcement bar",
  navigation: "Logo, Register & Login links",
  hero: "Main headline and feature bullets",
  partners: "Company logo carousel",
  alumni: "Student placement photos",
  journey: "Your Journey at Nexus IT",
  guarantee: "Placement guarantee text",
  course: "Syllabus, roles, skill tags",
  jobs: "Optional job profile cards",
  fees: "Pay-after-placement pricing",
  eligibility: "Who can apply",
  batch: "Upcoming batch & Join Community",
  contact: "Address, phone, email, footer logos",
  themes: "Colors and fonts",
  domain: "Connect custom domain",
  settings: "Site name, logo, SEO"
};

/** Canvas click ids → admin editor section ids */
const CANVAS_TO_EDITOR = {
  ticker: "ticker",
  header: "navigation",
  hero: "hero",
  partners: "partners",
  alumni: "alumni",
  journey: "journey",
  guarantee: "guarantee",
  course: "course",
  jobs: "jobs",
  fees: "fees",
  eligibility: "eligibility",
  batch: "batch",
  contact: "contact"
};

const HEADER_TREE = [
  { id: "ticker", title: "Horizontal Ticker" },
  { id: "navigation", title: "Header", canvas: "header" }
];

const FOOTER_TREE = [
  { id: "contact", title: "Footer / Contact" }
];

const THEME_SECTIONS = ["themes", "domain", "settings"];
const LOCKED_SECTIONS = new Set(["ticker", "navigation", "header", "contact"]);
const REMOVABLE_SECTIONS = DEFAULT_SECTION_ORDER.filter((id) => id !== "contact");

const SECTION_CATALOG = [
  { id: "hero", title: "Hero", desc: "Main headline and feature bullets" },
  { id: "partners", title: "Hiring Partners", desc: "Logo carousel" },
  { id: "alumni", title: "Alumni Spotlight", desc: "Placement photo stories" },
  { id: "journey", title: "Journey Steps", desc: "Step-by-step journey" },
  { id: "guarantee", title: "Placement Guarantee", desc: "Guarantee headline" },
  { id: "course", title: "Course / Syllabus", desc: "Scrum Master program" },
  { id: "jobs", title: "Job Profiles", desc: "Optional job profile cards" },
  { id: "fees", title: "Fee Structure", desc: "Pay-after-placement steps" },
  { id: "eligibility", title: "Eligibility", desc: "Who can apply" },
  { id: "batch", title: "Next Batch", desc: "Upcoming batch & WhatsApp CTA" }
];

const SECTIONS = [
  ...HEADER_TREE.map((s) => ({ id: s.id, title: s.title, desc: SECTION_DESC[s.id] })),
  ...DEFAULT_SECTION_ORDER.map((id) => ({
    id: id === "contact" ? null : id,
    title: SECTION_LABELS[id],
    desc: SECTION_DESC[id]
  })).filter((s) => s.id),
  ...FOOTER_TREE.map((s) => ({ id: s.id, title: s.title, desc: SECTION_DESC[s.id] })),
  ...THEME_SECTIONS.map((id) => ({ id, title: SECTION_LABELS[id], desc: SECTION_DESC[id] }))
];

let site = null;
let themes = { presets: [], fonts: [] };
let activeSection = "none";
let selectedCanvasSection = null;
let isDirty = false;
let previewVisible = true;
let previewTimer = null;
let canvasDevice = "desktop";
/** Keep current site fonts when applying a color theme */
let lockFontsOnThemeChange = true;
/** Expanded section ids in the left tree (for nested blocks) */
const expandedTreeSections = new Set();

/** Undo / redo + last published snapshot */
let savedSnapshot = null;
let historyCheckpoint = null;
let undoStack = [];
let redoStack = [];
let historyTimer = null;
let applyingHistory = false;
const HISTORY_LIMIT = 40;

const $ = (sel) => document.querySelector(sel);
const previewFrame = $("#preview-frame");
function ed() {
  return $("#editor-panel");
}

function cloneSite(value) {
  return JSON.parse(JSON.stringify(value));
}

function updateSaveUi() {
  const saveBtn = $("#save-btn");
  const discardBtn = $("#discard-btn");
  if (saveBtn) {
    if (isDirty) {
      saveBtn.textContent = "Save";
      saveBtn.disabled = false;
      saveBtn.classList.add("btn-pulse");
      saveBtn.title = "Save & publish changes";
    } else {
      saveBtn.textContent = "Saved";
      saveBtn.disabled = true;
      saveBtn.classList.remove("btn-pulse");
      saveBtn.title = "All changes published";
    }
  }
  discardBtn?.classList.toggle("hidden", !isDirty);
  updateUndoUi();
}

function updateUndoUi() {
  const undoBtn = $("#undo-btn");
  const redoBtn = $("#redo-btn");
  if (undoBtn) undoBtn.disabled = !undoStack.length;
  if (redoBtn) redoBtn.disabled = !redoStack.length;
}

function initEditHistory() {
  historyCheckpoint = cloneSite(site);
  undoStack = [];
  redoStack = [];
  clearTimeout(historyTimer);
  updateUndoUi();
}

function captureHistoryCheckpoint() {
  if (applyingHistory || !site || !historyCheckpoint) return;
  const now = JSON.stringify(site);
  const prev = JSON.stringify(historyCheckpoint);
  if (now === prev) return;
  undoStack.push(historyCheckpoint);
  if (undoStack.length > HISTORY_LIMIT) undoStack.shift();
  redoStack = [];
  historyCheckpoint = cloneSite(site);
  updateUndoUi();
}

function refreshAfterHistory() {
  ensureSiteShapes();
  ensureSectionOrder();
  renderSectionTree();
  renderEditor();
  scheduleLivePreview();
  highlightSectionInPreview();
  updateSaveUi();
}

function undoEdit() {
  if (!undoStack.length) return;
  applyingHistory = true;
  redoStack.push(cloneSite(site));
  site = undoStack.pop();
  historyCheckpoint = cloneSite(site);
  applyingHistory = false;
  isDirty = JSON.stringify(site) !== savedSnapshot;
  refreshAfterHistory();
  showToast("Undid last change");
}

function redoEdit() {
  if (!redoStack.length) return;
  applyingHistory = true;
  undoStack.push(cloneSite(site));
  site = redoStack.pop();
  historyCheckpoint = cloneSite(site);
  applyingHistory = false;
  isDirty = JSON.stringify(site) !== savedSnapshot;
  refreshAfterHistory();
  showToast("Redid change");
}

async function discardChanges() {
  if (!isDirty) return;
  if (!confirm("Discard all unsaved changes and reload the last published version?")) return;
  site = await api("/api/admin/site");
  savedSnapshot = JSON.stringify(site);
  clearDirty();
  initEditHistory();
  clearSelection();
  refreshPreview();
  showToast("Discarded unsaved changes");
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }
  return res.json();
}

function showToast(msg, type = "success") {
  const t = $("#toast");
  t.textContent = msg;
  t.className = `toast ${type}`;
  setTimeout(() => t.classList.add("hidden"), 3000);
}

function markDirty() {
  if (applyingHistory) {
    scheduleLivePreview();
    return;
  }
  if (!isDirty) {
    isDirty = true;
    $("#unsaved-badge")?.classList.remove("hidden");
  }
  clearTimeout(historyTimer);
  historyTimer = setTimeout(captureHistoryCheckpoint, 350);
  updateSaveUi();
  scheduleLivePreview();
}

function clearDirty() {
  isDirty = false;
  $("#unsaved-badge")?.classList.add("hidden");
  savedSnapshot = site ? JSON.stringify(site) : null;
  updateSaveUi();
}

function ensureSectionOrder() {
  if (!site.sectionHidden || typeof site.sectionHidden !== "object") site.sectionHidden = {};
  if (!Array.isArray(site.sectionOrder) || !site.sectionOrder.length) {
    site.sectionOrder = DEFAULT_SECTION_ORDER.slice();
  }
  site.sectionOrder = site.sectionOrder.filter((id) => DEFAULT_SECTION_ORDER.includes(id));
  if (!site.sectionOrder.includes("contact")) site.sectionOrder.push("contact");
  // Migrate legacy jobs.enabled=false into sectionHidden
  if (site.jobProfiles?.enabled === false && site.sectionHidden.jobs == null && site.sectionOrder.includes("jobs")) {
    site.sectionHidden.jobs = true;
  }
}

function isSectionVisible(id) {
  if (site.sectionHidden?.[id] === true) return false;
  if (id === "ticker") return site.ticker?.enabled !== false;
  if (id === "course") return site.course?.enabled !== false;
  if (id === "jobs") return site.jobProfiles?.enabled === true;
  if (id === "eligibility") return site.eligibility?.enabled !== false;
  if (id === "batch") return site.nextBatch?.enabled !== false;
  return true;
}

function setSectionVisible(id, visible) {
  if (!site.sectionHidden) site.sectionHidden = {};
  if (visible) delete site.sectionHidden[id];
  else site.sectionHidden[id] = true;
  if (id === "ticker") {
    site.ticker = site.ticker || {};
    site.ticker.enabled = visible;
  }
  if (id === "course") {
    site.course = site.course || {};
    site.course.enabled = visible;
  }
  if (id === "jobs") {
    site.jobProfiles = site.jobProfiles || { title: "", items: [] };
    site.jobProfiles.enabled = visible;
  }
  if (id === "eligibility") {
    site.eligibility = site.eligibility || {};
    site.eligibility.enabled = visible;
  }
  if (id === "batch") {
    site.nextBatch = site.nextBatch || {};
    site.nextBatch.enabled = visible;
  }
}

function getSectionBlocks(sectionId) {
  ensureSiteShapes();
  if (sectionId === "ticker") {
    return (site.ticker.items || []).map((text, index) => ({
      index,
      label: String(text || "").slice(0, 40) || `Item ${index + 1}`,
      list: "ticker"
    }));
  }
  if (sectionId === "hero") {
    return (site.hero.features || []).map((text, index) => ({
      index,
      label: String(text || "").slice(0, 40) || `Feature ${index + 1}`,
      list: "hero"
    }));
  }
  if (sectionId === "partners") {
    return (site.hiringPartners?.logos || []).map((item, index) => ({
      index,
      label: item.alt || `Logo ${index + 1}`,
      list: "partners"
    }));
  }
  if (sectionId === "alumni") {
    return (site.alumni.items || []).map((item, index) => ({
      index,
      label: item.alt || `Alumni ${index + 1}`,
      list: "alumni"
    }));
  }
  if (sectionId === "journey") {
    return (site.journey?.steps || []).map((item, index) => ({
      index,
      label: item.title || `Step ${index + 1}`,
      list: "journey"
    }));
  }
  if (sectionId === "fees") {
    return (site.feeStructure.steps || []).map((item, index) => ({
      index,
      label: item.label || item.title || `Step ${index + 1}`,
      list: "fees"
    }));
  }
  if (sectionId === "course") {
    return (site.course.modules || []).map((item, index) => ({
      index,
      label: item.title || `Module ${index + 1}`,
      list: "course"
    }));
  }
  return [];
}

function reorderBlocks(listKey, from, to) {
  const getters = {
    ticker: () => site.ticker.items,
    hero: () => site.hero.features,
    partners: () => site.hiringPartners.logos,
    alumni: () => site.alumni.items,
    journey: () => site.journey.steps,
    fees: () => site.feeStructure.steps,
    course: () => site.course.modules
  };
  const list = getters[listKey]?.();
  if (!Array.isArray(list) || from < 0 || to < 0 || from === to) return;
  const [moved] = list.splice(from, 1);
  list.splice(to, 0, moved);
  if (listKey === "course") {
    list.forEach((m) => {
      if (typeof m.itemsText === "string") m.items = linesToArray(m.itemsText);
    });
  }
}

function removeSectionFromPage(id) {
  if (LOCKED_SECTIONS.has(id) || id === "contact") {
    showToast("This section is locked and cannot be removed", "error");
    return;
  }
  if (!confirm(`Remove “${SECTION_LABELS[id] || id}” from the page?\n\nYou can add it again later from Add section.`)) return;
  site.sectionOrder = site.sectionOrder.filter((s) => s !== id);
  if (activeSection === id) clearSelection();
  markDirty();
  renderSectionTree();
  scheduleLivePreview();
  showToast("Section removed — click Save when ready");
}

function addSectionToPage(id) {
  ensureSectionOrder();
  if (site.sectionOrder.includes(id)) {
    setSectionVisible(id, true);
    selectFromCanvas(id);
    markDirty();
    scheduleLivePreview();
    return;
  }
  if (!DEFAULT_SECTION_ORDER.includes(id)) return;
  const contactIdx = site.sectionOrder.indexOf("contact");
  if (contactIdx >= 0) site.sectionOrder.splice(contactIdx, 0, id);
  else site.sectionOrder.push(id);
  setSectionVisible(id, true);
  ensureSiteShapes();
  markDirty();
  closeSectionCatalog();
  selectFromCanvas(id);
  scheduleLivePreview();
  showToast(`Added ${SECTION_LABELS[id] || id}`);
}

function openSectionCatalog() {
  ensureSectionOrder();
  const modal = $("#section-catalog-modal");
  const list = $("#section-catalog-list");
  if (!modal || !list) return;
  const missing = SECTION_CATALOG.filter((s) => !site.sectionOrder.includes(s.id));
  const hidden = SECTION_CATALOG.filter((s) => site.sectionOrder.includes(s.id) && !isSectionVisible(s.id));
  if (!missing.length && !hidden.length) {
    list.innerHTML = `<p class="card-desc">All available sections are already on the page and visible.</p>`;
  } else {
    list.innerHTML = [
      ...hidden.map((s) => `<button type="button" class="catalog-item" data-add-section="${s.id}" data-catalog-action="show">
        <strong>${s.title}</strong><span>Currently hidden — click to show</span></button>`),
      ...missing.map((s) => `<button type="button" class="catalog-item" data-add-section="${s.id}" data-catalog-action="add">
        <strong>${s.title}</strong><span>${s.desc}</span></button>`)
    ].join("");
  }
  modal.classList.remove("hidden");
  list.querySelectorAll("[data-add-section]").forEach((btn) => {
    btn.addEventListener("click", () => addSectionToPage(btn.dataset.addSection));
  });
}

function closeSectionCatalog() {
  $("#section-catalog-modal")?.classList.add("hidden");
}

function moveSectionInOrder(id, direction) {
  ensureSectionOrder();
  const order = site.sectionOrder.filter((s) => s !== "contact");
  const idx = order.indexOf(id);
  if (idx < 0) return;
  const to = idx + direction;
  if (to < 0 || to >= order.length) return;
  const [moved] = order.splice(idx, 1);
  order.splice(to, 0, moved);
  if (site.sectionOrder.includes("contact")) order.push("contact");
  site.sectionOrder = order;
  markDirty();
  renderSectionTree();
  scheduleLivePreview();
}

function editorToCanvasId(editorId) {
  if (editorId === "navigation") return "header";
  if (DEFAULT_SECTION_ORDER.includes(editorId) || editorId === "ticker") return editorId;
  return null;
}

function highlightSectionInPreview(sectionId) {
  const canvasId = sectionId || selectedCanvasSection || editorToCanvasId(activeSection);
  if (!previewFrame?.contentWindow) return;
  previewFrame.contentWindow.postMessage({ type: "nexus-highlight", section: canvasId }, "*");
}

function scheduleLivePreview() {
  if (!previewVisible) return;
  clearTimeout(previewTimer);
  previewTimer = setTimeout(() => {
    syncLivePreview().catch(() => {});
  }, 700);
}

async function syncLivePreview() {
  if (!site) return;
  await api("/api/admin/preview-draft", { method: "PUT", body: JSON.stringify(site) });
  refreshPreview();
}

function selectFromCanvas(canvasId) {
  const editorId = CANVAS_TO_EDITOR[canvasId] || canvasId;
  selectedCanvasSection = canvasId;
  activeSection = editorId;
  renderSectionTree();
  renderEditor();
  highlightSectionInPreview(canvasId);
  $("#inspector-back")?.classList.remove("hidden");
}

function clearSelection() {
  activeSection = "none";
  selectedCanvasSection = null;
  renderSectionTree();
  renderEditor();
  highlightSectionInPreview(null);
  $("#inspector-back")?.classList.add("hidden");
}

async function refreshDomainGuide() {
  const guide = $("#domain-guide");
  if (!guide) return;

  try {
    await api("/api/admin/preview-draft", { method: "PUT", body: JSON.stringify(site) });
    const data = await api("/api/admin/domain/setup");
    const { dns, steps, nginxConfig, liveUrl, stagingUrl, adminUrl } = data;
    const subdomain = site.domain?.liveSubdomain || "nexusitacad.niyamstack.com";
    const publicLive = stagingUrl || `https://${subdomain}`;
    const adminLive = adminUrl || `${publicLive.replace(/\/$/, "")}/admin`;

    if (!dns.ready) {
      guide.innerHTML = `<div class="card domain-live-card">
        <h3>🚀 Current live URLs (Niyamstack)</h3>
        <p><strong>Website:</strong> <a href="${publicLive}" target="_blank" rel="noopener">${publicLive}</a></p>
        <p><strong>Admin panel:</strong> <a href="${adminLive}" target="_blank" rel="noopener">${adminLive}</a></p>
        <p class="card-desc">Deploy this CMS on your VPS and point <code>${subdomain}</code> to it. Sign in with your Admin ID and password.</p>
      </div>
      <div class="card"><h3>DNS Records — waiting for custom domain details</h3>
        <p class="card-desc">Enter your domain and VPS IP above, then save. We'll generate the exact A / @ / www records for your registrar.</p>
        <ol class="steps-list">${steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      </div>`;
      return;
    }

    const rows = dns.records.map((r) =>
      `<tr>
        <td><code>${r.type}</code></td>
        <td><code>${r.hostLabel || r.host}</code></td>
        <td><code>${r.value}</code></td>
        <td>${r.ttl}</td>
        <td>${r.purpose}</td>
      </tr>`
    ).join("");

    guide.innerHTML = `
      <div class="card domain-live-card">
        <h3>🚀 Current live URLs (Niyamstack)</h3>
        <p><strong>Website:</strong> <a href="${publicLive}" target="_blank" rel="noopener">${publicLive}</a></p>
        <p><strong>Admin panel:</strong> <a href="${adminLive}" target="_blank" rel="noopener">${adminLive}</a></p>
      </div>
      <div class="card domain-live-card">
        <h3>✅ Custom domain will be live at</h3>
        <p class="live-url">${liveUrl || "https://" + dns.domain}</p>
        <p class="card-desc">After DNS propagates and VPS is configured, visitors typing <strong>${dns.domain}</strong> will see your website.</p>
      </div>
      <div class="card">
        <div class="card-header-row">
          <h3>DNS Records to add at your registrar</h3>
          <button type="button" class="btn btn-secondary btn-sm" id="copy-dns-btn">Copy records</button>
        </div>
        <p class="card-desc">Log in where you bought <strong>${dns.domain}</strong> (GoDaddy, Namecheap, Hostinger, etc.) → DNS Settings → add these:</p>
        <div class="table-wrap">
          <table class="dns-table">
            <thead><tr><th>Type</th><th>Host / Name</th><th>Points to / Value</th><th>TTL</th><th>Purpose</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <h3>Step-by-step go-live checklist</h3>
        <ol class="steps-list">${steps.map((s) => `<li>${s}</li>`).join("")}</ol>
      </div>
      <div class="card">
        <div class="card-header-row">
          <h3>Nginx config for your VPS</h3>
          <button type="button" class="btn btn-secondary btn-sm" id="copy-nginx-btn">Copy config</button>
        </div>
        <p class="card-desc">Paste this on your Niyamstack VPS after deploying the CMS. It redirects ${dns.domain} → your Node app on port ${site.domain?.appPort || 3000}.</p>
        <pre class="code-block" id="nginx-config">${nginxConfig.replace(/</g, "&lt;")}</pre>
      </div>`;

    $("#copy-dns-btn")?.addEventListener("click", () => {
      const text = dns.records.map((r) => `${r.type}\t${r.host}\t${r.value}\tTTL ${r.ttl}`).join("\n");
      navigator.clipboard.writeText(text).then(() => showToast("DNS records copied!"));
    });

    $("#copy-nginx-btn")?.addEventListener("click", () => {
      navigator.clipboard.writeText(nginxConfig).then(() => showToast("Nginx config copied!"));
    });
  } catch (e) {
    guide.innerHTML = `<div class="card"><p class="form-error">${e.message}</p></div>`;
  }
}

function linesToArray(text) {
  return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

function arrayToLines(arr) {
  return (arr || []).join("\n");
}

function treeItemHtml(id, title, opts = {}) {
  const active = activeSection === id ? " active" : "";
  const hidden = opts.visible === false ? " tree-item--hidden" : "";
  const locked = opts.locked ? " tree-item--locked" : "";
  const grip = opts.draggable
    ? `<span class="tree-grip" data-drag="${id}" title="Drag to reorder">⋮⋮</span>`
    : `<span class="tree-grip tree-grip--lock" title="Locked">${opts.locked ? "🔒" : "·"}</span>`;
  const blocks = getSectionBlocks(id);
  const canExpand = blocks.length > 0;
  const expanded = expandedTreeSections.has(id);
  const chevron = canExpand
    ? `<button type="button" class="tree-chevron${expanded ? " open" : ""}" data-expand="${id}" title="${expanded ? "Collapse" : "Expand"}">${expanded ? "▾" : "▸"}</button>`
    : `<span class="tree-chevron-spacer"></span>`;
  const eye = opts.hideable !== false
    ? `<button type="button" class="tree-eye" data-eye="${id}" title="${opts.visible === false ? "Show section" : "Hide section"}">${opts.visible === false ? "👁‍🗨" : "👁"}</button>`
    : "";
  return `<div class="tree-row">
    <button type="button" class="tree-item${active}${hidden}${locked}" data-section="${id}">
      ${grip}${chevron}<span class="tree-item-label">${escapeHtml(title)}</span>${eye}
    </button>
  </div>`;
}

function treeBlocksHtml(sectionId) {
  const blocks = getSectionBlocks(sectionId);
  if (!blocks.length || !expandedTreeSections.has(sectionId)) return "";
  return `<div class="tree-blocks" data-parent="${sectionId}">
    ${blocks.map((b) => `<button type="button" class="tree-block" draggable="true" data-block-parent="${sectionId}" data-block-list="${b.list}" data-block-index="${b.index}">
      <span class="tree-grip">⋮⋮</span><span>${escapeHtml(b.label)}</span>
    </button>`).join("")}
  </div>`;
}

function openSectionFromTree(id) {
  activeSection = id;
  selectedCanvasSection = editorToCanvasId(id) || (id === "navigation" ? "header" : id);
  renderSectionTree();
  renderEditor();
  highlightSectionInPreview(selectedCanvasSection);
  if (selectedCanvasSection && previewFrame?.contentWindow) {
    previewFrame.contentWindow.postMessage({ type: "nexus-scroll", section: selectedCanvasSection }, "*");
  }
  $("#inspector-back")?.classList.remove("hidden");
}

function renderSectionTree() {
  ensureSectionOrder();
  const tree = $("#section-tree");
  if (!tree) return;

  const templateIds = site.sectionOrder.filter((id) => id !== "contact");
  const templateHtml = templateIds.map((id) => {
    return treeItemHtml(id, SECTION_LABELS[id] || id, {
      draggable: true,
      visible: isSectionVisible(id),
      hideable: true
    }) + treeBlocksHtml(id);
  }).join("");

  const headerHtml = HEADER_TREE.map((s) => {
    const visible = s.id === "ticker" ? isSectionVisible("ticker") : true;
    return treeItemHtml(s.id, s.title, {
      locked: true,
      visible,
      hideable: s.id === "ticker"
    }) + (s.id === "ticker" ? treeBlocksHtml("ticker") : "");
  }).join("");

  tree.innerHTML = `
    <div class="tree-group-label">Header</div>
    ${headerHtml}
    <div class="tree-group-label">Template</div>
    ${templateHtml || `<p class="tree-empty">No sections — click Add section</p>`}
    <div class="tree-group-label">Footer</div>
    ${FOOTER_TREE.map((s) => treeItemHtml(s.id, s.title, { locked: true, hideable: false })).join("")}
  `;

  tree.querySelectorAll(".tree-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (e.target.closest("[data-drag], [data-eye], [data-expand]")) return;
      openSectionFromTree(btn.dataset.section);
    });
  });

  tree.querySelectorAll("[data-expand]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.expand;
      if (expandedTreeSections.has(id)) expandedTreeSections.delete(id);
      else expandedTreeSections.add(id);
      renderSectionTree();
    });
  });

  tree.querySelectorAll("[data-eye]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const id = btn.dataset.eye;
      const next = !isSectionVisible(id);
      setSectionVisible(id, next);
      markDirty();
      renderSectionTree();
      scheduleLivePreview();
      showToast(next ? "Section visible" : "Section hidden on live site");
    });
  });

  tree.querySelectorAll(".tree-block").forEach((btn) => {
    btn.addEventListener("click", () => {
      expandedTreeSections.add(btn.dataset.blockParent);
      openSectionFromTree(btn.dataset.blockParent);
    });
    btn.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("application/x-nexus-block", JSON.stringify({
        list: btn.dataset.blockList,
        index: Number(btn.dataset.blockIndex),
        parent: btn.dataset.blockParent
      }));
      e.dataTransfer.effectAllowed = "move";
      btn.classList.add("dragging");
    });
    btn.addEventListener("dragend", () => btn.classList.remove("dragging"));
    btn.addEventListener("dragover", (e) => {
      e.preventDefault();
      btn.classList.add("drag-over");
    });
    btn.addEventListener("dragleave", () => btn.classList.remove("drag-over"));
    btn.addEventListener("drop", (e) => {
      e.preventDefault();
      btn.classList.remove("drag-over");
      let payload;
      try {
        payload = JSON.parse(e.dataTransfer.getData("application/x-nexus-block") || "");
      } catch {
        return;
      }
      if (!payload || payload.parent !== btn.dataset.blockParent) return;
      const to = Number(btn.dataset.blockIndex);
      reorderBlocks(payload.list, payload.index, to);
      markDirty();
      renderSectionTree();
      if (activeSection === payload.parent) renderEditor();
      scheduleLivePreview();
    });
  });

  let dragId = null;
  tree.querySelectorAll("[data-drag]").forEach((grip) => {
    const row = grip.closest(".tree-item");
    row.draggable = true;
    row.addEventListener("dragstart", (e) => {
      if (e.dataTransfer.types.includes("application/x-nexus-block")) return;
      dragId = grip.dataset.drag;
      e.dataTransfer.setData("text/plain", dragId);
      e.dataTransfer.setData("application/x-nexus-section", dragId);
    });
    row.addEventListener("dragend", () => {
      dragId = null;
      tree.querySelectorAll(".drag-over").forEach((n) => n.classList.remove("drag-over"));
    });
    row.addEventListener("dragover", (e) => {
      if (!dragId && !e.dataTransfer.types.includes("application/x-nexus-section")) return;
      e.preventDefault();
      row.classList.add("drag-over");
    });
    row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("drag-over");
      const fromId = e.dataTransfer.getData("application/x-nexus-section") || e.dataTransfer.getData("text/plain") || dragId;
      const toId = grip.dataset.drag || row.dataset.section;
      if (!fromId || !toId || fromId === toId) return;
      if (!DEFAULT_SECTION_ORDER.includes(fromId) || fromId === "contact") return;
      if (!DEFAULT_SECTION_ORDER.includes(toId) || toId === "contact") return;
      const order = site.sectionOrder.filter((id) => id !== "contact");
      const from = order.indexOf(fromId);
      const to = order.indexOf(toId);
      if (from < 0 || to < 0) return;
      order.splice(from, 1);
      order.splice(to, 0, fromId);
      if (site.sectionOrder.includes("contact")) order.push("contact");
      site.sectionOrder = order;
      markDirty();
      renderSectionTree();
      scheduleLivePreview();
      showToast("Section moved — click Save when ready");
    });
  });
}

function renderNav() {
  renderSectionTree();
}

function listField(label, items, fields, onChange, options = {}) {
  const wrap = document.createElement("div");
  wrap.className = "list-editor";
  const maxItems = options.maxItems || 0;
  const addLabel = options.addLabel || `+ Add ${label}`;

  function render() {
    wrap.innerHTML = "";
    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "list-item";
      row.draggable = true;
      row.dataset.index = String(index);

      const handle = document.createElement("span");
      handle.className = "drag-handle";
      handle.title = "Drag to reorder";
      handle.textContent = "⋮⋮";

      const fieldsDiv = document.createElement("div");
      fieldsDiv.className = "list-item-fields";

      fields.forEach((f) => {
        if (f.type === "image") {
          const imgField = createImageField(f.label, item[f.key] || "", f.preset || "partnerLogo", (url) => {
            item[f.key] = url;
            onChange();
            markDirty();
          });
          fieldsDiv.appendChild(imgField);
          return;
        }

        const lbl = document.createElement("label");
        lbl.innerHTML = `<span>${f.label}</span>`;
        const input = document.createElement(f.type === "textarea" ? "textarea" : "input");
        input.type = f.type || "text";
        input.value = item[f.key] || "";
        if (f.placeholder) input.placeholder = f.placeholder;
        input.addEventListener("input", () => {
          item[f.key] = input.value;
          onChange();
          markDirty();
        });
        lbl.appendChild(input);
        fieldsDiv.appendChild(lbl);
      });

      const actions = document.createElement("div");
      actions.className = "item-actions";
      const up = document.createElement("button");
      up.type = "button";
      up.className = "btn btn-ghost btn-sm";
      up.textContent = "↑";
      up.disabled = index === 0;
      up.onclick = () => {
        items.splice(index - 1, 0, items.splice(index, 1)[0]);
        onChange();
        markDirty();
        render();
      };

      const down = document.createElement("button");
      down.type = "button";
      down.className = "btn btn-ghost btn-sm";
      down.textContent = "↓";
      down.disabled = index === items.length - 1;
      down.onclick = () => {
        items.splice(index + 1, 0, items.splice(index, 1)[0]);
        onChange();
        markDirty();
        render();
      };

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-danger btn-sm";
      del.textContent = "Remove";
      del.onclick = () => {
        if (!confirm(`Remove this ${label.toLowerCase()}?`)) return;
        items.splice(index, 1);
        onChange();
        markDirty();
        render();
      };

      actions.append(up, down, del);
      row.append(handle, fieldsDiv, actions);

      row.addEventListener("dragstart", (e) => {
        e.dataTransfer.setData("text/plain", String(index));
        row.classList.add("dragging");
      });
      row.addEventListener("dragend", () => row.classList.remove("dragging"));
      row.addEventListener("dragover", (e) => {
        e.preventDefault();
        row.classList.add("drag-over");
      });
      row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
      row.addEventListener("drop", (e) => {
        e.preventDefault();
        row.classList.remove("drag-over");
        const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
        const to = index;
        if (Number.isNaN(from) || from === to) return;
        const [moved] = items.splice(from, 1);
        items.splice(to, 0, moved);
        onChange();
        markDirty();
        render();
      });

      wrap.appendChild(row);
    });

    const add = document.createElement("button");
    add.type = "button";
    add.className = "btn btn-secondary";
    add.textContent = addLabel;
    if (maxItems && items.length >= maxItems) {
      add.disabled = true;
      add.textContent = `Maximum ${maxItems} ${label.toLowerCase()}s`;
    }
    add.onclick = () => {
      if (maxItems && items.length >= maxItems) return;
      const empty = {};
      fields.forEach((f) => (empty[f.key] = ""));
      items.push(empty);
      onChange();
      markDirty();
      render();
    };
    wrap.appendChild(add);

    if (options.hint) {
      const hint = document.createElement("p");
      hint.className = "card-desc";
      hint.textContent = options.hint;
      wrap.appendChild(hint);
    }
  }

  render();
  return wrap;
}

function field(label, value, type = "text", id = null) {
  const fieldId = id || "f_" + Math.random().toString(36).slice(2);
  if (type === "textarea") {
    return `<label><span>${label}</span><textarea id="${fieldId}">${escapeHtml(value || "")}</textarea></label>`;
  }
  if (type === "color") {
    return colorHexField(label, fieldId, value || "#bc0d5d");
  }
  if (type === "checkbox") {
    return `<label class="checkbox-row"><input type="checkbox" id="${fieldId}" ${value ? "checked" : ""}><span>${label}</span></label>`;
  }
  return `<label><span>${label}</span><input type="${type}" id="${fieldId}" value="${escapeAttr(value || "")}"></label>`;
}

function selectField(label, id, value, options) {
  const opts = options
    .map(([val, text]) => `<option value="${escapeAttr(val)}" ${String(value) === String(val) ? "selected" : ""}>${escapeHtml(text)}</option>`)
    .join("");
  return `<label><span>${label}</span><select id="${id}">${opts}</select></label>`;
}

function rangeField(label, id, value, min, max, step = 1, suffix = "") {
  const unit = String(suffix || "").trim() || "px";
  const numericSuffix = unit.replace(/^\s+/, "");
  return unitRangeField(label, id, value, min, max, step, numericSuffix.replace(/^\s*/, "") || "px");
}

function unitRangeField(label, id, value, min, max, step = 1, unit = "px") {
  const v = value ?? min;
  return `<label class="unit-range-field"><span>${label}</span>
    <div class="unit-range-row">
      <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}">
      <div class="unit-range-num">
        <input type="number" id="${id}-num" min="${min}" max="${max}" step="${step}" value="${v}">
        <span class="unit-suffix">${escapeHtml(unit)}</span>
      </div>
    </div>
  </label>`;
}

function colorHexField(label, id, value) {
  let v = String(value || "#121212").trim();
  if (!/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) v = "#121212";
  if (v.length === 4) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
  return `<label class="color-hex-field"><span>${label}</span>
    <div class="color-hex-row">
      <input type="color" id="${id}" value="${escapeAttr(v)}" title="Pick color">
      <input type="text" id="${id}-hex" class="color-hex-input" value="${escapeAttr(v)}" maxlength="7" spellcheck="false">
    </div>
  </label>`;
}

function getThemeFontChoices() {
  const pairs = themes.fonts || [];
  const choices = [];
  pairs.forEach((p) => {
    if (p.heading) choices.push({ family: p.heading, note: "Theme heading" });
    if (p.body && p.body !== p.heading) choices.push({ family: p.body, note: "Theme body" });
  });
  const seen = new Set();
  return choices.filter((c) => {
    if (seen.has(c.family)) return false;
    seen.add(c.family);
    return true;
  });
}

function getAllFontFamilies() {
  const list = themes.allFonts || [];
  return [...list].sort((a, b) => a.family.localeCompare(b.family));
}

function ensureAdminFontsLoaded() {
  if (document.getElementById("nexus-admin-fonts")) return;
  const families = getAllFontFamilies().slice(0, 80);
  if (!families.length) return;
  const href = families
    .map((f) => `${encodeURIComponent(f.family).replace(/%20/g, "+")}:wght@400;700`)
    .join("&family=");
  const link = document.createElement("link");
  link.id = "nexus-admin-fonts";
  link.rel = "stylesheet";
  link.href = `https://fonts.googleapis.com/css2?family=${href}&display=swap`;
  document.head.appendChild(link);
}

function fontPickerField(label, id, value) {
  ensureAdminFontsLoaded();
  const current = value || "";
  const themeFonts = getThemeFontChoices();
  const allFonts = getAllFontFamilies();
  const themeOpts = themeFonts
    .map((f) => `<option value="${escapeAttr(f.family)}" ${current === f.family ? "selected" : ""} style="font-family:'${escapeAttr(f.family)}', sans-serif">${escapeHtml(f.family)}</option>`)
    .join("");
  const allOpts = allFonts
    .map((f) => `<option value="${escapeAttr(f.family)}" ${current === f.family ? "selected" : ""} style="font-family:'${escapeAttr(f.family)}', sans-serif">${escapeHtml(f.family)}</option>`)
    .join("");
  return `<label class="font-picker-field"><span>${label}</span>
    <select id="${id}" class="font-picker-select">
      <option value="">Theme default</option>
      <optgroup label="Theme fonts">${themeOpts}</optgroup>
      <optgroup label="All fonts">${allOpts}</optgroup>
    </select>
  </label>`;
}

function bulletStyleField(label, id, value) {
  const styles = themes.bulletStyles || [
    { id: "check-circle", label: "Check in circle" },
    { id: "disc", label: "Filled disc" },
    { id: "dash", label: "Dash" },
    { id: "arrow", label: "Arrow" },
    { id: "number", label: "Numbers" }
  ];
  const current = value || "check-circle";
  const cards = styles.map((s) => {
    const active = current === s.id ? " active" : "";
    return `<button type="button" class="bullet-style-card${active}" data-bullet="${escapeAttr(s.id)}" title="${escapeAttr(s.label)}">
      <span class="bullet-style-preview bullet-preview--${escapeAttr(s.id)}"></span>
      <span>${escapeHtml(s.label)}</span>
    </button>`;
  }).join("");
  return `<div class="bullet-style-field"><span class="field-label">${label}</span>
    <input type="hidden" id="${id}" value="${escapeAttr(current)}">
    <div class="bullet-style-grid">${cards}</div>
  </div>`;
}

function bindRange(id, onChange, suffix = "") {
  bindUnitRange(id, onChange, suffix);
}

function bindUnitRange(id, onChange) {
  const range = document.getElementById(id);
  const num = document.getElementById(`${id}-num`);
  if (!range) return;
  const sync = (raw) => {
    const v = raw;
    range.value = v;
    if (num) num.value = v;
    onChange(v);
    markDirty();
  };
  range.addEventListener("input", () => sync(range.value));
  num?.addEventListener("input", () => sync(num.value));
}

function bindColorHex(id, onChange) {
  const color = document.getElementById(id);
  const hex = document.getElementById(`${id}-hex`);
  if (!color) return;
  color.addEventListener("input", () => {
    if (hex) hex.value = color.value;
    onChange(color.value);
    markDirty();
  });
  hex?.addEventListener("input", () => {
    let v = hex.value.trim();
    if (!v.startsWith("#")) v = `#${v}`;
    if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v)) {
      if (v.length === 4) v = `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`;
      color.value = v;
      hex.value = v;
      onChange(v);
      markDirty();
    }
  });
}

function bindFontPicker(id, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  const paint = () => {
    const family = el.value || "inherit";
    el.style.fontFamily = family === "inherit" || !family ? "inherit" : `'${family}', sans-serif`;
  };
  paint();
  el.addEventListener("change", () => {
    paint();
    onChange(el.value);
    markDirty();
  });
}

function bindBulletStyle(id, onChange) {
  const hidden = document.getElementById(id);
  if (!hidden) return;
  const root = hidden.closest(".bullet-style-field");
  root?.querySelectorAll("[data-bullet]").forEach((btn) => {
    btn.addEventListener("click", () => {
      hidden.value = btn.dataset.bullet;
      root.querySelectorAll(".bullet-style-card").forEach((c) => c.classList.remove("active"));
      btn.classList.add("active");
      onChange(btn.dataset.bullet);
      markDirty();
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(str) {
  return escapeHtml(str).replace(/"/g, "&quot;");
}

function bindField(id, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  if (el.type === "color" && document.getElementById(`${id}-hex`)) {
    bindColorHex(id, onChange);
    return;
  }
  const evt = el.type === "checkbox" ? "change" : "input";
  el.addEventListener(evt, () => {
    onChange(el.type === "checkbox" ? el.checked : el.value);
    markDirty();
  });
}

function ensureSiteShapes() {
  if (!site.ticker) site.ticker = { enabled: true, items: [], speed: 75 };
  if (!site.ticker.items) site.ticker.items = [];
  if (!site.alumni) site.alumni = { title: "Alumni Spotlight", items: [], autoplaySeconds: 5 };
  if (!site.alumni.items) site.alumni.items = [];
  if (!site.nextBatch) site.nextBatch = { enabled: true };
  if (!site.community) site.community = { enabled: true, floating: false };
  if (!site.feeStructure) site.feeStructure = { title: "", subtitle: "", totalLabel: "", steps: [] };
  if (!site.feeStructure.steps) site.feeStructure.steps = [];
  if (!site.hero) site.hero = { headline: "", features: [] };
  if (!Array.isArray(site.hero.features)) site.hero.features = [];
  if (!site.hiringPartners) site.hiringPartners = { title: "Our Hiring Partners", logos: [] };
  if (!site.hiringPartners.logos) site.hiringPartners.logos = [];
  if (!site.journey) site.journey = { title: "", steps: [] };
  if (!site.journey.steps) site.journey.steps = [];
  if (!site.course) site.course = { enabled: true, tags: [], roles: [], modules: [] };
  if (!site.course.modules) site.course.modules = [];
  if (!site.sectionHidden) site.sectionHidden = {};
}

function renderLayersList(container) {
  ensureSectionOrder();
  const list = document.createElement("div");
  list.className = "layers-list";

  site.sectionOrder.forEach((id, index) => {
    const row = document.createElement("div");
    row.className = `layer-item${selectedCanvasSection === id || activeSection === id ? " active" : ""}`;
    row.draggable = true;
    row.dataset.index = String(index);
    row.innerHTML = `<span class="layer-handle">⋮⋮</span><span>${SECTION_LABELS[id] || id}</span>`;
    const openBtn = document.createElement("button");
    openBtn.type = "button";
    openBtn.textContent = "Edit";
    openBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      selectFromCanvas(id);
    });
    row.appendChild(openBtn);

    row.addEventListener("click", () => selectFromCanvas(id));
    row.addEventListener("dragstart", (e) => {
      e.dataTransfer.setData("text/plain", String(index));
      row.classList.add("dragging");
    });
    row.addEventListener("dragend", () => row.classList.remove("dragging"));
    row.addEventListener("dragover", (e) => {
      e.preventDefault();
      row.classList.add("drag-over");
    });
    row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("drag-over");
      const from = parseInt(e.dataTransfer.getData("text/plain"), 10);
      const to = index;
      if (Number.isNaN(from) || from === to) return;
      const [moved] = site.sectionOrder.splice(from, 1);
      site.sectionOrder.splice(to, 0, moved);
      markDirty();
      renderEditor();
    });
    list.appendChild(row);
  });

  container.appendChild(list);
}

function renderEmptyInspector() {
  ed().innerHTML = `
    <div class="inspector-empty">
      <strong>Select a section</strong>
      Tap any section on the preview, or choose one from the left list.
      Settings for that section will appear here.
    </div>`;
}

function renderEditor() {
  const title = SECTION_LABELS[activeSection] || activeSection;
  const desc = SECTION_DESC[activeSection] || "Edit this section";
  $("#panel-title").textContent = title;
  $("#panel-desc").textContent = desc;

  ed().innerHTML = "";
  let html = "";

  if (!activeSection || activeSection === "none" || activeSection === "canvas") {
    renderEmptyInspector();
    $("#inspector-back")?.classList.add("hidden");
    return;
  }

  if (activeSection === "ticker") {
    if (!site.ticker) site.ticker = { enabled: true, items: [], speed: 75 };
    html = `<div class="card"><h3>Content</h3>
      ${field("Show ticker", site.ticker.enabled !== false, "checkbox", "ticker-enabled")}
      ${field("Ticker items (one per line)", arrayToLines(site.ticker.items), "textarea", "ticker-items")}
      <p class="card-desc">Example: 🧑‍🎓 100+ Genuine Placement</p>
    </div>
    <div class="card"><h3>Style</h3>
      ${rangeField("Ticker speed (seconds)", "ticker-speed", site.ticker.speed || 75, 20, 120, 1, "s")}
      ${rangeField("Text spacing", "ticker-spacing", site.ticker.textSpacing ?? 3, 1, 6, 0.5, " rem")}
      ${selectField("Text size", "ticker-size", site.ticker.textSize || "medium", [["small", "Small"], ["medium", "Medium"], ["large", "Large"]])}
      ${field("Uppercase text", site.ticker.uppercase !== false, "checkbox", "ticker-upper")}
      ${field("Bold text", site.ticker.bold !== false, "checkbox", "ticker-bold")}
      ${field("Italic text", !!site.ticker.italic, "checkbox", "ticker-italic")}
    </div>
    <div class="card"><h3>Section padding</h3>
      ${rangeField("Top padding", "ticker-pad-top", site.ticker.paddingTop ?? 12, 0, 48, 2, " px")}
      ${rangeField("Bottom padding", "ticker-pad-bottom", site.ticker.paddingBottom ?? 12, 0, 48, 2, " px")}
    </div>`;
  }

  if (activeSection === "navigation") {
    if (!site.navigation) site.navigation = { register: {}, login: {} };
    html = `<div class="card"><h3>Register button</h3>
      ${field("Label", site.navigation?.register?.label, "text", "reg-label")}
      ${field("URL", site.navigation?.register?.url, "url", "reg-url")}
      ${field("Enable link", site.navigation?.register?.enabled, "checkbox", "reg-enabled")}
      ${field("Open in new tab", site.navigation?.register?.openInNewTab, "checkbox", "reg-newtab")}
    </div>
    <div class="card"><h3>Login button</h3>
      ${field("Label", site.navigation?.login?.label, "text", "login-label")}
      ${field("URL", site.navigation?.login?.url, "url", "login-url")}
      ${field("Enable link", site.navigation?.login?.enabled, "checkbox", "login-enabled")}
      ${field("Open in new tab", site.navigation?.login?.openInNewTab, "checkbox", "login-newtab")}
    </div>
    <div class="card"><h3>Header layout</h3>
      ${selectField("Sticky header", "nav-sticky", site.navigation.sticky || "always", [["always", "Always"], ["never", "Off"]])}
      ${field("Show separator line", !!site.navigation.showSeparator, "checkbox", "nav-separator")}
      <div id="wrap-header-logo"></div>
    </div>
    <div class="card"><h3>Section padding</h3>
      ${rangeField("Top padding", "nav-pad-top", site.navigation.paddingTop ?? 16, 0, 48, 2, " px")}
      ${rangeField("Bottom padding", "nav-pad-bottom", site.navigation.paddingBottom ?? 16, 0, 48, 2, " px")}
    </div>`;
  }

  if (activeSection === "hero") {
    if (!site.hero) site.hero = { headline: "", features: [] };
    html = `<div class="card"><h3>Content</h3>
      ${field("Headline", site.hero.headline, "textarea", "hero-headline")}
      ${field("Feature bullets (one per line)", arrayToLines(site.hero.features), "textarea", "hero-features")}
    </div>
    <div class="card"><h3>Headline style</h3>
      ${fontPickerField("Heading font", "hero-font", site.hero.headingFont || "")}
      ${colorHexField("Heading color", "hero-color", site.hero.headlineColor || "#ffffff")}
      ${unitRangeField("Heading size (desktop)", "hero-size-d", site.hero.headlineSizeDesktop || 48, 24, 72, 1, "px")}
      ${unitRangeField("Heading size (mobile)", "hero-size-m", site.hero.headlineSizeMobile || 24, 16, 48, 1, "px")}
      ${unitRangeField("Spacing below heading", "hero-spacing", site.hero.spacingAfterHeading ?? 28, 0, 80, 2, "px")}
    </div>
    <div class="card"><h3>Bullet style</h3>
      ${bulletStyleField("List marker design", "hero-bullet", site.hero.bulletStyle || "check-circle")}
      ${colorHexField("Bullet color", "hero-bullet-color", site.hero.bulletColor || "#0aaa7c")}
      <p class="card-desc">Choose how feature bullets look on the hero — same idea as Shopify list markers.</p>
    </div>`;
  }

  if (activeSection === "guarantee") {
    html = `<div class="card"><h3>Placement Guarantee</h3>
      ${field("Title", site.placementGuarantee?.title, "text", "pg-title")}
      ${field("Subtitle", site.placementGuarantee?.subtitle, "text", "pg-subtitle")}
    </div>`;
  }

  if (activeSection === "jobs") {
    if (!site.jobProfiles) site.jobProfiles = { enabled: false, title: "", items: [] };
    html = `<div class="card"><h3>Job Profiles Section</h3>
      ${field("Show this section", site.jobProfiles?.enabled === true, "checkbox", "jobs-enabled")}
      ${field("Section title", site.jobProfiles?.title, "text", "jobs-title")}
      ${field("Profiles (one per line)", arrayToLines(site.jobProfiles?.items), "textarea", "jobs-items")}
      <p class="card-desc">Usually hidden when the Scrum Master course section is shown.</p>
    </div>`;
  }

  if (activeSection === "course") {
    if (!site.course) site.course = { enabled: true, tags: [], roles: [], modules: [] };
    html = `<div class="card"><h3>Course / Scrum Master</h3>
      ${field("Show course section", site.course.enabled !== false, "checkbox", "course-enabled")}
      ${field("Badge text", site.course.badge || "JOB PROFILE NAME", "text", "course-badge")}
      ${field("Course title", site.course.title, "text", "course-title")}
      ${field("Subtitle", site.course.subtitle, "text", "course-subtitle")}
      ${field("Skill tags (one per line)", arrayToLines(site.course.tags), "textarea", "course-tags")}
      ${field("About card title", site.course.aboutTitle || "About the Job Profile", "text", "course-about")}
      ${field("Roles title", site.course.rolesTitle, "text", "course-roles-title")}
      ${field("Roles (one per line)", arrayToLines(site.course.roles), "textarea", "course-roles")}
      ${field("Syllabus title", site.course.syllabusTitle, "text", "course-syllabus-title")}
      <p class="card-desc">Edit modules below. Each module has a title and bullet points.</p>
    </div>`;
  }

  if (activeSection === "eligibility") {
    if (!site.eligibility) site.eligibility = { enabled: true, title: "", items: [] };
    html = `<div class="card"><h3>Eligibility Criteria</h3>
      ${field("Show eligibility section", site.eligibility.enabled !== false, "checkbox", "elig-enabled")}
      ${field("Title", site.eligibility.title, "text", "elig-title")}
      ${field("Criteria (one per line)", arrayToLines(site.eligibility.items), "textarea", "elig-items")}
    </div>`;
  }

  if (activeSection === "batch") {
    if (!site.nextBatch) site.nextBatch = { enabled: true };
    if (!site.community) site.community = { enabled: true, floating: false };
    html = `<div class="card"><h3>Content</h3>
      ${field("Show next batch section", site.nextBatch.enabled !== false, "checkbox", "batch-enabled")}
      ${field("Badge text", site.nextBatch.badge || "Registration", "text", "batch-badge")}
      ${field("Main title", site.nextBatch.title || "⚡️ Next Batch Launch", "text", "batch-title")}
      ${field("Card eyebrow", site.nextBatch.cardEyebrow || "Attend our Demo session", "text", "batch-eyebrow")}
      ${field("Date / time", site.nextBatch.dateTitle || "", "text", "batch-date")}
      ${field("Card text", site.nextBatch.cardText || "", "textarea", "batch-text")}
    </div>
    <div class="card"><h3>Join Community button</h3>
      ${field("Button label", site.nextBatch.ctaLabel || "JOIN COMMUNITY", "text", "batch-cta-label")}
      ${field("WhatsApp / Community URL", site.nextBatch.ctaUrl || "", "url", "batch-cta-url")}
      ${field("Show floating JOIN COMMUNITY button", site.community.floating === true, "checkbox", "community-float")}
      <p class="card-desc">Keep floating OFF so visitors read the page first.</p>
    </div>`;
  }

  if (activeSection === "settings") {
    html = `<div class="card"><h3>Site Settings</h3>
      ${field("Site name", site.siteName, "text", "site-name")}
      <div id="wrap-site-logo"></div>
      <div id="wrap-footer-logo"></div>
      ${field("Page title (SEO)", site.meta?.title, "text", "meta-title")}
      ${field("Meta description", site.meta?.description, "textarea", "meta-desc")}
    </div>`;
  }

  if (html) ed().innerHTML = html;

  if (activeSection === "settings") {
    $("#wrap-site-logo")?.appendChild(createImageField("Site Logo (upload and crop)", site.logo, "logo", (v) => { site.logo = v; markDirty(); }));
    $("#wrap-footer-logo")?.appendChild(createImageField("Footer Logo (upload and crop)", site.footerLogo, "footerLogo", (v) => { site.footerLogo = v; markDirty(); }));
  }

  if (activeSection === "navigation") {
    $("#wrap-header-logo")?.appendChild(createImageField("Logo", site.logo, "logo", (v) => { site.logo = v; markDirty(); }));
    bindRange("nav-pad-top", (v) => { site.navigation.paddingTop = parseInt(v, 10) || 0; }, " px");
    bindRange("nav-pad-bottom", (v) => { site.navigation.paddingBottom = parseInt(v, 10) || 0; }, " px");
    $("#nav-sticky")?.addEventListener("change", (e) => { site.navigation.sticky = e.target.value; markDirty(); });
  }

  if (activeSection === "ticker") {
    bindRange("ticker-speed", (v) => { site.ticker.speed = parseInt(v, 10) || 75; }, "s");
    bindRange("ticker-spacing", (v) => { site.ticker.textSpacing = parseFloat(v) || 3; }, " rem");
    bindRange("ticker-pad-top", (v) => { site.ticker.paddingTop = parseInt(v, 10) || 0; }, " px");
    bindRange("ticker-pad-bottom", (v) => { site.ticker.paddingBottom = parseInt(v, 10) || 0; }, " px");
    $("#ticker-size")?.addEventListener("change", (e) => { site.ticker.textSize = e.target.value; markDirty(); });
  }

  if (activeSection === "hero") {
    bindFontPicker("hero-font", (v) => { site.hero.headingFont = v; });
    bindColorHex("hero-color", (v) => { site.hero.headlineColor = v; });
    bindUnitRange("hero-size-d", (v) => { site.hero.headlineSizeDesktop = parseInt(v, 10) || 48; });
    bindUnitRange("hero-size-m", (v) => { site.hero.headlineSizeMobile = parseInt(v, 10) || 24; });
    bindUnitRange("hero-spacing", (v) => { site.hero.spacingAfterHeading = parseInt(v, 10) || 0; });
    bindBulletStyle("hero-bullet", (v) => { site.hero.bulletStyle = v; });
    bindColorHex("hero-bullet-color", (v) => { site.hero.bulletColor = v; });
  }

  if (activeSection === "partners") {
    if (!site.hiringPartners) site.hiringPartners = { title: "", logos: [] };
    const styleCard = document.createElement("div");
    styleCard.className = "card";
    styleCard.innerHTML = `<h3>Heading</h3>
      ${field("Section title", site.hiringPartners.title, "text", "hp-title")}
      ${fontPickerField("Heading font", "hp-font", site.hiringPartners.headingFont || "")}
      ${selectField("Heading alignment", "hp-align", site.hiringPartners.headingAlign || "center", [["left", "Left"], ["center", "Center"], ["right", "Right"]])}
      ${unitRangeField("Heading size", "hp-size", site.hiringPartners.headingSize || 36, 18, 64, 1, "px")}
      ${colorHexField("Heading color", "hp-color", site.hiringPartners.headingColor || "#121212")}
      ${unitRangeField("Spacing below heading", "hp-spacing", site.hiringPartners.headingSpacing ?? 0, 0, 80, 2, "px")}`;
    ed().appendChild(styleCard);
    bindField("hp-title", (v) => { site.hiringPartners.title = v; });
    bindFontPicker("hp-font", (v) => { site.hiringPartners.headingFont = v; });
    bindUnitRange("hp-size", (v) => { site.hiringPartners.headingSize = parseInt(v, 10) || 36; });
    bindColorHex("hp-color", (v) => { site.hiringPartners.headingColor = v; });
    bindUnitRange("hp-spacing", (v) => { site.hiringPartners.headingSpacing = parseInt(v, 10) || 0; });
    $("#hp-align")?.addEventListener("change", (e) => { site.hiringPartners.headingAlign = e.target.value; markDirty(); });

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Logos</h3>
      <p class="card-desc">Add, replace, or remove partner logos. Drag ⋮⋮ to reorder.</p>
      <div class="bulk-upload-row">
        <label class="btn btn-secondary btn-sm bulk-upload-label">
          Bulk upload logos
          <input type="file" id="partners-bulk-upload" accept="image/*" multiple hidden>
        </label>
        <span class="card-desc" id="partners-bulk-status"></span>
      </div>`;
    ed().appendChild(card);
    card.appendChild(listField("Logo", site.hiringPartners.logos, [
      { key: "url", label: "Company logo", type: "image", preset: "partnerLogo" },
      { key: "alt", label: "Company name" },
      { key: "link", label: "Optional link URL", placeholder: "https://" }
    ], () => {}, { addLabel: "+ Add logo" }));

    $("#partners-bulk-upload")?.addEventListener("change", async (e) => {
      const files = [...(e.target.files || [])];
      e.target.value = "";
      if (!files.length) return;
      const status = $("#partners-bulk-status");
      if (status) status.textContent = `Uploading 0/${files.length}…`;
      let done = 0;
      for (const file of files) {
        try {
          const dataUrl = await window.fileToDataUrl(file);
          const uploaded = await window.uploadImageDataUrl(dataUrl, "partnerLogo");
          const name = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
          site.hiringPartners.logos.push({ url: uploaded.url, alt: name, link: "" });
          done += 1;
          if (status) status.textContent = `Uploaded ${done}/${files.length}`;
        } catch (err) {
          showToast(err.message || "Bulk upload failed", "error");
        }
      }
      markDirty();
      renderEditor();
      scheduleLivePreview();
      showToast(`Added ${done} partner logo${done === 1 ? "" : "s"}`);
    });
  }

  if (activeSection === "alumni") {
    ensureSiteShapes();
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Heading</h3>
      ${field("Section title", site.alumni?.title || "Alumni Spotlight", "text", "alumni-title")}
      ${fontPickerField("Heading font", "alumni-font", site.alumni?.headingFont || "")}
      ${selectField("Heading alignment", "alumni-align", site.alumni?.headingAlign || "center", [["left", "Left"], ["center", "Center"], ["right", "Right"]])}
      ${unitRangeField("Heading size", "alumni-size", site.alumni?.headingSize || 36, 18, 64, 1, "px")}
      ${colorHexField("Heading color", "alumni-color", site.alumni?.headingColor || "#121212")}
      ${unitRangeField("Spacing below heading", "alumni-spacing", site.alumni?.headingSpacing ?? 32, 0, 80, 2, "px")}
      ${unitRangeField("Mobile carousel speed", "alumni-speed", site.alumni?.autoplaySeconds || 5, 2, 15, 1, "s")}
      <p class="card-desc">Desktop shows a grid. Mobile uses the carousel.</p>`;
    ed().appendChild(card);
    bindField("alumni-title", (v) => { site.alumni.title = v; });
    bindFontPicker("alumni-font", (v) => { site.alumni.headingFont = v; });
    bindUnitRange("alumni-size", (v) => { site.alumni.headingSize = parseInt(v, 10) || 36; });
    bindColorHex("alumni-color", (v) => { site.alumni.headingColor = v; });
    bindUnitRange("alumni-spacing", (v) => { site.alumni.headingSpacing = parseInt(v, 10) || 0; });
    bindUnitRange("alumni-speed", (v) => { site.alumni.autoplaySeconds = parseInt(v, 10) || 5; });
    $("#alumni-align")?.addEventListener("change", (e) => { site.alumni.headingAlign = e.target.value; markDirty(); });

    const listCard = document.createElement("div");
    listCard.className = "card";
    listCard.innerHTML = `<h3>Alumni photos</h3><p class="card-desc">Add / remove / reorder stories.</p>`;
    ed().appendChild(listCard);
    listCard.appendChild(listField("Story", site.alumni.items, [
      { key: "image", label: "Photo", type: "image", preset: "alumni" },
      { key: "alt", label: "Caption / student name" }
    ], () => {}, { addLabel: "+ Add alumni story" }));
  }

  if (activeSection === "course") {
    if (!site.course.modules) site.course.modules = [];
    site.course.modules.forEach((m) => {
      if (!m.itemsText) m.itemsText = arrayToLines(m.items || []);
    });
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Syllabus modules</h3><p class="card-desc">Each module = title + bullets. Drag to reorder.</p>`;
    ed().appendChild(card);
    card.appendChild(listField("Module", site.course.modules, [
      { key: "title", label: "Module title" },
      { key: "itemsText", label: "Bullets (one per line)", type: "textarea" }
    ], () => {
      site.course.modules.forEach((m) => {
        if (typeof m.itemsText === "string") m.items = linesToArray(m.itemsText);
      });
    }, { addLabel: "+ Add module" }));
  }

  if (activeSection === "journey") {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Journey Steps</h3>${field("Section title", site.journey?.title, "text", "journey-title")}`;
    ed().appendChild(card);
    bindField("journey-title", (v) => { site.journey.title = v; });
    card.appendChild(listField("Step", site.journey.steps, [
      { key: "title", label: "Step title" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "icon", label: "Step icon", type: "image", preset: "journeyIcon" }
    ], () => {}));
  }

  if (activeSection === "fees") {
    ensureSiteShapes();
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Content</h3>
      ${field("Section title", site.feeStructure?.title, "text", "fee-title")}
      ${field("Subtitle", site.feeStructure?.subtitle, "text", "fee-subtitle")}
      ${field("Total fees label", site.feeStructure?.totalLabel, "text", "fee-total")}`;
    ed().appendChild(card);
    bindField("fee-title", (v) => { site.feeStructure.title = v; });
    bindField("fee-subtitle", (v) => { site.feeStructure.subtitle = v; });
    bindField("fee-total", (v) => { site.feeStructure.totalLabel = v; });

    const stepsCard = document.createElement("div");
    stepsCard.className = "card";
    stepsCard.innerHTML = `<h3>Fee steps</h3><p class="card-desc">Add, edit, or drag to reorder payment steps.</p>`;
    ed().appendChild(stepsCard);
    stepsCard.appendChild(listField("Fee step", site.feeStructure.steps, [
      { key: "label", label: "Step label" },
      { key: "title", label: "Amount / title" },
      { key: "description", label: "Description", type: "textarea" }
    ], () => {}, { addLabel: "+ Add fee step" }));
  }

  if (activeSection === "contact") {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Contact Information</h3>
      ${field("Section title", site.contact?.title, "text", "contact-title")}
      ${field("Address", site.contact?.address, "textarea", "contact-address")}
      ${field("Phone", site.contact?.phone, "text", "contact-phone")}
      ${field("Email", site.contact?.email, "email", "contact-email")}`;
    ed().appendChild(card);
    bindField("contact-title", (v) => { site.contact.title = v; });
    bindField("contact-address", (v) => { site.contact.address = v; });
    bindField("contact-phone", (v) => { site.contact.phone = v; });
    bindField("contact-email", (v) => { site.contact.email = v; });

    const card2 = document.createElement("div");
    card2.className = "card";
    card2.innerHTML = `<h3>Footer Partner Logos</h3>${field("Section title", site.footerPartners?.title, "text", "fp-title")}`;
    ed().appendChild(card2);
    bindField("fp-title", (v) => { site.footerPartners.title = v; });
    card2.appendChild(listField("Logo", site.footerPartners.logos, [
      { key: "url", label: "Partner logo", type: "image", preset: "partnerLogo" },
      { key: "alt", label: "Alt text" }
    ], () => {}));
  }

  if (activeSection === "domain") {
    if (!site.domain) site.domain = {};
    html = `<div class="card domain-hero-card">
      <h3>🌐 Connect Your Domain (Go Live)</h3>
      <p class="card-desc">You're building on Niyamstack hosting. Enter your domain and VPS IP here — we'll show exactly which DNS records (@, www, A, CNAME) to add at your registrar so <strong>nexusitacad.com</strong> points to your server.</p>
      <div class="field-grid-2">
        ${field("Custom domain", site.domain.customDomain, "text", "dom-name")}
        ${field("VPS / Server IP (from Niyamstack)", site.domain.serverIp, "text", "dom-ip")}
        ${field("Staging URL (optional)", site.domain.stagingUrl, "url", "dom-staging")}
        ${field("App port on VPS", site.domain.appPort || 3000, "number", "dom-port")}
      </div>
      <div class="field-grid-2" style="margin-top:14px">
        ${field("Include www subdomain", site.domain.includeWww !== false, "checkbox", "dom-www")}
        ${field("Use CNAME for www (instead of A)", site.domain.wwwRecordType === "CNAME", "checkbox", "dom-cname-www")}
      </div>
      <p class="card-desc">💡 <strong>@</strong> means root domain (nexusitacad.com). <strong>www</strong> is the www subdomain. Most registrars use @ for the root A record.</p>
    </div>
    <div id="domain-guide"></div>`;
    ed().innerHTML = html;

    bindField("dom-name", (v) => { site.domain.customDomain = v; refreshDomainGuide(); });
    bindField("dom-ip", (v) => { site.domain.serverIp = v; refreshDomainGuide(); });
    bindField("dom-staging", (v) => { site.domain.stagingUrl = v; });
    bindField("dom-port", (v) => { site.domain.appPort = parseInt(v, 10) || 3000; refreshDomainGuide(); });
    bindField("dom-www", (v) => { site.domain.includeWww = v; refreshDomainGuide(); });
    bindField("dom-cname-www", (v) => {
      site.domain.wwwRecordType = v ? "CNAME" : "A";
      refreshDomainGuide();
    });

    refreshDomainGuide();
  }

  if (activeSection === "themes") {
    const themeCards = themes.presets.map((t) => {
      const active = site.theme?.presetId === t.id;
      const swatches = [t.colors.primary, t.colors.heroBg, t.colors.tickerBg, t.colors.gradientEnd];
      return `<div class="theme-card${active ? " active" : ""}" data-theme="${t.id}">
        <div class="theme-preview">${swatches.map((c) => `<span style="background:${c}"></span>`).join("")}</div>
        <div class="theme-card-body"><strong>${t.name}</strong><p>${t.description}</p></div>
      </div>`;
    }).join("");

    const fontOptions = (themes.fonts || []).map((f) =>
      `<option value="${f.id}" ${site.theme?.custom?.fontPreset === f.id ? "selected" : ""}>${f.label}</option>`
    ).join("");

    if (!site.theme) site.theme = { presetId: "nexus-classic", custom: {} };
    if (!site.theme.custom) site.theme.custom = {};

    html = `<div class="card"><h3>Coaching Theme Gallery</h3>
      <p class="card-desc">Pick a theme for colors. Your current font stays locked unless you change it below.</p>
      ${field("Keep current fonts when changing theme", lockFontsOnThemeChange, "checkbox", "lock-fonts")}
      <div class="theme-grid">${themeCards}</div>
    </div>
    <div class="card"><h3>Custom Colors</h3>
      <div class="color-grid">
        ${colorHexField("Primary accent", "c-primary", site.theme?.custom?.colors?.primary || "#bc0d5d")}
        ${colorHexField("Hero background", "c-hero", site.theme?.custom?.colors?.heroBg || "#000000")}
        ${colorHexField("Ticker background", "c-ticker", site.theme?.custom?.colors?.tickerBg || "#bc0d5d")}
        ${colorHexField("Journey section bg", "c-journey", site.theme?.custom?.colors?.journeyBg || "#121212")}
      </div>
    </div>
    <div class="card"><h3>Fonts</h3>
      <label><span>Theme font pair</span><select id="font-preset">${fontOptions}</select></label>
      ${fontPickerField("Heading font", "theme-heading-font", site.theme.custom.headingFont || "")}
      ${fontPickerField("Body font", "theme-body-font", site.theme.custom.bodyFont || "")}
      <p class="card-desc">Theme fonts = site-wide defaults. Override heading/body individually — each option previews in its own typeface (Shopify-style).</p>
    </div>`;
    ed().innerHTML = html;

    bindField("lock-fonts", (v) => { lockFontsOnThemeChange = v; });

    document.querySelectorAll(".theme-card").forEach((card) => {
      card.addEventListener("click", () => {
        site.theme.presetId = card.dataset.theme;
        site.theme.custom.colors = {};
        if (!lockFontsOnThemeChange) {
          const preset = themes.presets.find((t) => t.id === card.dataset.theme);
          if (preset) site.theme.custom.fontPreset = preset.fonts;
        }
        markDirty();
        renderEditor();
      });
    });

    ["c-primary", "c-hero", "c-ticker", "c-journey"].forEach((id) => {
      bindColorHex(id, (v) => {
        if (!site.theme.custom.colors) site.theme.custom.colors = {};
        const key = { "c-primary": "primary", "c-hero": "heroBg", "c-ticker": "tickerBg", "c-journey": "journeyBg" }[id];
        if (v) site.theme.custom.colors[key] = v;
        else delete site.theme.custom.colors[key];
      });
    });

    $("#font-preset")?.addEventListener("change", (e) => {
      site.theme.custom.fontPreset = e.target.value;
      markDirty();
    });
    bindFontPicker("theme-heading-font", (v) => {
      if (v) site.theme.custom.headingFont = v;
      else delete site.theme.custom.headingFont;
    });
    bindFontPicker("theme-body-font", (v) => {
      if (v) site.theme.custom.bodyFont = v;
      else delete site.theme.custom.bodyFont;
    });
  }

  const bindings = {
    "ticker-enabled": (v) => { setSectionVisible("ticker", v); renderSectionTree(); },
    "ticker-items": (v) => { site.ticker.items = linesToArray(v); },
    "ticker-upper": (v) => { site.ticker.uppercase = v; },
    "ticker-bold": (v) => { site.ticker.bold = v; },
    "ticker-italic": (v) => { site.ticker.italic = v; },
    "nav-separator": (v) => { site.navigation.showSeparator = v; },
    "reg-label": (v) => { site.navigation.register.label = v; },
    "reg-url": (v) => { site.navigation.register.url = v; },
    "reg-enabled": (v) => { site.navigation.register.enabled = v; },
    "reg-newtab": (v) => { site.navigation.register.openInNewTab = v; },
    "login-label": (v) => { site.navigation.login.label = v; },
    "login-url": (v) => { site.navigation.login.url = v; },
    "login-enabled": (v) => { site.navigation.login.enabled = v; },
    "login-newtab": (v) => { site.navigation.login.openInNewTab = v; },
    "hero-headline": (v) => { site.hero.headline = v; },
    "hero-features": (v) => { site.hero.features = linesToArray(v); },
    "pg-title": (v) => { site.placementGuarantee.title = v; },
    "pg-subtitle": (v) => { site.placementGuarantee.subtitle = v; },
    "jobs-enabled": (v) => { setSectionVisible("jobs", v); renderSectionTree(); },
    "jobs-title": (v) => { site.jobProfiles.title = v; },
    "jobs-items": (v) => { site.jobProfiles.items = linesToArray(v); },
    "course-enabled": (v) => { setSectionVisible("course", v); renderSectionTree(); },
    "course-badge": (v) => { site.course.badge = v; },
    "course-title": (v) => { site.course.title = v; },
    "course-subtitle": (v) => { site.course.subtitle = v; },
    "course-tags": (v) => { site.course.tags = linesToArray(v); },
    "course-about": (v) => { site.course.aboutTitle = v; },
    "course-roles-title": (v) => { site.course.rolesTitle = v; },
    "course-roles": (v) => { site.course.roles = linesToArray(v); },
    "course-syllabus-title": (v) => { site.course.syllabusTitle = v; },
    "elig-enabled": (v) => { setSectionVisible("eligibility", v); renderSectionTree(); },
    "elig-title": (v) => { site.eligibility.title = v; },
    "elig-items": (v) => { site.eligibility.items = linesToArray(v); },
    "batch-enabled": (v) => { setSectionVisible("batch", v); renderSectionTree(); },
    "batch-badge": (v) => { site.nextBatch.badge = v; },
    "batch-title": (v) => { site.nextBatch.title = v; },
    "batch-eyebrow": (v) => { site.nextBatch.cardEyebrow = v; },
    "batch-date": (v) => { site.nextBatch.dateTitle = v; },
    "batch-text": (v) => { site.nextBatch.cardText = v; },
    "batch-cta-label": (v) => { site.nextBatch.ctaLabel = v; site.community.label = v; },
    "batch-cta-url": (v) => { site.nextBatch.ctaUrl = v; site.community.url = v; },
    "community-float": (v) => {
      if (!site.community) site.community = {};
      site.community.enabled = v;
      site.community.floating = v;
    },
    "site-name": (v) => { site.siteName = v; site.meta.title = v; },
    "meta-title": (v) => { site.meta.title = v; },
    "meta-desc": (v) => { site.meta.description = v; }
  };

  Object.entries(bindings).forEach(([id, fn]) => bindField(id, fn));
  wireGotoAndLocalize();

  const structureId = activeSection === "navigation" ? "header" : activeSection;
  const canStructure = REMOVABLE_SECTIONS.includes(structureId) || structureId === "ticker";
  if (canStructure && !THEME_SECTIONS.includes(activeSection) && activeSection !== "none") {
    const structure = document.createElement("div");
    structure.className = "card card--danger-zone";
    const visible = isSectionVisible(structureId);
    structure.innerHTML = `<h3>Section</h3>
      <p class="card-desc">Hide keeps it in the tree. Remove takes it off the page (you can add it again later).</p>
      <div class="structure-actions">
        <button type="button" class="btn btn-secondary" id="structure-hide">${visible ? "Hide section" : "Show section"}</button>
        ${REMOVABLE_SECTIONS.includes(structureId) ? `<button type="button" class="btn btn-danger" id="structure-remove">Remove section</button>` : ""}
      </div>`;
    ed().appendChild(structure);
    $("#structure-hide")?.addEventListener("click", () => {
      setSectionVisible(structureId, !isSectionVisible(structureId));
      markDirty();
      renderSectionTree();
      renderEditor();
      scheduleLivePreview();
    });
    $("#structure-remove")?.addEventListener("click", () => removeSectionFromPage(structureId));
  }
}

function openThemeSection(id) {
  activeSection = id;
  selectedCanvasSection = editorToCanvasId(id);
  $("#theme-menu")?.classList.add("hidden");
  renderSectionTree();
  renderEditor();
  highlightSectionInPreview(selectedCanvasSection);
  $("#inspector-back")?.classList.remove("hidden");
}

function wireGotoAndLocalize() {
  $("#localize-images-btn")?.addEventListener("click", async () => {
    const btn = $("#localize-images-btn");
    btn.disabled = true;
    btn.textContent = "Saving images...";
    try {
      const res = await api("/api/admin/localize-images", { method: "POST", body: "{}" });
      site = res.site;
      showToast("All images saved on our server (old links no longer needed)");
      clearDirty();
      renderEditor();
      refreshPreview();
    } catch (e) {
      showToast(e.message, "error");
      btn.disabled = false;
      btn.textContent = "Save all images to our server";
    }
  });
}

async function saveSite() {
  if (!isDirty) return;
  const res = await api("/api/admin/site", { method: "PUT", body: JSON.stringify(site) });
  if (res.site) site = res.site;
  clearDirty();
  initEditHistory();
  showToast("Saved & published successfully!");
  refreshPreview();
}

async function openVersionHistory() {
  $("#theme-menu")?.classList.add("hidden");
  const modal = $("#version-history-modal");
  const list = $("#version-history-list");
  if (!modal || !list) return;
  list.innerHTML = `<p class="card-desc">Loading…</p>`;
  modal.classList.remove("hidden");
  try {
    const data = await api("/api/admin/versions");
    const versions = data.versions || [];
    if (!versions.length) {
      list.innerHTML = `<p class="card-desc">No previous publishes yet. Versions appear after you Save.</p>`;
      return;
    }
    list.innerHTML = versions.map((v) => {
      const when = v.savedAt ? new Date(v.savedAt).toLocaleString() : v.id;
      return `<div class="catalog-item catalog-item--row">
        <div>
          <strong>${escapeHtml(when)}</strong>
          <span>${escapeHtml(v.siteName || "")}</span>
        </div>
        <button type="button" class="btn btn-secondary btn-sm" data-restore-version="${escapeAttr(v.id)}">Restore</button>
      </div>`;
    }).join("");
    list.querySelectorAll("[data-restore-version]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (isDirty && !confirm("You have unsaved changes. Restore anyway?")) return;
        if (!confirm("Restore this published version? Current live content will be replaced (a new history entry is kept).")) return;
        try {
          const res = await api(`/api/admin/versions/${encodeURIComponent(btn.dataset.restoreVersion)}/restore`, {
            method: "POST",
            body: "{}"
          });
          site = res.site;
          clearDirty();
          initEditHistory();
          clearSelection();
          closeVersionHistory();
          refreshPreview();
          showToast("Version restored & published");
        } catch (e) {
          showToast(e.message, "error");
        }
      });
    });
  } catch (e) {
    list.innerHTML = `<p class="form-error">${escapeHtml(e.message)}</p>`;
  }
}

function closeVersionHistory() {
  $("#version-history-modal")?.classList.add("hidden");
}

function refreshPreview() {
  if (!previewFrame) return;
  const onLoad = () => {
    previewFrame.removeEventListener("load", onLoad);
    highlightSectionInPreview();
  };
  previewFrame.addEventListener("load", onLoad);
  previewFrame.src = "/preview?t=" + Date.now();
}

function exportBackup() {
  const blob = new Blob([JSON.stringify(site, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `nexus-site-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("Backup downloaded");
}

async function saferReset() {
  const first = confirm(
    "Restore Template will replace ALL current website content with the built-in defaults.\n\n" +
    "Tip: click Export Backup first.\n\nContinue?"
  );
  if (!first) return;

  const typed = prompt('Type RESET (all caps) to confirm you want to wipe current content:');
  if (typed !== "RESET") {
    showToast("Restore cancelled — nothing changed", "error");
    return;
  }

  const res = await api("/api/admin/reset", { method: "POST" });
  site = res.site;
  clearDirty();
  initEditHistory();
  clearSelection();
  refreshPreview();
  showToast("Restored template defaults");
}

let customCanvasWidth = 900;

function setCanvasDevice(device, widthPx) {
  canvasDevice = device;
  const wrap = $("#canvas-frame-wrap");
  if (!wrap) return;
  wrap.setAttribute("data-device", device);
  if (device === "custom") {
    if (widthPx) customCanvasWidth = Math.round(widthPx);
    wrap.style.setProperty("--canvas-custom-width", `${customCanvasWidth}px`);
  }
  document.querySelectorAll(".device-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.device === device);
  });
}

function applySectionOrderFromCanvas(order) {
  if (!Array.isArray(order) || !order.length) return;
  const cleaned = order.filter((id) => DEFAULT_SECTION_ORDER.includes(id) && id !== "contact");
  // Preserve sections that were on the page but not in the canvas order payload
  const extras = site.sectionOrder.filter((id) => id !== "contact" && !cleaned.includes(id));
  const next = [...cleaned, ...extras];
  next.push("contact");
  site.sectionOrder = next.filter((id, i, arr) => arr.indexOf(id) === i);
  markDirty();
  showToast("Section moved — click Save when ready");
  scheduleLivePreview();
  renderSectionTree();
}

function handleToolbarAction(action, sectionId) {
  if (!sectionId) return;
  const editorId = CANVAS_TO_EDITOR[sectionId] || sectionId;
  if (action === "edit") {
    selectFromCanvas(sectionId);
    return;
  }
  if (action === "hide") {
    setSectionVisible(sectionId, !isSectionVisible(sectionId));
    markDirty();
    renderSectionTree();
    scheduleLivePreview();
    return;
  }
  if (action === "remove") {
    removeSectionFromPage(sectionId === "header" ? "navigation" : sectionId);
    return;
  }
  if (action === "up") {
    moveSectionInOrder(sectionId, -1);
    return;
  }
  if (action === "down") {
    moveSectionInOrder(sectionId, 1);
    return;
  }
  if (action === "edit" || editorId) {
    selectFromCanvas(sectionId);
  }
}

function initPanelSplitter() {
  const body = $("#workspace-body");
  if (!body) return;

  function bindSplitter(el, mode) {
    if (!el) return;
    let dragging = false;
    el.addEventListener("pointerdown", (e) => {
      dragging = true;
      el.classList.add("dragging");
      el.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    el.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      const rect = body.getBoundingClientRect();
      if (mode === "tree") {
        const width = Math.min(400, Math.max(200, e.clientX - rect.left));
        body.style.setProperty("--tree-width", `${width}px`);
      } else {
        const width = Math.min(520, Math.max(260, rect.right - e.clientX));
        body.style.setProperty("--inspector-width", `${width}px`);
      }
    });
    const stop = () => {
      dragging = false;
      el.classList.remove("dragging");
    };
    el.addEventListener("pointerup", stop);
    el.addEventListener("pointercancel", stop);
  }

  bindSplitter($("#tree-splitter"), "tree");
  bindSplitter($("#panel-splitter"), "inspector");
}

function initCanvasResize() {
  const handle = $("#canvas-resize-handle");
  const wrap = $("#canvas-frame-wrap");
  const panel = $("#preview-panel");
  if (!handle || !wrap || !panel) return;

  let dragging = false;

  handle.addEventListener("pointerdown", (e) => {
    dragging = true;
    handle.classList.add("dragging");
    handle.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  handle.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const rect = panel.getBoundingClientRect();
    const pad = 24;
    const width = Math.min(rect.width - pad, Math.max(320, e.clientX - rect.left - 12));
    setCanvasDevice("custom", width);
  });
  handle.addEventListener("pointerup", () => {
    dragging = false;
    handle.classList.remove("dragging");
  });
  handle.addEventListener("pointercancel", () => {
    dragging = false;
    handle.classList.remove("dragging");
  });
}

async function initApp() {
  site = await api("/api/admin/site");
  themes = await api("/api/admin/themes");
  ensureSiteShapes();
  ensureSectionOrder();
  $("#login-screen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  previewVisible = true;
  activeSection = "none";
  selectedCanvasSection = null;
  clearDirty();
  initEditHistory();
  setCanvasDevice(canvasDevice);
  initPanelSplitter();
  initCanvasResize();
  renderSectionTree();
  renderEditor();
  document.querySelectorAll("#theme-menu [data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => openThemeSection(btn.dataset.goto));
  });
  syncLivePreview().catch(() => refreshPreview());
}

async function checkAuth() {
  const { authenticated } = await api("/api/admin/me");
  if (authenticated) await initApp();
  else {
    $("#login-screen").classList.remove("hidden");
    $("#app").classList.add("hidden");
  }
}

$("#login-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = $("#login-username").value.trim();
  const password = $("#login-password").value;
  try {
    await api("/api/admin/login", { method: "POST", body: JSON.stringify({ username, password }) });
    await initApp();
  } catch {
    const err = $("#login-error");
    err.textContent = "Invalid ID or password. Please try again.";
    err.classList.remove("hidden");
  }
});

$("#logout-btn")?.addEventListener("click", async () => {
  if (isDirty && !confirm("You have unsaved changes. Logout anyway?")) return;
  await api("/api/admin/logout", { method: "POST" });
  location.reload();
});

$("#save-btn")?.addEventListener("click", () => saveSite().catch((e) => showToast(e.message, "error")));
$("#undo-btn")?.addEventListener("click", () => undoEdit());
$("#redo-btn")?.addEventListener("click", () => redoEdit());
$("#discard-btn")?.addEventListener("click", () => discardChanges().catch((e) => showToast(e.message, "error")));
$("#history-btn")?.addEventListener("click", () => openVersionHistory().catch((e) => showToast(e.message, "error")));
$("#version-history-close")?.addEventListener("click", closeVersionHistory);
$("#version-history-modal")?.addEventListener("click", (e) => {
  if (e.target?.id === "version-history-modal") closeVersionHistory();
});
$("#media-library-btn")?.addEventListener("click", () => {
  $("#theme-menu")?.classList.add("hidden");
  window.openMediaLibrary?.((url) => {
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast("Image URL copied — paste into any image field");
  });
});
$("#reset-btn")?.addEventListener("click", () => {
  $("#theme-menu")?.classList.add("hidden");
  saferReset().catch((e) => showToast(e.message, "error"));
});
$("#export-btn")?.addEventListener("click", () => {
  $("#theme-menu")?.classList.add("hidden");
  exportBackup();
});

document.addEventListener("keydown", (e) => {
  const tag = (e.target?.tagName || "").toLowerCase();
  const typing = tag === "input" || tag === "textarea" || e.target?.isContentEditable;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
    if (typing) return;
    e.preventDefault();
    undoEdit();
  }
  if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === "y" || (e.key.toLowerCase() === "z" && e.shiftKey))) {
    if (typing) return;
    e.preventDefault();
    redoEdit();
  }
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    saveSite().catch((err) => showToast(err.message, "error"));
  }
});

$("#refresh-preview")?.addEventListener("click", () => {
  syncLivePreview().catch((e) => showToast(e.message, "error"));
});

$("#theme-menu-btn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  $("#theme-menu")?.classList.toggle("hidden");
});
document.addEventListener("click", () => $("#theme-menu")?.classList.add("hidden"));
$("#theme-menu")?.addEventListener("click", (e) => e.stopPropagation());

$("#inspector-close")?.addEventListener("click", clearSelection);
$("#inspector-back")?.addEventListener("click", clearSelection);

document.querySelectorAll(".device-btn").forEach((btn) => {
  btn.addEventListener("click", () => setCanvasDevice(btn.dataset.device));
});

window.addEventListener("message", (e) => {
  const data = e.data || {};
  if (data.type === "nexus-select" && data.section) {
    selectFromCanvas(data.section);
  }
  if (data.type === "nexus-reorder" && Array.isArray(data.order)) {
    applySectionOrderFromCanvas(data.order);
  }
  if (data.type === "nexus-toolbar" && data.action) {
    handleToolbarAction(data.action, data.section);
  }
  if (data.type === "nexus-ready") {
    highlightSectionInPreview();
  }
});

$("#add-section-btn")?.addEventListener("click", openSectionCatalog);
$("#section-catalog-close")?.addEventListener("click", closeSectionCatalog);
$("#section-catalog-modal")?.addEventListener("click", (e) => {
  if (e.target?.id === "section-catalog-modal") closeSectionCatalog();
});

window.addEventListener("beforeunload", (e) => {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

checkAuth();
window.showToast = showToast;
window.markDirty = markDirty;
