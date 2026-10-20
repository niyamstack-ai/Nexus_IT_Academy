const DAILY_SECTIONS = [
  { id: "quick", icon: "⚡", title: "Quick Updates", desc: "Weekly edits in one place — batch, fees, ticker, alumni, hero" },
  { id: "ticker", icon: "📢", title: "Announcement Bar", desc: "Scrolling highlights" },
  { id: "batch", icon: "📅", title: "Next Batch", desc: "Date, time & Join Community" },
  { id: "fees", icon: "💰", title: "Fee Structure", desc: "Pay-after-placement pricing" },
  { id: "alumni", icon: "🎓", title: "Alumni Spotlight", desc: "Student placement photos" },
  { id: "hero", icon: "🎯", title: "Hero Section", desc: "Main headline and bullets" },
  { id: "course", icon: "📘", title: "Course / Syllabus", desc: "Modules, roles, skill tags" }
];

const ADVANCED_SECTIONS = [
  { id: "navigation", icon: "🔗", title: "Register & Login", desc: "Button labels and external links" },
  { id: "partners", icon: "🏢", title: "Hiring Partners", desc: "Company logo carousel" },
  { id: "journey", icon: "🛤️", title: "Journey Steps", desc: "Your Journey at Nexus IT" },
  { id: "guarantee", icon: "✅", title: "Placement Guarantee", desc: "90 days guarantee section" },
  { id: "jobs", icon: "💼", title: "Job Profiles", desc: "Optional multi-profile cards" },
  { id: "eligibility", icon: "📋", title: "Eligibility", desc: "Who can apply" },
  { id: "contact", icon: "📞", title: "Contact & Footer", desc: "Address, phone, email, logos" },
  { id: "themes", icon: "🎨", title: "Themes & Design", desc: "Colors, fonts, coaching themes" },
  { id: "domain", icon: "🌐", title: "Domain & Go Live", desc: "Connect custom domain to VPS" },
  { id: "settings", icon: "⚙️", title: "Site Settings", desc: "Site name, logo, SEO meta" }
];

const SECTIONS = [...DAILY_SECTIONS, ...ADVANCED_SECTIONS];

let site = null;
let themes = { presets: [], fonts: [] };
let activeSection = "quick";
let isDirty = false;
let advancedOpen = false;
let previewVisible = false;
/** Keep current site fonts when applying a color theme */
let lockFontsOnThemeChange = true;

const $ = (sel) => document.querySelector(sel);
const editor = $("#editor-panel");
const previewFrame = $("#preview-frame");

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
  if (isDirty) return;
  isDirty = true;
  $("#unsaved-badge")?.classList.remove("hidden");
  $("#save-btn")?.classList.add("btn-pulse");
}

function clearDirty() {
  isDirty = false;
  $("#unsaved-badge")?.classList.add("hidden");
  $("#save-btn")?.classList.remove("btn-pulse");
}

async function refreshDomainGuide() {
  const guide = $("#domain-guide");
  if (!guide) return;

  try {
    await saveSiteQuiet();
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

async function saveSiteQuiet() {
  await api("/api/admin/site", { method: "PUT", body: JSON.stringify(site) });
}

function linesToArray(text) {
  return text.split("\n").map((s) => s.trim()).filter(Boolean);
}

function arrayToLines(arr) {
  return (arr || []).join("\n");
}

function navButton(s) {
  return `<button type="button" class="nav-item${s.id === activeSection ? " active" : ""}" data-section="${s.id}">
      <span>${s.icon}</span><span>${s.title}</span>
    </button>`;
}

function renderNav() {
  const dailyHtml = DAILY_SECTIONS.map(navButton).join("");
  const advancedHtml = ADVANCED_SECTIONS.map(navButton).join("");
  $("#sidebar-nav").innerHTML = `
    <div class="nav-group-label">Daily edit</div>
    ${dailyHtml}
    <button type="button" class="nav-toggle" id="advanced-toggle" aria-expanded="${advancedOpen}">
      <span>${advancedOpen ? "▾" : "▸"} More options</span>
    </button>
    <div class="nav-advanced${advancedOpen ? " open" : ""}" id="nav-advanced">
      ${advancedHtml}
    </div>`;

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSection = btn.dataset.section;
      if (ADVANCED_SECTIONS.some((s) => s.id === activeSection)) advancedOpen = true;
      renderNav();
      renderEditor();
      closeMobileMenu();
    });
  });

  $("#advanced-toggle")?.addEventListener("click", () => {
    advancedOpen = !advancedOpen;
    renderNav();
  });
}

