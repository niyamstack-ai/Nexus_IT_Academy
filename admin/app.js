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

const $ = (sel) => document.querySelector(sel);
const previewFrame = $("#preview-frame");
function ed() {
  return $("#editor-panel");
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
  if (!isDirty) {
    isDirty = true;
    $("#unsaved-badge")?.classList.remove("hidden");
    $("#save-btn")?.classList.add("btn-pulse");
  }
  scheduleLivePreview();
}

function clearDirty() {
  isDirty = false;
  $("#unsaved-badge")?.classList.add("hidden");
  $("#save-btn")?.classList.remove("btn-pulse");
}

function ensureSectionOrder() {
  if (!Array.isArray(site.sectionOrder) || !site.sectionOrder.length) {
    site.sectionOrder = DEFAULT_SECTION_ORDER.slice();
  }
  for (const id of DEFAULT_SECTION_ORDER) {
    if (!site.sectionOrder.includes(id)) site.sectionOrder.push(id);
  }
  site.sectionOrder = site.sectionOrder.filter((id) => DEFAULT_SECTION_ORDER.includes(id));
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
  const grip = opts.draggable ? `<span class="tree-grip" data-drag="${id}">⋮⋮</span>` : `<span class="tree-grip">·</span>`;
  return `<button type="button" class="tree-item${active}" data-section="${id}">${grip}<span>${title}</span></button>`;
}

