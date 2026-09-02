const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SOURCE = path.join(ROOT, "source.html");
const OUTPUT = path.join(ROOT, "index.html");

const CDN = "https://nexusitacad.com";
const CSS_FILES = [
  `${CDN}/cdn/shop/t/3/assets/base.css?v=108207397045790613361788262130`,
  `${CDN}/cdn/shop/t/3/assets/section-multicolumn.css?v=6265525776963667451788262130`,
  `${CDN}/cdn/shop/t/3/assets/component-rte.css?v=73443491922477598101788262130`,
  `${CDN}/cdn/shop/t/3/assets/component-slider.css?v=17305047213098365241788262130`,
  `${CDN}/cdn/shop/t/3/assets/section-footer.css?v=46383091618275559031788262130`,
  `${CDN}/cdn/shop/t/3/assets/component-newsletter.css?v=180884587654672216131788262130`,
  `${CDN}/cdn/shop/t/3/assets/component-list-menu.css?v=151968516119678728991788262130`,
  `${CDN}/cdn/shop/t/3/assets/component-card.css?v=171622893807557687511788262130`,
];

const html = fs.readFileSync(SOURCE, "utf8");

const rootMatch = html.match(
  /<style data-shopify>\s*(@font-face[\s\S]*?@media screen and \(min-width: 750px\)[\s\S]*?}\s*}\s*)<\/style>/
);
const themeStyles = rootMatch ? rootMatch[1] : "";

const allStyles = [...html.matchAll(/<style data-shopify>([\s\S]*?)<\/style>/g)].map((m) => m[1]);
const sectionStyles = allStyles.slice(1).join("\n");

const header = `<header class="header header--middle-center page-width" style="padding: 1.2rem 2rem; display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:1rem; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
  <nav class="header__inline-menu">
    <ul class="list-menu list-menu--inline" role="list" style="display:flex; gap:1.5rem; list-style:none; margin:0; padding:0;">
      <li><span class="header__menu-item list-menu__item link link--text" style="cursor:default;">Register</span></li>
      <li><span class="header__menu-item list-menu__item link link--text" style="cursor:default;">Login Training Program</span></li>
    </ul>
  </nav>
  <a href="#" class="header__heading-link link link--text focus-inset" onclick="return false;">
    <img src="https://nexusitacad.com/cdn/shop/files/NEXUS_1_1.png?v=1788262269&width=500" alt="Nexus IT Academy" width="140" height="48" class="header__heading-logo">
  </a>
  <div style="width:140px;"></div>
</header>`;

const mainMatch = html.match(/<main id="MainContent"[^>]*>([\s\S]*?)<\/main>/);
const mainContent = mainMatch ? mainMatch[1] : "";

const footerMatch = html.match(
  /<!-- BEGIN sections: footer-group -->([\s\S]*?)<!-- END sections: footer-group -->/
);
const footerContent = footerMatch ? footerMatch[1] : "";

const customScripts = [
  ...html.matchAll(
    /<script>\s*\(function\(\) \{[\s\S]*?customElements\.define[\s\S]*?\}\)\(\);\s*<\/script>/g
  ),
].map((m) => m[0]);

function cleanFragment(fragment) {
  return fragment
    .replace(/src="\/\//g, 'src="https://')
    .replace(/href="\/\//g, 'href="https://')
    .replace(/srcset="\/\//g, 'srcset="https://')
    .replace(/href="https:\/\/qlisen\.courses\.store[^"]*"/g, 'href="#" onclick="return false;"')
    .replace(/href="https:\/\/web\.classplusapp\.com[^"]*"/g, 'href="#" onclick="return false;"')
    .replace(/<script[^>]*shopify[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<link[^>]*shopify[^>]*>/gi, "");
}

const cssLinks = CSS_FILES.map((url) => `  <link rel="stylesheet" href="${url}">`).join("\n");

const page = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nexus IT Academy</title>
  <meta name="description" content="A Genuine Pay After Placement IT Consultancy - Nexus IT Academy">
${cssLinks}
  <style>
${themeStyles}
${sectionStyles}

    body { margin: 0; }
    .header__menu-item { font-size: 1.6rem; }
    .list-menu--inline { display: flex; gap: 2rem; list-style: none; padding: 0; margin: 0; }
    .page-width { max-width: 140rem; margin: 0 auto; padding: 0 2rem; }
    .footer__blocks-wrapper { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 2rem; }
    .footer { background: #ececec; }
    .gradient.color-accent-1 { background: #121212; color: #fff; }
    .multicolumn.color-accent-1 .title { color: #fff; }
    .multicolumn.color-accent-1 .multicolumn-card__info h3 { color: #fff; }
    .multicolumn.color-accent-1 .rte p { color: rgba(255,255,255,0.9); }
    .icon-bar-card { text-align: center; }
    .icon-bar-card__icon img { max-width: 64px; height: auto; }
    .title.h2 { font-family: Arsenal, sans-serif; font-size: 3.2rem; text-align: center; }
    .multicolumn-list { display: grid; grid-template-columns: repeat(4, 1fr); gap: 2rem; list-style: none; padding: 0; margin: 0; }
    @media (max-width: 989px) { .multicolumn-list { grid-template-columns: repeat(2, 1fr); } }
    @media (max-width: 749px) { .multicolumn-list { grid-template-columns: 1fr; } .header { justify-content: center !important; } }
  </style>
</head>
<body>
${header}
<main id="MainContent" role="main">
${cleanFragment(mainContent)}
</main>
${cleanFragment(footerContent)}
<script>
  document.querySelectorAll('[data-track]').forEach(track => {
    const logos = Array.from(track.children);
    logos.forEach(logo => track.appendChild(logo.cloneNode(true)));
  });
  document.querySelectorAll('.ai-logo-slider-track-aeuzhwkt6vkx0qvfpraigenblock7cc74dbmk7v8f').forEach(track => {
    const items = Array.from(track.children);
    items.forEach(item => track.appendChild(item.cloneNode(true)));
  });
</script>
${customScripts.join("\n")}
</body>
</html>
`;

fs.writeFileSync(OUTPUT, page, "utf8");
console.log(`Built ${OUTPUT} (${page.length} bytes)`);