function closeMobileMenu() {
  $("#sidebar")?.classList.remove("open");
  $("#sidebar-backdrop")?.classList.add("hidden");
}

function openMobileMenu() {
  $("#sidebar")?.classList.add("open");
  $("#sidebar-backdrop")?.classList.remove("hidden");
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
        input.placeholder = f.placeholder || "";
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

function renderQuickUpdates() {
  ensureSiteShapes();
  const wrap = document.createElement("div");
  wrap.className = "quick-updates";

  wrap.innerHTML = `
    <div class="card quick-hero-card">
      <h3>This week’s checklist</h3>
      <p class="card-desc">Edit these, then click <strong>Save &amp; Publish</strong>. Preview stays hidden so you have more room — use “Show Preview” when you want a check.</p>
      <div class="quick-jump">
        <a href="#quick-batch" class="btn btn-ghost btn-sm">Batch</a>
        <a href="#quick-fees" class="btn btn-ghost btn-sm">Fees</a>
        <a href="#quick-ticker" class="btn btn-ghost btn-sm">Ticker</a>
        <a href="#quick-alumni" class="btn btn-ghost btn-sm">Alumni</a>
        <a href="#quick-hero" class="btn btn-ghost btn-sm">Hero</a>
        <a href="#quick-syllabus" class="btn btn-ghost btn-sm">Syllabus</a>
      </div>
    </div>

    <div class="card" id="quick-batch">
      <h3>📅 Next Batch & Join Community</h3>
      ${field("Date / time", site.nextBatch.dateTitle || "", "text", "q-batch-date")}
      ${field("Card text", site.nextBatch.cardText || "", "text", "q-batch-text")}
      ${field("Button label", site.nextBatch.ctaLabel || "JOIN COMMUNITY", "text", "q-batch-cta-label")}
      ${field("WhatsApp / Community URL", site.nextBatch.ctaUrl || "", "url", "q-batch-cta-url")}
      ${field("Show floating JOIN COMMUNITY button", site.community.floating === true, "checkbox", "q-community-float")}
    </div>

    <div class="card" id="quick-fees">
      <h3>💰 Fee Structure</h3>
      ${field("Section title", site.feeStructure.title || "", "text", "q-fee-title")}
      ${field("Subtitle", site.feeStructure.subtitle || "", "text", "q-fee-subtitle")}
      ${field("Total fees label", site.feeStructure.totalLabel || "", "text", "q-fee-total")}
      <div id="q-fee-steps"></div>
    </div>

    <div class="card" id="quick-ticker">
      <h3>📢 Announcement Bar</h3>
      ${field("Ticker items (one per line)", arrayToLines(site.ticker.items), "textarea", "q-ticker-items")}
      <p class="card-desc">Example: 🧑‍🎓 100+ Genuine Placement</p>
    </div>

    <div class="card" id="quick-alumni">
      <h3>🎓 Alumni Spotlight</h3>
      <p class="card-desc">Drag ⋮⋮ to reorder. Add or remove stories anytime. Aim for 4 cards on the live site.</p>
      <div id="q-alumni-list"></div>
    </div>

    <div class="card" id="quick-hero">
      <h3>🎯 Hero</h3>
      ${field("Headline", site.hero.headline || "", "text", "q-hero-headline")}
      ${field("Feature bullets (one per line)", arrayToLines(site.hero.features), "textarea", "q-hero-features")}
    </div>

    <div class="card" id="quick-syllabus">
      <h3>📘 Syllabus modules</h3>
      <p class="card-desc">Each module: title + bullets (one per line). Drag to reorder.</p>
      <div id="q-syllabus-list"></div>
    </div>

    <div class="card">
      <h3>More</h3>
      <div class="field-grid-2">
        <button type="button" class="btn btn-secondary" data-goto="navigation">Register / Login links</button>
        <button type="button" class="btn btn-secondary" data-goto="partners">Hiring partners</button>
        <button type="button" class="btn btn-secondary" data-goto="contact">Contact & footer</button>
        <button type="button" class="btn btn-secondary" data-goto="themes">Themes & fonts</button>
        <button type="button" class="btn btn-primary" id="localize-images-btn">Save all images to our server</button>
      </div>
    </div>`;

  editor.appendChild(wrap);

  bindField("q-batch-date", (v) => { site.nextBatch.dateTitle = v; });
  bindField("q-batch-text", (v) => { site.nextBatch.cardText = v; });
  bindField("q-batch-cta-label", (v) => { site.nextBatch.ctaLabel = v; site.community.label = v; });
  bindField("q-batch-cta-url", (v) => { site.nextBatch.ctaUrl = v; site.community.url = v; });
  bindField("q-community-float", (v) => {
    site.community.enabled = v;
    site.community.floating = v;
  });
  bindField("q-fee-title", (v) => { site.feeStructure.title = v; });
  bindField("q-fee-subtitle", (v) => { site.feeStructure.subtitle = v; });
  bindField("q-fee-total", (v) => { site.feeStructure.totalLabel = v; });
  bindField("q-ticker-items", (v) => { site.ticker.items = linesToArray(v); });
  bindField("q-hero-headline", (v) => { site.hero.headline = v; });
  bindField("q-hero-features", (v) => { site.hero.features = linesToArray(v); });

  $("#q-fee-steps")?.appendChild(listField("Fee step", site.feeStructure.steps, [
    { key: "label", label: "Step label" },
    { key: "title", label: "Amount / title" },
    { key: "description", label: "Description", type: "textarea" }
  ], () => {}));

  $("#q-alumni-list")?.appendChild(listField("Story", site.alumni.items, [
    { key: "image", label: "Photo", type: "image", preset: "alumni" },
    { key: "alt", label: "Caption / student name" }
  ], () => {}, { addLabel: "+ Add alumni story", hint: "Tip: 4 stories looks best on desktop." }));

  site.course.modules.forEach((m) => {
    if (!m.itemsText) m.itemsText = arrayToLines(m.items || []);
  });
  $("#q-syllabus-list")?.appendChild(listField("Module", site.course.modules, [
    { key: "title", label: "Module title" },
    { key: "itemsText", label: "Bullets (one per line)", type: "textarea" }
  ], () => {
    site.course.modules.forEach((m) => {
      if (typeof m.itemsText === "string") m.items = linesToArray(m.itemsText);
    });
  }, { addLabel: "+ Add syllabus module" }));
}

function renderEditor() {
  const section = SECTIONS.find((s) => s.id === activeSection);
  $("#panel-title").textContent = section.title;
  $("#panel-desc").textContent = section.desc;

  editor.innerHTML = "";
  let html = "";

  if (activeSection === "quick") {
    renderQuickUpdates();
    wireGotoAndLocalize();
    return;
  }

  if (activeSection === "ticker") {
    html = `<div class="card"><h3>Scrolling Announcement Bar</h3>
      ${field("Enabled", site.ticker?.enabled !== false, "checkbox", "ticker-enabled")}
      ${field("Scroll speed (seconds)", site.ticker?.speed || 75, "number", "ticker-speed")}
      ${field("Ticker items (one per line)", arrayToLines(site.ticker?.items), "textarea", "ticker-items")}
      <p class="card-desc">Example: 🧑‍🎓 100+ Genuine Placement — update anytime when numbers change.</p>
    </div>`;
  }

  if (activeSection === "navigation") {
    html = `<div class="card"><h3>Register Button</h3>
      ${field("Label", site.navigation?.register?.label, "text", "reg-label")}
      ${field("URL (Classplus / course store)", site.navigation?.register?.url, "url", "reg-url")}
      ${field("Enable link", site.navigation?.register?.enabled, "checkbox", "reg-enabled")}
      ${field("Open in new tab", site.navigation?.register?.openInNewTab, "checkbox", "reg-newtab")}
    </div>
    <div class="card"><h3>Login Training Program Button</h3>
      ${field("Label", site.navigation?.login?.label, "text", "login-label")}
      ${field("URL (Classplus login)", site.navigation?.login?.url, "url", "login-url")}
      ${field("Enable link", site.navigation?.login?.enabled, "checkbox", "login-enabled")}
      ${field("Open in new tab", site.navigation?.login?.openInNewTab, "checkbox", "login-newtab")}
      <p class="card-desc">Disable links to show text only. Change URL when switching from Classplus to another platform.</p>
    </div>`;
  }

  if (activeSection === "hero") {
    html = `<div class="card"><h3>Hero Section</h3>
      ${field("Headline", site.hero?.headline, "text", "hero-headline")}
      ${field("Feature bullets (one per line)", arrayToLines(site.hero?.features), "textarea", "hero-features")}
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
    html = `<div class="card"><h3>Next Batch Launch</h3>
      ${field("Show next batch section", site.nextBatch.enabled !== false, "checkbox", "batch-enabled")}
      ${field("Badge text", site.nextBatch.badge || "Registration", "text", "batch-badge")}
      ${field("Main title", site.nextBatch.title || "⚡️ Next Batch Launch", "text", "batch-title")}
      ${field("Card eyebrow", site.nextBatch.cardEyebrow || "Attend our Demo session", "text", "batch-eyebrow")}
      ${field("Date / time", site.nextBatch.dateTitle || "", "text", "batch-date")}
      ${field("Card text", site.nextBatch.cardText || "", "text", "batch-text")}
      ${field("Button label", site.nextBatch.ctaLabel || "JOIN COMMUNITY", "text", "batch-cta-label")}
      ${field("Button / WhatsApp URL", site.nextBatch.ctaUrl || "", "url", "batch-cta-url")}
    </div>
    <div class="card"><h3>Floating WhatsApp Button</h3>
      ${field("Show floating JOIN COMMUNITY button", site.community.floating === true, "checkbox", "community-float")}
      <p class="card-desc">Keep this OFF so visitors read Eligibility and full details first. Join Community stays only in the Next Batch section.</p>
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

  if (html) editor.innerHTML = html;

  if (activeSection === "settings") {
    $("#wrap-site-logo")?.appendChild(createImageField("Site Logo (upload and crop)", site.logo, "logo", (v) => { site.logo = v; markDirty(); }));
    $("#wrap-footer-logo")?.appendChild(createImageField("Footer Logo (upload and crop)", site.footerLogo, "footerLogo", (v) => { site.footerLogo = v; markDirty(); }));
  }

  if (activeSection === "partners") {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Hiring Partners Logos</h3>${field("Section title", site.hiringPartners?.title, "text", "hp-title")}`;
    editor.appendChild(card);
    bindField("hp-title", (v) => { site.hiringPartners.title = v; });
    card.appendChild(listField("Logo", site.hiringPartners.logos, [
      { key: "url", label: "Company logo", type: "image", preset: "partnerLogo" },
      { key: "alt", label: "Company name (alt text)" }
    ], () => {}));
  }

  if (activeSection === "alumni") {
    ensureSiteShapes();
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Alumni Spotlight</h3>
      ${field("Section title", site.alumni?.title || "Alumni Spotlight", "text", "alumni-title")}
      ${field("Carousel speed (seconds)", site.alumni?.autoplaySeconds || 5, "number", "alumni-speed")}
      <p class="card-desc">Upload success story photos. Drag ⋮⋮ to reorder. Use Remove to delete a card.</p>`;
    editor.appendChild(card);
    bindField("alumni-title", (v) => { site.alumni.title = v; });
    bindField("alumni-speed", (v) => { site.alumni.autoplaySeconds = parseInt(v, 10) || 5; });
    card.appendChild(listField("Story", site.alumni.items, [
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
    card.innerHTML = `<h3>Syllabus Modules</h3>`;
    editor.appendChild(card);
    card.appendChild(listField("Module", site.course.modules, [
      { key: "title", label: "Module title" },
      { key: "itemsText", label: "Bullets (one per line)", type: "textarea" }
    ], () => {
      site.course.modules.forEach((m) => {
        if (typeof m.itemsText === "string") m.items = linesToArray(m.itemsText);
      });
    }));
  }

  if (activeSection === "journey") {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Journey Steps</h3>${field("Section title", site.journey?.title, "text", "journey-title")}`;
    editor.appendChild(card);
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
    card.innerHTML = `<h3>Fee Structure</h3>
      ${field("Section title", site.feeStructure?.title, "text", "fee-title")}
      ${field("Subtitle", site.feeStructure?.subtitle, "text", "fee-subtitle")}
      ${field("Total fees label", site.feeStructure?.totalLabel, "text", "fee-total")}`;
    editor.appendChild(card);
    bindField("fee-title", (v) => { site.feeStructure.title = v; });
    bindField("fee-subtitle", (v) => { site.feeStructure.subtitle = v; });
    bindField("fee-total", (v) => { site.feeStructure.totalLabel = v; });
    card.appendChild(listField("Fee step", site.feeStructure.steps, [
      { key: "label", label: "Step label" },
      { key: "title", label: "Amount / title" },
      { key: "description", label: "Description", type: "textarea" }
    ], () => {}));
  }

  if (activeSection === "contact") {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Contact Information</h3>
      ${field("Section title", site.contact?.title, "text", "contact-title")}
      ${field("Address", site.contact?.address, "textarea", "contact-address")}
      ${field("Phone", site.contact?.phone, "text", "contact-phone")}
      ${field("Email", site.contact?.email, "email", "contact-email")}`;
    editor.appendChild(card);
    bindField("contact-title", (v) => { site.contact.title = v; });
    bindField("contact-address", (v) => { site.contact.address = v; });
    bindField("contact-phone", (v) => { site.contact.phone = v; });
    bindField("contact-email", (v) => { site.contact.email = v; });

    const card2 = document.createElement("div");
    card2.className = "card";
    card2.innerHTML = `<h3>Footer Partner Logos</h3>${field("Section title", site.footerPartners?.title, "text", "fp-title")}`;
    editor.appendChild(card2);
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
    editor.innerHTML = html;

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
    editor.innerHTML = html;

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
    "ticker-speed": (v) => { site.ticker.speed = parseInt(v, 10) || 75; },
    "ticker-items": (v) => { site.ticker.items = linesToArray(v); },
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

function wireGotoAndLocalize() {
  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSection = btn.dataset.goto;
      if (ADVANCED_SECTIONS.some((s) => s.id === activeSection)) advancedOpen = true;
      renderNav();
      renderEditor();
      closeMobileMenu();
    });
  });

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
  activeSection = "quick";
  renderNav();
  renderEditor();
  refreshPreview();
  showToast("Restored template defaults");
}

function syncPreviewToggleLabel() {
  const btn = $("#preview-toggle");
  if (!btn) return;
  btn.textContent = previewVisible ? "Hide Preview" : "Show Preview";
}

async function initApp() {
  site = await api("/api/admin/site");
  themes = await api("/api/admin/themes");
  ensureSiteShapes();
  $("#login-screen").classList.add("hidden");
  $("#app").classList.remove("hidden");
  previewVisible = false;
  $("#workspace-body")?.classList.add("preview-hidden");
  syncPreviewToggleLabel();
  clearDirty();
  renderNav();
  renderEditor();
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

$("#logout-btn").addEventListener("click", async () => {
  if (isDirty && !confirm("You have unsaved changes. Logout anyway?")) return;
  await api("/api/admin/logout", { method: "POST" });
  location.reload();
});

$("#save-btn").addEventListener("click", () => saveSite().catch((e) => showToast(e.message, "error")));
$("#reset-btn").addEventListener("click", () => saferReset().catch((e) => showToast(e.message, "error")));
$("#export-btn")?.addEventListener("click", exportBackup);

$("#refresh-preview").addEventListener("click", refreshPreview);
$("#preview-toggle").addEventListener("click", () => {
  previewVisible = !previewVisible;
  $("#workspace-body")?.classList.toggle("preview-hidden", !previewVisible);
  syncPreviewToggleLabel();
  if (previewVisible) refreshPreview();
});

$("#menu-toggle")?.addEventListener("click", openMobileMenu);
$("#sidebar-backdrop")?.addEventListener("click", closeMobileMenu);

window.addEventListener("beforeunload", (e) => {
  if (!isDirty) return;
  e.preventDefault();
  e.returnValue = "";
});

checkAuth();
window.showToast = showToast;
window.markDirty = markDirty;
