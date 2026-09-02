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
      (a, i) => `<div class="carousel-slide" data-index="${i}">
        <img src="${esc(a.image)}" alt="${esc(a.alt || `Story ${i + 1}`)}" loading="lazy">
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

    <section class="section section--carousel">
      <div class="container container--narrow">
        <div class="carousel" data-autoplay="${site.alumni?.autoplaySeconds || 5}">
          <div class="carousel__track">${alumniSlides}</div>
          <div class="carousel__dots"></div>
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

    <section class="section section--jobs">
      <div class="container">
        <h2 class="section-title">${esc(site.jobProfiles?.title)}</h2>
        <div class="job-grid">${jobCards}</div>
      </div>
    </section>

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
</body>
</html>`;
}

module.exports = { renderSite };
