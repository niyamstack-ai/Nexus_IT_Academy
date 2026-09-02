const SECTIONS = [
  { id: "dashboard", icon: "📊", title: "Dashboard", desc: "Overview & quick actions" },
  { id: "ticker", icon: "📢", title: "Announcement Bar", desc: "Scrolling highlights (100+ placements, etc.)" },
  { id: "navigation", icon: "🔗", title: "Register & Login", desc: "Button labels and external links" },
  { id: "hero", icon: "🎯", title: "Hero Section", desc: "Main headline and feature bullets" },
  { id: "partners", icon: "🏢", title: "Hiring Partners", desc: "Company logo carousel" },
  { id: "alumni", icon: "🎓", title: "Alumni / Success Stories", desc: "Student placement photos" },
  { id: "journey", icon: "🛤️", title: "Journey Steps", desc: "Your Journey at Nexus IT" },
  { id: "guarantee", icon: "✅", title: "Placement Guarantee", desc: "100 days guarantee section" },
  { id: "jobs", icon: "💼", title: "Job Profiles", desc: "Courses and placement profiles" },
  { id: "fees", icon: "💰", title: "Fee Structure", desc: "Pay-after-placement pricing" },
  { id: "contact", icon: "📞", title: "Contact & Footer", desc: "Address, phone, email, footer logos" },
  { id: "themes", icon: "🎨", title: "Themes & Design", desc: "Colors, fonts, coaching themes" },
  { id: "domain", icon: "🌐", title: "Domain & Go Live", desc: "Connect nexusitacad.com to your VPS" },
  { id: "settings", icon: "⚙️", title: "Site Settings", desc: "Site name, logo, SEO meta" }
];

let site = null;
let themes = { presets: [], fonts: [] };
let activeSection = "dashboard";

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

function renderNav() {
  $("#sidebar-nav").innerHTML = SECTIONS.map(
    (s) => `<button type="button" class="nav-item${s.id === activeSection ? " active" : ""}" data-section="${s.id}">
      <span>${s.icon}</span><span>${s.title}</span>
    </button>`
  ).join("");

  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSection = btn.dataset.section;
      renderNav();
      renderEditor();
      closeMobileMenu();
    });
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

