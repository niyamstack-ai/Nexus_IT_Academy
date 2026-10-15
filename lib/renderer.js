const { resolveTheme } = require("./themes");

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

function renderSite(site) {
  const theme = resolveTheme(site);
  const c = theme.colors;
  const tickerItems = (site.ticker?.items || []).filter(Boolean);
  const tickerSpeed = site.ticker?.speed || 75;
  const tickerHtml = tickerItems.map((t) => `<p class="ticker-item">${esc(t)}</p>`).join("");
  const duplicateTicker = tickerHtml + tickerHtml + tickerHtml + tickerHtml;

  const heroFeatures = (site.hero?.features || [])
    .map(
      (f) => `<li class="hero-feature">
        <span class="hero-feature__icon">${checkIcon(c.primary === "#bc0d5d" ? "#0aaa7c" : c.primary)}</span>
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
  const showCommunityFloat = site.community?.enabled !== false && site.community?.floating !== false && communityUrl;

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
  const showCourse = site.course?.enabled !== false;
  const showJobs = site.jobProfiles?.enabled === true;
  const showEligibility = site.eligibility?.enabled !== false;
  const showNextBatch = site.nextBatch?.enabled !== false;

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
<body>
  ${site.ticker?.enabled !== false ? `
  <section class="ticker-bar" aria-label="Highlights">
    <div class="ticker-track">${duplicateTicker}</div>
  </section>` : ""}

  <header class="site-header">
    <nav class="site-header__nav site-header__nav--left">
      ${navLink(site.navigation?.register)}
      ${navLink(site.navigation?.login)}
      ${communityUrl ? `<a class="nav-link nav-link--community" href="${esc(communityUrl)}"${communityTarget}>${esc(communityLabel)}</a>` : ""}
    </nav>
    <a class="site-header__logo" href="/">
      <img src="${esc(site.logo)}" alt="${esc(site.siteName)}" width="140" height="48">
    </a>
    <div class="site-header__spacer" aria-hidden="true"></div>
  </header>

  <main>
    <section class="hero">
      <div class="hero__inner">
        <h1>${esc(site.hero?.headline)}</h1>
        <ul class="hero__features">${heroFeatures}</ul>
      </div>
    </section>

    <section class="section section--partners">
      <div class="container">
        <h2 class="section-title">${esc(site.hiringPartners?.title)}</h2>
        <div class="logo-slider"><div class="logo-slider__track">${partnerLogos}${partnerLogos}</div></div>
      </div>
    </section>

    <section class="section section--carousel section--alumni">
      <div class="container">
        <h2 class="section-title">${esc(site.alumni?.title || "Alumni Spotlight")}</h2>
        <div class="alumni-grid">${alumniGrid}</div>
        <div class="alumni-mobile-carousel">
          <div class="carousel" data-autoplay="${site.alumni?.autoplaySeconds || 5}">
            <div class="carousel__track">${alumniSlides}</div>
            <div class="carousel__dots"></div>
          </div>
        </div>
      </div>
    </section>

    <section class="section section--journey">
      <div class="container">
        <h2 class="section-title section-title--light">${esc(site.journey?.title)}</h2>
        <ul class="journey-grid">${journeySteps}</ul>
      </div>
    </section>

    <section class="section section--guarantee">
      <div class="container">
        <h2 class="gradient-heading">${esc(site.placementGuarantee?.title)}</h2>
        <p class="section-subtitle">${esc(site.placementGuarantee?.subtitle)}</p>
      </div>
    </section>

    <div class="wave-divider" aria-hidden="true">
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,40 C300,80 600,0 900,40 C1050,60 1150,50 1200,40 L1200,120 L0,120 Z" opacity="0.5"/><path d="M0,70 C300,110 600,30 900,70 C1050,90 1150,80 1200,70 L1200,120 L0,120 Z"/></svg>
    </div>

    ${showCourse ? `
    <section class="section section--course">
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
    </section>` : ""}

    ${showJobs ? `
    <section class="section section--jobs">
      <div class="container">
        <h2 class="section-title">${esc(site.jobProfiles?.title)}</h2>
        <div class="job-grid">${jobCards}</div>
      </div>
    </section>` : ""}

    <section class="section section--fees">
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
    </section>

    ${showEligibility ? `
    <section class="section section--eligibility">
      <div class="container container--narrow">
        <div class="eligibility-card">
          <h2>${esc(site.eligibility?.title)}</h2>
          <ul>${eligibilityItems}</ul>
        </div>
      </div>
    </section>` : ""}

    ${showNextBatch ? `
    <section class="section section--batch">
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
    </section>` : ""}

    <div class="wave-divider wave-divider--flip" aria-hidden="true">
      <svg viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0,40 C300,80 600,0 900,40 C1050,60 1150,50 1200,40 L1200,120 L0,120 Z" opacity="0.5"/><path d="M0,70 C300,110 600,30 900,70 C1050,90 1150,80 1200,70 L1200,120 L0,120 Z"/></svg>
    </div>

    <footer class="site-footer">
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
    </footer>
  </main>
  <script src="/assets/site.js"></script>
  ${showCommunityFloat ? `
  <a class="floating-whatsapp" href="${esc(communityUrl)}"${communityTarget} aria-label="${esc(communityLabel)}">
    <span>WhatsApp</span>
    <strong>${esc(communityLabel)}</strong>
  </a>` : ""}
</body>
</html>`;
}

module.exports = { renderSite };
