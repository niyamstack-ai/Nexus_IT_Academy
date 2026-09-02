const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const SOURCE = path.join(ROOT, "source.html");
const OUTPUT = path.join(ROOT, "index.html");
const CDN = "https://nexusitacad.com";

const html = fs.readFileSync(SOURCE, "utf8");

const themeStyleMatch = html.match(
  /<style data-shopify>\s*(@font-face[\s\S]*?@media screen and \(min-width: 750px\)[\s\S]*?}\s*}\s*)<\/style>/
);
const themeStyles = themeStyleMatch ? themeStyleMatch[1] : "";

const cssLinks = [
  ...new Set(
    [...html.matchAll(/<link[^>]+rel=["']stylesheet["'][^>]*>/gi)].map((m) => {
      let tag = m[0]
        .replace(/href="\/\//g, 'href="https://')
        .replace(/media="print"\s+onload="this\.media='all'"/g, 'media="all"');
      return tag;
    })
  ),
];

const headerMatch = html.match(
  /<!-- BEGIN sections: header-group -->([\s\S]*?)<!-- END sections: header-group -->/
);
const mainMatch = html.match(/<main id="MainContent"[^>]*>([\s\S]*?)<\/main>/);
const footerMatch = html.match(
  /<!-- BEGIN sections: footer-group -->([\s\S]*?)<!-- END sections: footer-group -->/
);

const customScripts = [
  ...html.matchAll(
    /<script>\s*\(function\(\) \{[\s\S]*?customElements\.define[\s\S]*?\}\)\(\);\s*<\/script>/g
  ),
].map((m) => m[0]);

function cleanFragment(fragment) {
  let out = fragment
    .replace(/src="\/\//g, 'src="https://')
    .replace(/href="\/\//g, 'href="https://')
    .replace(/srcset="\/\//g, 'srcset="https://')
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<link[^>]*shopifycloud[^>]*>/gi, "")
    .replace(/href="https:\/\/qlisen\.courses\.store[^"]*"/gi, 'href="#" role="button" aria-disabled="true"')
    .replace(/href="https:\/\/web\.classplusapp\.com[^"]*"/gi, 'href="#" role="button" aria-disabled="true"')
    .replace(/href="https:\/\/nexusitacad\.com\/customer_authentication[^"]*"/gi, 'href="#" aria-disabled="true"')
    .replace(/href="https:\/\/nexusitacad\.com\/cart[^"]*"/gi, 'href="#" aria-disabled="true"')
    .replace(/href="\/cart[^"]*"/gi, 'href="#" aria-disabled="true"');

  // Remove cart drawer block
  out = out.replace(/<cart-drawer[\s\S]*?<\/cart-drawer>/gi, "");
  out = out.replace(/<cart-notification[\s\S]*?<\/cart-notification>/gi, "");

  // Remove search modal but keep header structure
  out = out.replace(/<details-modal class="header__search">[\s\S]*?<\/details-modal>/gi, "");

  // Remove account icon link in header icons
  out = out.replace(
    /<a href="#" aria-disabled="true" class="header__icon header__icon--account[\s\S]*?<\/a>/gi,
    ""
  );

  // Remove cart icon
  out = out.replace(
    /<a href="#" aria-disabled="true" class="header__icon header__icon--cart[\s\S]*?<\/a>/gi,
    ""
  );

  // Remove login in mobile drawer utility links
  out = out.replace(
    /<div class="menu-drawer__utility-links">[\s\S]*?<\/div>/gi,
    ""
  );

  return out;
}

function disableNavLinks(fragment) {
  return fragment.replace(
    /<a([^>]*class="[^"]*(?:header__menu-item|menu-drawer__menu-item)[^"]*"[^>]*)href="#"[^>]*>/gi,
    '<a$1href="#" onclick="return false;" tabindex="-1" style="pointer-events:none;cursor:default;">'
  );
}

function cleanHeader(fragment) {
  return disableNavLinks(cleanFragment(fragment));
}

const headerContent = headerMatch ? cleanHeader(headerMatch[1]) : "";
const mainContent = mainMatch ? cleanFragment(mainMatch[1]) : "";
const footerContent = footerMatch ? cleanFragment(footerMatch[1]) : "";

const cssBlock = cssLinks
  .filter(
    (link) =>
      !link.includes("cart") &&
      !link.includes("checkout") &&
      !link.includes("promo-popup")
  )
  .map((link) => `  ${link}`)
  .join("\n");

const page = `<!DOCTYPE html>
<html class="no-js" lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Nexus IT Academy</title>
  <meta name="description" content="A Genuine Pay After Placement IT Consultancy - Nexus IT Academy">
${cssBlock}
  <style data-shopify>
${themeStyles}
  </style>
  <style>
    @keyframes horTicker { to { transform: translate(-50%); } }
    .header__heading-logo { max-width: 140px; width: 100%; height: auto; }
    a[aria-disabled="true"], a[onclick="return false;"] { cursor: default; }
    .menu-drawer, cart-drawer, cart-notification, details-modal { display: none !important; }
  </style>
</head>
<body class="gradient">
${headerContent}
<main id="MainContent" class="content-for-layout focus-none" role="main">
${mainContent}
</main>
${footerContent}
<script>
  document.documentElement.classList.remove('no-js');
  document.querySelectorAll('[data-track]').forEach((track) => {
    if (track.children.length && track.children.length === track.querySelectorAll('.ai-logo-slider__logo-aevlsagjty3nqk2rjuaigenblockfaec0d5443ggh').length) {
      const logos = Array.from(track.children);
      logos.forEach((logo) => track.appendChild(logo.cloneNode(true)));
      track.classList.add('ai-logo-slider__track--animate-aevlsagjty3nqk2rjuaigenblockfaec0d5443ggh');
    }
  });
  document.querySelectorAll('.ai-logo-slider-track-aeuzhwkt6vkx0qvfpraigenblock7cc74dbmk7v8f').forEach((track) => {
    const items = Array.from(track.children);
    const half = items.length / 2;
    if (half >= 1 && items.length === half * 2) return;
    items.forEach((item) => track.appendChild(item.cloneNode(true)));
  });
  document.querySelectorAll('.horizontal-ticker__container').forEach((container) => {
    const items = Array.from(container.querySelectorAll('.horizontal-ticker__item')).slice(0, 3);
    if (!items.length) return;
    while (container.querySelectorAll('.horizontal-ticker__item').length < 12) {
      items.forEach((item) => container.appendChild(item.cloneNode(true)));
    }
  });
</script>
${customScripts.join("\n")}
</body>
</html>`;

const finalPage = page.replace(/([^:])\/\/nexusitacad\.com/g, "$1https://nexusitacad.com");

fs.writeFileSync(OUTPUT, finalPage, "utf8");
console.log(`Built ${OUTPUT} (${finalPage.length} bytes)`);