function listField(label, items, fields, onChange) {
  const wrap = document.createElement("div");
  wrap.className = "list-editor";

  function render() {
    wrap.innerHTML = "";
    items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "list-item";
      const fieldsDiv = document.createElement("div");
      fieldsDiv.className = "list-item-fields";

      fields.forEach((f) => {
        if (f.type === "image") {
          const imgField = createImageField(f.label, item[f.key] || "", f.preset || "partnerLogo", (url) => {
            item[f.key] = url;
            onChange();
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
      up.onclick = () => { items.splice(index - 1, 0, items.splice(index, 1)[0]); onChange(); render(); };

      const down = document.createElement("button");
      down.type = "button";
      down.className = "btn btn-ghost btn-sm";
      down.textContent = "↓";
      down.disabled = index === items.length - 1;
      down.onclick = () => { items.splice(index + 1, 0, items.splice(index, 1)[0]); onChange(); render(); };

      const del = document.createElement("button");
      del.type = "button";
      del.className = "btn btn-danger btn-sm";
      del.textContent = "✕";
      del.onclick = () => { items.splice(index, 1); onChange(); render(); };

      actions.append(up, down, del);
      row.append(fieldsDiv, actions);
      wrap.appendChild(row);
    });

    const add = document.createElement("button");
    add.type = "button";
    add.className = "btn btn-secondary";
    add.textContent = `+ Add ${label}`;
    add.onclick = () => {
      const empty = {};
      fields.forEach((f) => (empty[f.key] = ""));
      items.push(empty);
      onChange();
      render();
    };
    wrap.appendChild(add);
  }

  render();
  return wrap;
}

function field(label, value, type = "text", id = null) {
  const fieldId = id || "f_" + Math.random().toString(36).slice(2);
  if (type === "textarea") {
    return `<label><span>${label}</span><textarea id="${fieldId}">${value || ""}</textarea></label>`;
  }
  if (type === "color") {
    return `<label><span>${label}</span><input type="color" id="${fieldId}" value="${value || "#bc0d5d"}"></label>`;
  }
  if (type === "checkbox") {
    return `<label class="checkbox-row"><input type="checkbox" id="${fieldId}" ${value ? "checked" : ""}><span>${label}</span></label>`;
  }
  return `<label><span>${label}</span><input type="${type}" id="${fieldId}" value="${value || ""}"></label>`;
}

function bindField(id, onChange) {
  const el = document.getElementById(id);
  if (!el) return;
  const evt = el.type === "checkbox" ? "change" : "input";
  el.addEventListener(evt, () => onChange(el.type === "checkbox" ? el.checked : el.value));
}

function renderEditor() {
  const section = SECTIONS.find((s) => s.id === activeSection);
  $("#panel-title").textContent = section.title;
  $("#panel-desc").textContent = section.desc;

  let html = "";

  if (activeSection === "dashboard") {
    html = `
      <div class="stats-grid">
        <div class="stat-card"><strong>${site.ticker?.items?.length || 0}</strong><span>Ticker items</span></div>
        <div class="stat-card"><strong>${site.alumni?.items?.length || 0}</strong><span>Alumni stories</span></div>
        <div class="stat-card"><strong>${site.jobProfiles?.items?.length || 0}</strong><span>Job profiles</span></div>
        <div class="stat-card"><strong>${themes.presets.find(t => t.id === site.theme?.presetId)?.name || "Custom"}</strong><span>Active theme</span></div>
      </div>
      <div class="card domain-live-card">
        <h3>🌐 Live on Niyamstack</h3>
        <p><strong>Website:</strong> <a href="https://nexusitacad.niyamstack.com" target="_blank" rel="noopener">https://nexusitacad.niyamstack.com</a></p>
        <p><strong>Admin:</strong> <a href="https://nexusitacad.niyamstack.com/admin/" target="_blank" rel="noopener">https://nexusitacad.niyamstack.com/admin/</a></p>
      </div>
      <div class="card">
        <p class="card-desc">Update placement numbers, add alumni photos, or change Classplus links — then click <strong>Save & Publish</strong>.</p>
        <div class="field-grid-2">
          <button type="button" class="btn btn-secondary" data-goto="ticker">Edit Announcement Bar</button>
          <button type="button" class="btn btn-secondary" data-goto="alumni">Edit Alumni Stories</button>
          <button type="button" class="btn btn-secondary" data-goto="navigation">Edit Register/Login Links</button>
          <button type="button" class="btn btn-secondary" data-goto="domain">Connect Custom Domain</button>
          <button type="button" class="btn btn-secondary" data-goto="themes">Change Theme</button>
          <button type="button" class="btn btn-primary" id="localize-images-btn">Save all images to our server</button>
        </div>
      </div>`;
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
    html = `<div class="card"><h3>Job Profiles Section</h3>
      ${field("Section title", site.jobProfiles?.title, "text", "jobs-title")}
      ${field("Profiles (one per line)", arrayToLines(site.jobProfiles?.items), "textarea", "jobs-items")}
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

  editor.innerHTML = html;

  if (activeSection === "settings") {
    $("#wrap-site-logo")?.appendChild(createImageField("Site Logo (upload and crop)", site.logo, "logo", (v) => { site.logo = v; }));
    $("#wrap-footer-logo")?.appendChild(createImageField("Footer Logo (upload and crop)", site.footerLogo, "footerLogo", (v) => { site.footerLogo = v; }));
  }

  // Sections with dynamic list editors
  if (activeSection === "partners") {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Hiring Partners Logos</h3>${field("Section title", site.hiringPartners?.title, "text", "hp-title")}`;
    editor.appendChild(card);
    bindField("hp-title", (v) => { site.hiringPartners.title = v; });
    const list = listField("Logo", site.hiringPartners.logos, [
      { key: "url", label: "Company logo", type: "image", preset: "partnerLogo" },
      { key: "alt", label: "Company name (alt text)" }
    ], () => {});
    card.appendChild(list);
  }

  if (activeSection === "alumni") {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Alumni / Success Stories</h3>
      ${field("Carousel speed (seconds)", site.alumni?.autoplaySeconds || 5, "number", "alumni-speed")}
      <p class="card-desc">Upload success story photos. Images are auto-cropped and compressed for fast loading.</p>`;
    editor.appendChild(card);
    bindField("alumni-speed", (v) => { site.alumni.autoplaySeconds = parseInt(v, 10) || 5; });
    const list = listField("Story", site.alumni.items, [
      { key: "image", label: "Photo", type: "image", preset: "alumni" },
      { key: "alt", label: "Caption / student name" }
    ], () => {});
    card.appendChild(list);
  }

  if (activeSection === "journey") {
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = `<h3>Journey Steps</h3>${field("Section title", site.journey?.title, "text", "journey-title")}`;
    editor.appendChild(card);
    bindField("journey-title", (v) => { site.journey.title = v; });
    const list = listField("Step", site.journey.steps, [
      { key: "title", label: "Step title" },
      { key: "description", label: "Description", type: "textarea" },
      { key: "icon", label: "Step icon", type: "image", preset: "journeyIcon" }
    ], () => {});
    card.appendChild(list);
  }

  if (activeSection === "fees") {
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
    const list = listField("Fee step", site.feeStructure.steps, [
      { key: "label", label: "Step label" },
      { key: "title", label: "Amount / title" },
      { key: "description", label: "Description", type: "textarea" }
    ], () => {});
    card.appendChild(list);
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
    const list = listField("Logo", site.footerPartners.logos, [
      { key: "url", label: "Partner logo", type: "image", preset: "partnerLogo" },
      { key: "alt", label: "Alt text" }
    ], () => {});
    card2.appendChild(list);
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
      <p class="card-desc">Pick a theme designed for IT training & placement academies. You can customize colors below.</p>
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
      <p class="card-desc">Clear custom color fields to use theme defaults. Custom colors override the selected theme.</p>
    </div>`;
    editor.innerHTML = html;

    document.querySelectorAll(".theme-card").forEach((card) => {
      card.addEventListener("click", () => {
        site.theme.presetId = card.dataset.theme;
        site.theme.custom.colors = {};
        const preset = themes.presets.find((t) => t.id === card.dataset.theme);
        if (preset) site.theme.custom.fontPreset = preset.fonts;
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
    });
  }

  // Bind standard fields
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
    "jobs-title": (v) => { site.jobProfiles.title = v; },
    "jobs-items": (v) => { site.jobProfiles.items = linesToArray(v); },
    "site-name": (v) => { site.siteName = v; site.meta.title = v; },
    "meta-title": (v) => { site.meta.title = v; },
    "meta-desc": (v) => { site.meta.description = v; }
  };

  Object.entries(bindings).forEach(([id, fn]) => bindField(id, fn));

  document.querySelectorAll("[data-goto]").forEach((btn) => {
    btn.addEventListener("click", () => {
      activeSection = btn.dataset.goto;
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
  showToast("Saved & published successfully!");
  refreshPreview();
}

function refreshPreview() {
  previewFrame.src = "/preview?t=" + Date.now();
}

async function initApp() {
  site = await api("/api/admin/site");
  themes = await api("/api/admin/themes");
  $("#login-screen").classList.add("hidden");
  $("#app").classList.remove("hidden");
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
  await api("/api/admin/logout", { method: "POST" });
  location.reload();
});

$("#save-btn").addEventListener("click", () => saveSite().catch((e) => showToast(e.message, "error")));

$("#reset-btn").addEventListener("click", async () => {
  if (!confirm("Reset all content to defaults? This cannot be undone.")) return;
  const res = await api("/api/admin/reset", { method: "POST" });
  site = res.site;
  renderEditor();
  refreshPreview();
  showToast("Reset to defaults");
});

$("#refresh-preview").addEventListener("click", refreshPreview);
$("#preview-toggle").addEventListener("click", () => {
  document.querySelector(".workspace-body").classList.toggle("preview-hidden");
});

$("#menu-toggle")?.addEventListener("click", openMobileMenu);
$("#sidebar-backdrop")?.addEventListener("click", closeMobileMenu);

checkAuth();
window.showToast = showToast;
