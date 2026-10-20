const { resolveTheme } = require("./themes");
const { isBlockSectionId, getBlockType } = require("./section-catalog");

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

function esc(str) {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function navLink(item) {
  if (!item?.enabled || !item.url) {
    return `<span class="nav-link nav-link--disabled">${esc(item?.label || "")}</span>`;
  }
  const target = item.openInNewTab ? ' target="_blank" rel="noopener"' : "";
  return `<a class="nav-link" href="${esc(item.url)}"${target}>${esc(item.label)}</a>`;
}

function checkIcon(color = "#0aaa7c") {
  return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <circle cx="12" cy="12" r="10" fill="${color}" />
    <path d="M8 12.5L10.5 15L16 9.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function bulletMarkup(style, color, index) {
  const c = color || "#0aaa7c";
  switch (style) {
    case "check-square":
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3" fill="${c}"/><path d="M8 12.5L10.5 15L16 9.5" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    case "disc":
      return `<span class="bullet-shape bullet-shape--disc" style="background:${c}"></span>`;
    case "circle":
      return `<span class="bullet-shape bullet-shape--circle" style="border-color:${c}"></span>`;
    case "square":
      return `<span class="bullet-shape bullet-shape--square" style="background:${c}"></span>`;
    case "dash":
      return `<span class="bullet-shape bullet-shape--dash" style="background:${c}"></span>`;
    case "arrow":
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h12M13 6l6 6-6 6" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    case "chevron":
      return `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="${c}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
    case "star":
      return `<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="${c}" d="M12 3.2l2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 15.6 7.2 18.1l.9-5.4L4.2 8.9l5.4-.8L12 3.2z"/></svg>`;
    case "diamond":
      return `<span class="bullet-shape bullet-shape--diamond" style="background:${c}"></span>`;
    case "number":
      return `<span class="bullet-shape bullet-shape--number" style="background:${c}">${index + 1}</span>`;
    case "check-circle":
    default:
      return checkIcon(c);
  }
}

function headingInlineStyle(opts = {}) {
  const parts = [];
  if (opts.align) parts.push(`text-align:${esc(opts.align)}`);
  if (opts.size) parts.push(`font-size:${Number(opts.size)}px`);
  if (opts.color) parts.push(`color:${esc(opts.color)}`);
  if (opts.font) {
    const family = String(opts.font).replace(/['"]/g, "");
    parts.push(`font-family:'${esc(family)}', var(--font-heading), sans-serif`);
  }
  if (opts.spacing != null && opts.spacing !== "") parts.push(`margin-bottom:${Number(opts.spacing)}px`);
  return parts.filter(Boolean).join(";");
}

function mark(builder, id, html) {
  if (!html) return "";
  if (!builder) return html;
  return html.replace(/^(<(?:section|header|footer|div)\b)/, `$1 data-nexus-section="${id}"`);
}

function resolveSectionOrder(site) {
  const order = Array.isArray(site.sectionOrder) && site.sectionOrder.length
    ? site.sectionOrder.slice()
    : DEFAULT_SECTION_ORDER.slice();
  const cleaned = order.filter(
    (id) => DEFAULT_SECTION_ORDER.includes(id) || isBlockSectionId(id)
  );
  return cleaned.length ? cleaned : DEFAULT_SECTION_ORDER.slice();
}

function isSectionVisible(site, id) {
  if (site.sectionHidden?.[id] === true) return false;
  if (isBlockSectionId(id)) return true;
  if (id === "ticker") return site.ticker?.enabled !== false;
  if (id === "course") return site.course?.enabled !== false;
  if (id === "jobs") return site.jobProfiles?.enabled === true;
  if (id === "eligibility") return site.eligibility?.enabled !== false;
  if (id === "batch") return site.nextBatch?.enabled !== false;
  return true;
}

function sectionPad(block) {
  const top = Number.isFinite(block?.paddingTop) ? block.paddingTop : 24;
  const bottom = Number.isFinite(block?.paddingBottom) ? block.paddingBottom : 24;
  return `padding-top:${top}px;padding-bottom:${bottom}px`;
}

function renderCustomBlock(site, blockId, builder) {
  const block = site.blocks?.[blockId];
  if (!block) return "";
  const visible = isSectionVisible(site, blockId);
  const pad = sectionPad(block);
  const titleStyle = headingInlineStyle({
    align: block.align || block.headingAlign || "center",
    size: block.headingSize,
    color: block.headingColor,
    font: block.headingFont,
    spacing: block.headingSpacing
  });

  let inner = "";
  switch (block.type) {
    case "bold-heading":
      inner = `<div class="container container--narrow">
        <h2 class="nx-block-title"${titleStyle ? ` style="${titleStyle}"` : ""}>${esc(block.title)}</h2>
        ${block.subtitle ? `<p class="nx-block-subtitle">${esc(block.subtitle)}</p>` : ""}
      </div>`;
      break;
    case "modern-bullets":
    case "text-green-circle": {
      const style = block.type === "text-green-circle" ? "disc" : block.bulletStyle || "check-circle";
      const color = block.bulletColor || "#0aaa7c";
      const items = (block.items || [])
        .map(
          (item, i) => `<li class="hero-feature">
            <span class="hero-feature__icon">${bulletMarkup(style, color, i)}</span>
            <span>${esc(typeof item === "string" ? item : item.text || "")}</span>
          </li>`
        )
        .join("");
      inner = `<div class="container container--narrow">
        ${block.title ? `<h2 class="nx-block-title"${titleStyle ? ` style="${titleStyle}"` : ""}>${esc(block.title)}</h2>` : ""}
        <ul class="nx-bullet-list">${items}</ul>
      </div>`;
      break;
    }
    case "faq-accordion": {
      const items = (block.items || [])
        .map(
          (item, i) => `<details class="nx-faq-item"${i === 0 ? " open" : ""}>
            <summary>${esc(item.q || item.question || "Question")}</summary>
            <div class="nx-faq-body">${esc(item.a || item.answer || "")}</div>
          </details>`
        )
        .join("");
      inner = `<div class="container container--narrow">
        <h2 class="nx-block-title"${titleStyle ? ` style="${titleStyle}"` : ""}>${esc(block.title || "FAQ")}</h2>
        <div class="nx-faq">${items}</div>
      </div>`;
      break;
    }
    case "institute-comparison": {
      const rows = (block.rows || [])
        .map(
          (r) => `<tr>
            <th>${esc(r.label)}</th>
            <td>${esc(r.left)}</td>
            <td class="nx-compare-highlight">${esc(r.right)}</td>
          </tr>`
        )
        .join("");
      inner = `<div class="container">
        <h2 class="nx-block-title"${titleStyle ? ` style="${titleStyle}"` : ""}>${esc(block.title)}</h2>
        <div class="nx-compare-wrap">
          <table class="nx-compare-table">
            <thead><tr><th></th><th>${esc(block.leftLabel || "Others")}</th><th>${esc(block.rightLabel || "Us")}</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
      break;
    }
    case "others-vs-us": {
      const left = (block.leftItems || []).map((t) => `<li>${esc(t)}</li>`).join("");
      const right = (block.rightItems || []).map((t) => `<li>${esc(t)}</li>`).join("");
      inner = `<div class="container">
        <h2 class="nx-block-title"${titleStyle ? ` style="${titleStyle}"` : ""}>${esc(block.title)}</h2>
        <div class="nx-vs-grid">
          <div class="nx-vs-card"><h3>${esc(block.leftTitle || "Others")}</h3><ul>${left}</ul></div>
          <div class="nx-vs-card nx-vs-card--accent"><h3>${esc(block.rightTitle || "Us")}</h3><ul>${right}</ul></div>
        </div>
      </div>`;
      break;
    }
    case "logo-slider": {
      const logos = (block.logos || [])
        .map((l) => `<div class="logo-card"><img src="${esc(l.url)}" alt="${esc(l.alt || "")}" loading="lazy"></div>`)
        .join("");
      inner = `<div class="container">
        ${block.title ? `<h2 class="section-title"${titleStyle ? ` style="${titleStyle}"` : ""}>${esc(block.title)}</h2>` : ""}
        <div class="logo-slider"><div class="logo-slider__track">${logos}${logos}</div></div>
      </div>`;
      break;
    }
    case "image-slider": {
      const slides = (block.items || [])
        .map(
          (a, i) => `<div class="carousel-slide alumni-card" data-index="${i}">
            <img src="${esc(a.image || a.url)}" alt="${esc(a.alt || `Slide ${i + 1}`)}" loading="lazy">
          </div>`
        )
        .join("");
      inner = `<div class="container">
        ${block.title ? `<h2 class="section-title"${titleStyle ? ` style="${titleStyle}"` : ""}>${esc(block.title)}</h2>` : ""}
        <div class="carousel" data-autoplay="${block.autoplaySeconds || 5}">
          <div class="carousel__track">${slides}</div>
          <div class="carousel__dots"></div>
        </div>
      </div>`;
      break;
    }
    case "image-row": {
      const imgs = (block.items || [])
        .map((a) => `<div class="nx-image-row__item"><img src="${esc(a.image || a.url)}" alt="${esc(a.alt || "")}" loading="lazy"></div>`)
        .join("");
      inner = `<div class="container">
        ${block.title ? `<h2 class="nx-block-title"${titleStyle ? ` style="${titleStyle}"` : ""}>${esc(block.title)}</h2>` : ""}
        <div class="nx-image-row">${imgs}</div>
      </div>`;
      break;
    }
    case "single-image":
    case "mobile-image": {
      const cls = block.type === "mobile-image" || block.mobileOnly ? "nx-media nx-media--mobile" : "nx-media nx-media--desktop";
      const img = block.image
        ? `<img src="${esc(block.image)}" alt="${esc(block.alt || "")}" loading="lazy">`
        : `<div class="nx-media-placeholder">Add an image</div>`;
      const content = block.link ? `<a href="${esc(block.link)}">${img}</a>` : img;
      inner = `<div class="container"><div class="${cls}">${content}</div></div>`;
      break;
    }
    case "custom-button":
    case "android-button": {
      const target = block.openInNewTab ? ' target="_blank" rel="noopener"' : "";
      const btnClass = block.type === "android-button" ? "nx-btn nx-btn--android" : `nx-btn nx-btn--${esc(block.style || "primary")}`;
      inner = `<div class="container" style="text-align:${esc(block.align || "center")}">
        <a class="${btnClass}" href="${esc(block.url || "#")}"${target}>${esc(block.label || "Button")}</a>
      </div>`;
      break;
    }
    case "line-divider":
      inner = `<div class="container"><div class="nx-line-divider" style="background:${esc(block.color || "#e5e7eb")};height:${Number(block.thickness || 1)}px;width:${Number(block.width || 100)}%;margin-inline:auto"></div></div>`;
      break;
    case "wave-divider":
      inner = `<div class="wave-divider${block.flip ? " wave-divider--flip" : ""}" aria-hidden="true">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,40 C300,80 600,0 900,40 C1050,60 1150,50 1200,40 L1200,120 L0,120 Z" opacity="0.5"/><path d="M0,70 C300,110 600,30 900,70 C1050,90 1150,80 1200,70 L1200,120 L0,120 Z"/></svg>
      </div>`;
      break;
    case "rich-text":
      inner = `<div class="container container--narrow" style="text-align:${esc(block.align || "center")}">
        <h2 class="nx-block-title"${titleStyle ? ` style="${titleStyle}"` : ""}>${esc(block.title)}</h2>
        ${block.body ? `<p class="nx-block-body">${esc(block.body)}</p>` : ""}
      </div>`;
      break;
    case "scroll-timeline": {
      const steps = (block.steps || [])
        .map(
          (s, i) => `<li class="nx-timeline-step">
            <span class="nx-timeline-index">${i + 1}</span>
            <div><strong>${esc(s.title)}</strong><p>${esc(s.text || "")}</p></div>
          </li>`
        )
        .join("");
      inner = `<div class="container container--narrow">
        <h2 class="nx-block-title"${titleStyle ? ` style="${titleStyle}"` : ""}>${esc(block.title)}</h2>
        <ol class="nx-timeline">${steps}</ol>
      </div>`;
      break;
    }
    default: {
      const meta = getBlockType(block.type);
      inner = `<div class="container"><p class="nx-block-unknown">Unknown section: ${esc(meta?.title || block.type)}</p></div>`;
    }
  }

  const typeMeta = getBlockType(block.type);
  const label = typeMeta?.title || block.title || block.type;
  const html = `<section class="section nx-block nx-block--${esc(block.type)}" data-nexus-label="${esc(label)}" style="${pad}">${inner}</section>`;
  return markSection(builder, blockId, html, visible);
}