function renderSectionTree() {
  ensureSectionOrder();
  const tree = $("#section-tree");
  if (!tree) return;

  const templateItems = site.sectionOrder
    .filter((id) => id !== "contact")
    .map((id) => treeItemHtml(id, SECTION_LABELS[id] || id, { draggable: true }))
    .join("");

  tree.innerHTML = `
    <div class="tree-group-label">Header</div>
    ${HEADER_TREE.map((s) => treeItemHtml(s.id, s.title)).join("")}
    <div class="tree-group-label">Template</div>
    ${templateItems}
    <div class="tree-group-label">Footer</div>
    ${FOOTER_TREE.map((s) => treeItemHtml(s.id, s.title)).join("")}
  `;

  tree.querySelectorAll(".tree-item").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      if (e.target.closest("[data-drag]")) return;
      const id = btn.dataset.section;
      activeSection = id;
      selectedCanvasSection = editorToCanvasId(id) || (id === "navigation" ? "header" : id);
      renderSectionTree();
      renderEditor();
      highlightSectionInPreview(selectedCanvasSection);
      if (selectedCanvasSection && previewFrame?.contentWindow) {
        previewFrame.contentWindow.postMessage({ type: "nexus-scroll", section: selectedCanvasSection }, "*");
      }
      $("#inspector-back")?.classList.remove("hidden");
    });
  });

  // Drag reorder template sections in the tree
  let dragId = null;
  tree.querySelectorAll("[data-drag]").forEach((grip) => {
    const row = grip.closest(".tree-item");
    row.draggable = true;
    row.addEventListener("dragstart", (e) => {
      dragId = grip.dataset.drag;
      e.dataTransfer.setData("text/plain", dragId);
    });
    row.addEventListener("dragend", () => {
      dragId = null;
      tree.querySelectorAll(".drag-over").forEach((n) => n.classList.remove("drag-over"));
    });
    row.addEventListener("dragover", (e) => {
      if (!dragId) return;
      e.preventDefault();
      row.classList.add("drag-over");
    });
    row.addEventListener("dragleave", () => row.classList.remove("drag-over"));
    row.addEventListener("drop", (e) => {
      e.preventDefault();
      row.classList.remove("drag-over");
      const fromId = e.dataTransfer.getData("text/plain") || dragId;
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
      if (!order.includes("contact") && site.sectionOrder.includes("contact")) order.push("contact");
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
    return `<label><span>${label}</span><input type="color" id="${fieldId}" value="${value || "#bc0d5d"}"></label>`;
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
  const v = value ?? min;
  return `<label class="range-field"><span>${label} <em id="${id}-val">${v}${suffix}</em></span>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${v}"></label>`;
}

function bindRange(id, onChange, suffix = "") {
  const el = document.getElementById(id);
  const label = document.getElementById(`${id}-val`);
  if (!el) return;
  el.addEventListener("input", () => {
    if (label) label.textContent = `${el.value}${suffix}`;
    onChange(el.value);
    markDirty();
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
  const evt = el.type === "checkbox" ? "change" : "input";
  el.addEventListener(evt, () => {
    onChange(el.type === "checkbox" ? el.checked : el.value);
    markDirty();
  });
}

function ensureSiteShapes() {
  if (!site.ticker) site.ticker = { enabled: true, items: [], speed: 75 };
  if (!site.alumni) site.alumni = { title: "Alumni Spotlight", items: [], autoplaySeconds: 5 };
  if (!site.alumni.items) site.alumni.items = [];
  if (!site.nextBatch) site.nextBatch = { enabled: true };
  if (!site.community) site.community = { enabled: true, floating: false };
  if (!site.feeStructure) site.feeStructure = { title: "", subtitle: "", totalLabel: "", steps: [] };
  if (!site.feeStructure.steps) site.feeStructure.steps = [];
  if (!site.hero) site.hero = { headline: "", features: [] };
  if (!site.course) site.course = { enabled: true, tags: [], roles: [], modules: [] };
  if (!site.course.modules) site.course.modules = [];
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
      ${field("Heading color", site.hero.headlineColor || "#ffffff", "color", "hero-color")}
      ${rangeField("Heading size (desktop)", "hero-size-d", site.hero.headlineSizeDesktop || 48, 24, 72, 1, " px")}
      ${rangeField("Heading size (mobile)", "hero-size-m", site.hero.headlineSizeMobile || 24, 16, 48, 1, " px")}
      ${rangeField("Spacing after heading", "hero-spacing", site.hero.spacingAfterHeading ?? 28, 0, 80, 2, " px")}
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
    bindRange("hero-size-d", (v) => { site.hero.headlineSizeDesktop = parseInt(v, 10) || 48; }, " px");
    bindRange("hero-size-m", (v) => { site.hero.headlineSizeMobile = parseInt(v, 10) || 24; }, " px");
    bindRange("hero-spacing", (v) => { site.hero.spacingAfterHeading = parseInt(v, 10) || 0; }, " px");
  }

  if (activeSection === "partners") {
    if (!site.hiringPartners) site.hiringPartners = { title: "", logos: [] };
    const styleCard = document.createElement("div");
    styleCard.className = "card";
    styleCard.innerHTML = `<h3>Heading</h3>
      ${field("Section title", site.hiringPartners.title, "text", "hp-title")}
      ${selectField("Heading alignment", "hp-align", site.hiringPartners.headingAlign || "center", [["left", "Left"], ["center", "Center"], ["right", "Right"]])}
      ${rangeField("Heading size", "hp-size", site.hiringPartners.headingSize || 28, 18, 48, 1, " px")}`;
    ed().appendChild(styleCard);
    bindField("hp-title", (v) => { site.hiringPartners.title = v; });
    bindRange("hp-size", (v) => { site.hiringPartners.headingSize = parseInt(v, 10) || 28; }, " px");
    $("#hp-align")?.addEventListener("change", (e) => { site.hiringPartners.headingAlign = e.target.value; markDirty(); });

    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Logos</h3><p class="card-desc">Add, replace, or remove partner logos. Drag ⋮⋮ to reorder.</p>`;
    ed().appendChild(card);
    card.appendChild(listField("Logo", site.hiringPartners.logos, [
      { key: "url", label: "Company logo", type: "image", preset: "partnerLogo" },
      { key: "alt", label: "Company name" },
      { key: "link", label: "Optional link URL", placeholder: "https://" }
    ], () => {}));
  }

  if (activeSection === "alumni") {
    ensureSiteShapes();
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Content</h3>
      ${field("Section title", site.alumni?.title || "Alumni Spotlight", "text", "alumni-title")}
      ${rangeField("Mobile carousel speed", "alumni-speed", site.alumni?.autoplaySeconds || 5, 2, 15, 1, "s")}
      <p class="card-desc">Desktop shows a grid. Mobile uses the carousel.</p>`;
    ed().appendChild(card);
    bindField("alumni-title", (v) => { site.alumni.title = v; });
    bindRange("alumni-speed", (v) => { site.alumni.autoplaySeconds = parseInt(v, 10) || 5; }, "s");

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

    const fontOptions = themes.fonts.map((f) =>
      `<option value="${f.id}" ${site.theme?.custom?.fontPreset === f.id ? "selected" : ""}>${f.label}</option>`
    ).join("");

    html = `<div class="card"><h3>Coaching Theme Gallery</h3>
      <p class="card-desc">Pick a theme for colors. Your current font stays locked unless you change it below.</p>
      ${field("Keep current fonts when changing theme", lockFontsOnThemeChange, "checkbox", "lock-fonts")}
      <div class="theme-grid">${themeCards}</div>
    </div>
    <div class="card"><h3>Custom Colors</h3>
      <div class="color-grid">
        ${field("Primary accent", site.theme?.custom?.colors?.primary || "", "color", "c-primary")}
        ${field("Hero background", site.theme?.custom?.colors?.heroBg || "", "color", "c-hero")}
        ${field("Ticker background", site.theme?.custom?.colors?.tickerBg || "", "color", "c-ticker")}
        ${field("Journey section bg", site.theme?.custom?.colors?.journeyBg || "", "color", "c-journey")}
      </div>
    </div>
    <div class="card"><h3>Fonts</h3>
      <label><span>Font preset</span><select id="font-preset">${fontOptions}</select></label>
      <p class="card-desc">Nexus live site uses Arsenal + Roboto Condensed. Prefer that preset for parity with nexusitacad.com.</p>
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
      bindField(id, (v) => {
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
  }

  const bindings = {
    "ticker-enabled": (v) => { site.ticker.enabled = v; },
    "ticker-items": (v) => { site.ticker.items = linesToArray(v); },
    "ticker-upper": (v) => { site.ticker.uppercase = v; },
    "ticker-bold": (v) => { site.ticker.bold = v; },
    "ticker-italic": (v) => { site.ticker.italic = v; },
    "nav-separator": (v) => { site.navigation.showSeparator = v; },
    "hero-color": (v) => { site.hero.headlineColor = v; },
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
    "jobs-enabled": (v) => { site.jobProfiles.enabled = v; },
    "jobs-title": (v) => { site.jobProfiles.title = v; },
    "jobs-items": (v) => { site.jobProfiles.items = linesToArray(v); },
    "course-enabled": (v) => { site.course.enabled = v; },
    "course-badge": (v) => { site.course.badge = v; },
    "course-title": (v) => { site.course.title = v; },
    "course-subtitle": (v) => { site.course.subtitle = v; },
    "course-tags": (v) => { site.course.tags = linesToArray(v); },
    "course-about": (v) => { site.course.aboutTitle = v; },
    "course-roles-title": (v) => { site.course.rolesTitle = v; },
    "course-roles": (v) => { site.course.roles = linesToArray(v); },
    "course-syllabus-title": (v) => { site.course.syllabusTitle = v; },
    "elig-enabled": (v) => { site.eligibility.enabled = v; },
    "elig-title": (v) => { site.eligibility.title = v; },
    "elig-items": (v) => { site.eligibility.items = linesToArray(v); },
    "batch-enabled": (v) => { site.nextBatch.enabled = v; },
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
  await api("/api/admin/site", { method: "PUT", body: JSON.stringify(site) });
  clearDirty();
  showToast("Saved & published successfully!");
  refreshPreview();
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
  const cleaned = order.filter((id) => DEFAULT_SECTION_ORDER.includes(id));
  for (const id of DEFAULT_SECTION_ORDER) {
    if (!cleaned.includes(id)) cleaned.push(id);
  }
  site.sectionOrder = cleaned;
  markDirty();
  showToast("Section moved — click Save & Publish when ready");
  scheduleLivePreview();
  renderSectionTree();
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
$("#reset-btn")?.addEventListener("click", () => {
  $("#theme-menu")?.classList.add("hidden");
  saferReset().catch((e) => showToast(e.message, "error"));
});
$("#export-btn")?.addEventListener("click", () => {
  $("#theme-menu")?.classList.add("hidden");
  exportBackup();
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
  if (data.type === "nexus-ready") {
    highlightSectionInPreview();
  }
});

window.addEventListener("beforeunload", (e) => {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

checkAuth();
window.showToast = showToast;
window.markDirty = markDirty;