function markSection(builder, id, html, visible) {
  if (!html) return "";
  if (!builder && !visible) return "";
  let out = mark(builder, id, html);
  if (builder && !visible) {
    out = out.replace(/^(<(?:section|header|footer|div)\b)/, `$1 data-nexus-hidden="true"`);
  }
  return out;
}

function renderSite(site, options = {}) {
  const builder = !!options.builder;
  const theme = resolveTheme(site);
  const c = theme.colors;
  const tickerItems = (site.ticker?.items || []).filter(Boolean);
  const tickerSpeed = site.ticker?.speed || 75;
  const tickerSize = site.ticker?.textSize || "medium";
  const tickerPadTop = Number.isFinite(site.ticker?.paddingTop) ? site.ticker.paddingTop : 12;
  const tickerPadBottom = Number.isFinite(site.ticker?.paddingBottom) ? site.ticker.paddingBottom : 12;
  const tickerGap = Number.isFinite(site.ticker?.textSpacing) ? site.ticker.textSpacing : 3;
  const tickerClasses = [
    "ticker-bar",
    `ticker-bar--${tickerSize}`,
    site.ticker?.uppercase === false ? "" : "ticker-bar--uppercase",
    site.ticker?.bold === false ? "" : "ticker-bar--bold",
    site.ticker?.italic ? "ticker-bar--italic" : ""
  ]
    .filter(Boolean)
    .join(" ");
  const tickerStyle = `padding-top:${tickerPadTop}px;padding-bottom:${tickerPadBottom}px;--ticker-gap:${tickerGap}rem;`;
  const tickerHtml = tickerItems.map((t) => `<p class="ticker-item">${esc(t)}</p>`).join("");
  const duplicateTicker = tickerHtml + tickerHtml + tickerHtml + tickerHtml;

  const heroHeadlineColor = site.hero?.headlineColor || "";
  const heroSizeDesktop = site.hero?.headlineSizeDesktop || 0;
  const heroSizeMobile = site.hero?.headlineSizeMobile || 0;
  const heroSpacing = Number.isFinite(site.hero?.spacingAfterHeading) ? site.hero.spacingAfterHeading : null;
  const heroH1Style = [
    heroHeadlineColor ? `color:${esc(heroHeadlineColor)}` : "",
    heroSizeDesktop ? `--hero-h1-desktop:${Number(heroSizeDesktop)}px` : "",
    heroSizeMobile ? `--hero-h1-mobile:${Number(heroSizeMobile)}px` : "",
    heroSpacing != null ? `margin-bottom:${Number(heroSpacing)}px` : ""
  ]
    .filter(Boolean)
    .join(";");

  const headerSticky = site.navigation?.sticky || "always";
  const headerSeparator = site.navigation?.showSeparator ? " site-header--separator" : "";
  const headerPadTop = Number.isFinite(site.navigation?.paddingTop) ? site.navigation.paddingTop : 16;
  const headerPadBottom = Number.isFinite(site.navigation?.paddingBottom) ? site.navigation.paddingBottom : 16;
  const partnersHeadingStyle = headingInlineStyle({
    align: site.hiringPartners?.headingAlign || "center",
    size: site.hiringPartners?.headingSize || 0,
    color: site.hiringPartners?.headingColor || "",
    font: site.hiringPartners?.headingFont || "",
    spacing: site.hiringPartners?.headingSpacing
  });
  const bulletStyle = site.hero?.bulletStyle || "check-circle";
  const bulletColor = site.hero?.bulletColor || (c.primary === "#bc0d5d" ? "#0aaa7c" : c.primary);

  const heroFeatures = (site.hero?.features || [])
    .map(
      (f, i) => `<li class="hero-feature hero-feature--${esc(bulletStyle)}">
        <span class="hero-feature__icon">${bulletMarkup(bulletStyle, bulletColor, i)}</span>
        <span>${esc(f)}</span>
      </li>`
    )
    .join("");

  const partnerLogos = (site.hiringPartners?.logos || [])
    .map((l) => `<div class="logo-card"><img src="${esc(l.url)}" alt="${esc(l.alt)}" loading="lazy"></div>`)
    .join("");

  const alumniSlides = (site.alumni?.items || [])
    .map(
      (a, i) => `<div class="carousel-slide alumni-card" data-index="${i}">
        <img src="${esc(a.image)}" alt="${esc(a.alt || `Alumni ${i + 1}`)}" loading="lazy">
      </div>`
    )
    .join("");

  const alumniGrid = (site.alumni?.items || [])
    .map(
      (a, i) => `<div class="alumni-grid__item">
        <img src="${esc(a.image)}" alt="${esc(a.alt || `Alumni ${i + 1}`)}" loading="lazy">
      </div>`
    )
    .join("");

  const journeySteps = (site.journey?.steps || [])
    .map(
      (s) => `<li class="journey-step">
        <div class="journey-step__icon"><img src="${esc(s.icon)}" alt="" loading="lazy"></div>
        <h3>${esc(s.title)}</h3>
        <p>${esc(s.description)}</p>
      </li>`
    )
    .join("");

  const jobCards = (site.jobProfiles?.items || [])
    .map((j) => `<div class="job-card"><h3>${esc(j)}</h3></div>`)
    .join("");

  const courseTags = (site.course?.tags || [])
    .map((t) => `<span class="course-tag">${esc(t)}</span>`)
    .join("");

  const courseRoles = (site.course?.roles || [])
    .map((r) => `<li><span class="check-dot" aria-hidden="true">✓</span><span>${esc(r)}</span></li>`)
    .join("");

  const courseModules = (site.course?.modules || [])
    .map(
      (m) => `<details class="syllabus-item">
        <summary><span>${esc(m.title)}</span></summary>
        <ul>${(m.items || []).map((item) => `<li>${esc(item)}</li>`).join("")}</ul>
      </details>`
    )
    .join("");

  const eligibilityItems = (site.eligibility?.items || [])
    .map((item) => `<li><span class="check-dot" aria-hidden="true">✓</span><span>${esc(item)}</span></li>`)
    .join("");

  const communityTarget = site.community?.openInNewTab !== false || site.nextBatch?.ctaOpenInNewTab !== false
    ? ' target="_blank" rel="noopener"'
    : "";
  const communityUrl = site.nextBatch?.ctaUrl || site.community?.url || "";
  const communityLabel = site.nextBatch?.ctaLabel || site.community?.label || "JOIN COMMUNITY";
  const showCommunityFloat = false;

  const feeSteps = (site.feeStructure?.steps || [])
    .map(
      (s, i) => `<div class="fee-step" data-fee-step="${i}">
        <div class="fee-step__dot"></div>
        <div class="fee-step__content">
          <div class="fee-step__label">${esc(s.label)}</div>
          <h3>${esc(s.title)}</h3>
          <p>${esc(s.description)}</p>
        </div>
      </div>`
    )
    .join("");

  const footerLogos = (site.footerPartners?.logos || [])
    .map((l) => `<div class="footer-logo"><img src="${esc(l.url)}" alt="${esc(l.alt)}" loading="lazy"></div>`)
    .join("");

  const footerLogoDup = footerLogos + footerLogos;

  const waveTop = `<div class="wave-divider" aria-hidden="true">
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,40 C300,80 600,0 900,40 C1050,60 1150,50 1200,40 L1200,120 L0,120 Z" opacity="0.5"/><path d="M0,70 C300,110 600,30 900,70 C1050,90 1150,80 1200,70 L1200,120 L0,120 Z"/></svg>
    </div>`;

  const waveBottom = `<div class="wave-divider wave-divider--flip" aria-hidden="true">
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,40 C300,80 600,0 900,40 C1050,60 1150,50 1200,40 L1200,120 L0,120 Z" opacity="0.5"/><path d="M0,70 C300,110 600,30 900,70 C1050,90 1150,80 1200,70 L1200,120 L0,120 Z"/></svg>
    </div>`;

  const sections = {
    hero: markSection(
      builder,
      "hero",
      `<section class="hero">
      <div class="hero__inner">
        <h1${(() => {
          const font = site.hero?.headingFont ? `font-family:'${esc(site.hero.headingFont)}', var(--font-heading), sans-serif` : "";
          const style = [heroH1Style, font].filter(Boolean).join(";");
          return style ? ` style="${style}"` : "";
        })()}>${esc(site.hero?.headline)}</h1>
        <ul class="hero__features">${heroFeatures}</ul>
      </div>
    </section>`,
      isSectionVisible(site, "hero")
    ),
    partners: markSection(
      builder,
      "partners",
      `<section class="section section--partners">
      <div class="container">
        <h2 class="section-title"${partnersHeadingStyle ? ` style="${partnersHeadingStyle}"` : ""}>${esc(site.hiringPartners?.title)}</h2>
        <div class="logo-slider"><div class="logo-slider__track">${partnerLogos}${partnerLogos}</div></div>
      </div>
    </section>`,
      isSectionVisible(site, "partners")
    ),
    alumni: markSection(
      builder,
      "alumni",
      `<section class="section section--carousel section--alumni">
      <div class="container">
        <h2 class="section-title"${(() => {
          const st = headingInlineStyle({
            align: site.alumni?.headingAlign || "center",
            size: site.alumni?.headingSize || 0,
            color: site.alumni?.headingColor || "",
            font: site.alumni?.headingFont || "",
            spacing: site.alumni?.headingSpacing
          });
          return st ? ` style="${st}"` : "";
        })()}>${esc(site.alumni?.title || "Alumni Spotlight")}</h2>
        <div class="alumni-grid">${alumniGrid}</div>
        <div class="alumni-mobile-carousel">
          <div class="carousel" data-autoplay="${site.alumni?.autoplaySeconds || 5}">
            <div class="carousel__track">${alumniSlides}</div>
            <div class="carousel__dots"></div>
          </div>
        </div>
      </div>
    </section>`,
      isSectionVisible(site, "alumni")
    ),
    journey: markSection(
      builder,
      "journey",
      `<section class="section section--journey">
      <div class="container">
        <h2 class="section-title section-title--light">${esc(site.journey?.title)}</h2>
        <ul class="journey-grid">${journeySteps}</ul>
      </div>
    </section>`,
      isSectionVisible(site, "journey")
    ),
    guarantee:
      markSection(
        builder,
        "guarantee",
        `<section class="section section--guarantee">
      <div class="container">
        <h2 class="gradient-heading">${esc(site.placementGuarantee?.title)}</h2>
        <p class="section-subtitle">${esc(site.placementGuarantee?.subtitle)}</p>
      </div>
    </section>`,
        isSectionVisible(site, "guarantee")
      ) + (isSectionVisible(site, "guarantee") || builder ? waveTop : ""),
    course: markSection(
      builder,
      "course",
      `<section class="section section--course">
      <div class="container">
        <div class="course-hero">
          <div class="course-hero__copy">
            <div class="course-badge">${esc(site.course?.badge || "JOB PROFILE NAME")}</div>
            <h2 class="course-hero__title">${esc(site.course?.title)}</h2>
            <p class="course-hero__subtitle">${esc(site.course?.subtitle)}</p>
            <div class="course-tags">${courseTags}</div>
          </div>
          <aside class="course-hero__card">
            <h3>${esc(site.course?.aboutTitle || "About the Job Profile")}</h3>
            <p class="course-hero__roles-label">${esc(site.course?.rolesTitle || "Roles & Responsibilities")}</p>
            <ul class="course-roles">${courseRoles}</ul>
          </aside>
        </div>
        <div class="syllabus-wrap">
          <p class="syllabus-caption">${esc(site.course?.syllabusTitle || "45 Days Program Syllabus")}</p>
          <div class="syllabus">${courseModules}</div>
        </div>
      </div>
    </section>`,
      isSectionVisible(site, "course")
    ),
    jobs: markSection(
      builder,
      "jobs",
      `<section class="section section--jobs">
      <div class="container">
        <h2 class="section-title">${esc(site.jobProfiles?.title)}</h2>
        <div class="job-grid">${jobCards}</div>
      </div>
    </section>`,
      isSectionVisible(site, "jobs")
    ),
    fees: (() => {
      const visible = isSectionVisible(site, "fees");
      if (!builder && !visible) return "";
      const feesHtml = `<section class="section section--fees">
      <div class="container container--narrow">
        <div class="fees-header">
          <h2 class="section-title">${esc(site.feeStructure?.title)}</h2>
          <p class="section-subtitle">${esc(site.feeStructure?.subtitle)}</p>
        </div>
        <div class="fee-timeline">
          <div class="fee-timeline__line"><div class="fee-timeline__progress"></div></div>
          ${feeSteps}
        </div>
      </div>
    </section>
    <section class="section section--total-fees">
      <div class="container">
        <h2 class="gradient-heading gradient-heading--sm">${esc(site.feeStructure?.totalLabel)}</h2>
      </div>
    </section>`;
      if (!builder) return feesHtml;
      return `<div data-nexus-section="fees"${visible ? "" : ' data-nexus-hidden="true"'} class="nexus-section-wrap">${feesHtml}</div>`;
    })(),
    eligibility: markSection(
      builder,
      "eligibility",
      `<section class="section section--eligibility">
      <div class="container container--narrow">
        <div class="eligibility-card">
          <h2>${esc(site.eligibility?.title)}</h2>
          <ul>${eligibilityItems}</ul>
        </div>
      </div>
    </section>`,
      isSectionVisible(site, "eligibility")
    ),
    batch: markSection(
      builder,
      "batch",
      `<section class="section section--batch">
      <div class="container">
        <div class="batch-hero">
          <div class="batch-hero__copy">
            <div class="course-badge">${esc(site.nextBatch?.badge || "Registration")}</div>
            <h2 class="batch-hero__title">${esc(site.nextBatch?.title || "⚡️ Next Batch Launch")}</h2>
          </div>
          <aside class="batch-hero__card">
            <p class="batch-hero__eyebrow">${esc(site.nextBatch?.cardEyebrow || "Attend our Demo session")}</p>
            <h3 class="batch-hero__date">${esc(site.nextBatch?.dateTitle || "")}</h3>
            <p class="batch-hero__text">${esc(site.nextBatch?.cardText || "")}</p>
            ${communityUrl ? `<a class="btn-whatsapp" href="${esc(communityUrl)}"${communityTarget}>${esc(communityLabel)}</a>` : ""}
          </aside>
        </div>
      </div>
    </section>`,
      isSectionVisible(site, "batch")
    ),
    contact:
      (isSectionVisible(site, "contact") || builder ? waveBottom : "") +
      markSection(
        builder,
        "contact",
        `<footer class="site-footer">
      <div class="container footer-grid">
        <div class="footer-brand">
          <img src="${esc(site.footerLogo || site.logo)}" alt="${esc(site.siteName)}" loading="lazy">
        </div>
        <div class="footer-contact">
          <h2>${esc(site.contact?.title)}</h2>
          <p>• <strong>Head Office :</strong> ${esc(site.contact?.address)}</p>
          <p>• <strong>Phone :</strong> ${esc(site.contact?.phone)}</p>
          <p>• <strong>Email :</strong> ${esc(site.contact?.email)}</p>
        </div>
      </div>
      <div class="footer-partners">
        <div class="container">
          <h2>${esc(site.footerPartners?.title)}</h2>
          <div class="footer-logo-track">${footerLogoDup}</div>
        </div>
      </div>
      <div class="footer-copy">
        <div class="container">&copy; ${new Date().getFullYear()}, ${esc(site.siteName)}</div>
      </div>
    </footer>`,
        isSectionVisible(site, "contact")
      )
  };

  const mainHtml = resolveSectionOrder(site)
    .map((id) => {
      if (isBlockSectionId(id)) return renderCustomBlock(site, id, builder);
      return sections[id] || "";
    })
    .join("\n");

  const tickerVisible = isSectionVisible(site, "ticker");
  const tickerBlock = markSection(
    builder,
    "ticker",
    `<section class="${tickerClasses}" style="${tickerStyle}" aria-label="Highlights">
    <div class="ticker-track">${duplicateTicker}</div>
  </section>`,
    tickerVisible
  );

  const headerBlock = mark(
    builder,
    "header",
    `<header class="site-header site-header--sticky-${esc(headerSticky)}${headerSeparator}" style="padding-top:${headerPadTop}px;padding-bottom:${headerPadBottom}px">
    <nav class="site-header__nav site-header__nav--left">
      ${navLink(site.navigation?.register)}
      ${navLink(site.navigation?.login)}
    </nav>
    <a class="site-header__logo" href="/">
      <img src="${esc(site.logo)}" alt="${esc(site.siteName)}" width="140" height="48">
    </a>
    <div class="site-header__spacer" aria-hidden="true"></div>
  </header>`
  );

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(site.meta?.title || site.siteName)}</title>
  <meta name="description" content="${esc(site.meta?.description || "")}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=${theme.fonts.google}&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/site.css">
  ${builder ? '<link rel="stylesheet" href="/assets/builder.css">' : ""}
  <style>
    :root {
      --primary: ${c.primary};
      --accent: ${c.accent};
      --hero-bg: ${c.heroBg};
      --hero-text: ${c.heroText};
      --ticker-bg: ${c.tickerBg};
      --ticker-text: ${c.tickerText};
      --journey-bg: ${c.journeyBg};
      --journey-text: ${c.journeyText};
      --section-bg: ${c.sectionBg};
      --muted-bg: ${c.mutedBg};
      --gradient-start: ${c.gradientStart};
      --gradient-end: ${c.gradientEnd};
      --font-heading: '${theme.fonts.heading}', sans-serif;
      --font-body: '${theme.fonts.body}', sans-serif;
      --ticker-speed: ${tickerSpeed}s;
    }
  </style>
</head>
<body${builder ? ' class="nexus-builder"' : ""}>
  ${tickerBlock}
  ${headerBlock}
  <main>
    ${mainHtml}
  </main>
  <script src="/assets/site.js"></script>
  ${builder ? '<script src="/assets/builder-bridge.js"></script>' : ""}
  ${showCommunityFloat ? `
  <a class="floating-whatsapp" href="${esc(communityUrl)}"${communityTarget} aria-label="${esc(communityLabel)}">
    <span>WhatsApp</span>
    <strong>${esc(communityLabel)}</strong>
  </a>` : ""}
</body>
</html>`;
}

module.exports = { renderSite, DEFAULT_SECTION_ORDER, resolveSectionOrder, isSectionVisible };
