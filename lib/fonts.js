/**
 * Font catalog for theme presets + Shopify-style per-section pickers.
 * Families are loaded from Google Fonts on the public site and in admin preview.
 */

const FONT_PAIRS = [
  {
    id: "roboto-condensed",
    label: "Arsenal + Roboto Condensed",
    heading: "Arsenal",
    body: "Roboto Condensed",
    google: "Arsenal:wght@400;700&family=Roboto+Condensed:wght@400;700"
  },
  {
    id: "poppins",
    label: "Poppins Modern",
    heading: "Poppins",
    body: "Poppins",
    google: "Poppins:wght@400;600;700"
  },
  {
    id: "inter",
    label: "Inter Clean",
    heading: "Inter",
    body: "Inter",
    google: "Inter:wght@400;600;700"
  },
  {
    id: "montserrat",
    label: "Montserrat Bold",
    heading: "Montserrat",
    body: "Open Sans",
    google: "Montserrat:wght@600;700&family=Open+Sans:wght@400;600"
  },
  {
    id: "playfair",
    label: "Playfair Premium",
    heading: "Playfair Display",
    body: "Source Sans 3",
    google: "Playfair+Display:wght@600;700&family=Source+Sans+3:wght@400;600"
  }
];

/** Individual families available in the "All fonts" picker (Google Fonts). */
const ALL_FONTS = [
  { family: "Arsenal", category: "sans", weights: "400;700" },
  { family: "Roboto Condensed", category: "sans", weights: "400;700" },
  { family: "Poppins", category: "sans", weights: "400;600;700" },
  { family: "Inter", category: "sans", weights: "400;600;700" },
  { family: "Montserrat", category: "sans", weights: "400;600;700" },
  { family: "Open Sans", category: "sans", weights: "400;600;700" },
  { family: "Playfair Display", category: "serif", weights: "400;600;700" },
  { family: "Source Sans 3", category: "sans", weights: "400;600;700" },
  { family: "Roboto", category: "sans", weights: "400;500;700" },
  { family: "Lato", category: "sans", weights: "400;700" },
  { family: "Oswald", category: "sans", weights: "400;600;700" },
  { family: "Raleway", category: "sans", weights: "400;600;700" },
  { family: "Nunito", category: "sans", weights: "400;600;700" },
  { family: "Nunito Sans", category: "sans", weights: "400;600;700" },
  { family: "Work Sans", category: "sans", weights: "400;600;700" },
  { family: "DM Sans", category: "sans", weights: "400;500;700" },
  { family: "DM Serif Display", category: "serif", weights: "400" },
  { family: "Space Grotesk", category: "sans", weights: "400;500;700" },
  { family: "Manrope", category: "sans", weights: "400;600;700" },
  { family: "Outfit", category: "sans", weights: "400;600;700" },
  { family: "Figtree", category: "sans", weights: "400;600;700" },
  { family: "Plus Jakarta Sans", category: "sans", weights: "400;600;700" },
  { family: "Sora", category: "sans", weights: "400;600;700" },
  { family: "Urbanist", category: "sans", weights: "400;600;700" },
  { family: "Josefin Sans", category: "sans", weights: "400;600;700" },
  { family: "Bebas Neue", category: "display", weights: "400" },
  { family: "Anton", category: "display", weights: "400" },
  { family: "Archivo", category: "sans", weights: "400;600;700" },
  { family: "Barlow", category: "sans", weights: "400;600;700" },
  { family: "Barlow Condensed", category: "sans", weights: "400;600;700" },
  { family: "Cabin", category: "sans", weights: "400;600;700" },
  { family: "Cairo", category: "sans", weights: "400;600;700" },
  { family: "Catamaran", category: "sans", weights: "400;600;700" },
  { family: "Chivo", category: "sans", weights: "400;700" },
  { family: "Comfortaa", category: "display", weights: "400;700" },
  { family: "Cormorant Garamond", category: "serif", weights: "400;600;700" },
  { family: "Crimson Text", category: "serif", weights: "400;600;700" },
  { family: "EB Garamond", category: "serif", weights: "400;600;700" },
  { family: "Exo 2", category: "sans", weights: "400;600;700" },
  { family: "Fira Sans", category: "sans", weights: "400;600;700" },
  { family: "Francois One", category: "display", weights: "400" },
  { family: "Heebo", category: "sans", weights: "400;600;700" },
  { family: "Hind", category: "sans", weights: "400;600;700" },
  { family: "IBM Plex Sans", category: "sans", weights: "400;600;700" },
  { family: "IBM Plex Serif", category: "serif", weights: "400;600;700" },
  { family: "Inconsolata", category: "mono", weights: "400;700" },
  { family: "Instrument Sans", category: "sans", weights: "400;600;700" },
  { family: "Jost", category: "sans", weights: "400;600;700" },
  { family: "Kanit", category: "sans", weights: "400;600;700" },
  { family: "Karla", category: "sans", weights: "400;700" },
  { family: "Libre Baskerville", category: "serif", weights: "400;700" },
  { family: "Libre Franklin", category: "sans", weights: "400;600;700" },
  { family: "Literata", category: "serif", weights: "400;600;700" },
  { family: "Lora", category: "serif", weights: "400;600;700" },
  { family: "Maven Pro", category: "sans", weights: "400;700" },
  { family: "Merriweather", category: "serif", weights: "400;700" },
  { family: "Mukta", category: "sans", weights: "400;600;700" },
  { family: "Mulish", category: "sans", weights: "400;600;700" },
  { family: "Noto Sans", category: "sans", weights: "400;600;700" },
  { family: "Noto Serif", category: "serif", weights: "400;600;700" },
  { family: "Overpass", category: "sans", weights: "400;600;700" },
  { family: "Oxygen", category: "sans", weights: "400;700" },
  { family: "PT Sans", category: "sans", weights: "400;700" },
  { family: "PT Serif", category: "serif", weights: "400;700" },
  { family: "Pacifico", category: "display", weights: "400" },
  { family: "Permanent Marker", category: "display", weights: "400" },
  { family: "Prompt", category: "sans", weights: "400;600;700" },
  { family: "Quicksand", category: "sans", weights: "400;600;700" },
  { family: "Rajdhani", category: "sans", weights: "400;600;700" },
  { family: "Red Hat Display", category: "sans", weights: "400;600;700" },
  { family: "Roboto Mono", category: "mono", weights: "400;700" },
  { family: "Roboto Slab", category: "serif", weights: "400;700" },
  { family: "Rubik", category: "sans", weights: "400;600;700" },
  { family: "Satisfy", category: "display", weights: "400" },
  { family: "Schibsted Grotesk", category: "sans", weights: "400;700" },
  { family: "Secular One", category: "sans", weights: "400" },
  { family: "Signika", category: "sans", weights: "400;600;700" },
  { family: "Source Code Pro", category: "mono", weights: "400;700" },
  { family: "Source Serif 4", category: "serif", weights: "400;600;700" },
  { family: "Spectral", category: "serif", weights: "400;600;700" },
  { family: "Syne", category: "display", weights: "400;600;700" },
  { family: "Teko", category: "display", weights: "400;600;700" },
  { family: "Titillium Web", category: "sans", weights: "400;600;700" },
  { family: "Ubuntu", category: "sans", weights: "400;700" },
  { family: "Vollkorn", category: "serif", weights: "400;700" },
  { family: "Yanone Kaffeesatz", category: "sans", weights: "400;700" },
  { family: "Yeseva One", category: "display", weights: "400" },
  { family: "Zilla Slab", category: "serif", weights: "400;700" }
];

const BULLET_STYLES = [
  { id: "check-circle", label: "Check in circle" },
  { id: "check-square", label: "Check in square" },
  { id: "disc", label: "Filled disc" },
  { id: "circle", label: "Hollow circle" },
  { id: "square", label: "Square" },
  { id: "dash", label: "Dash" },
  { id: "arrow", label: "Arrow" },
  { id: "chevron", label: "Chevron" },
  { id: "star", label: "Star" },
  { id: "diamond", label: "Diamond" },
  { id: "number", label: "Numbers" }
];

function googleFamilyParam(family, weights = "400;700") {
  return `${String(family).replace(/\s+/g, "+")}:wght@${weights}`;
}

function findFontMeta(family) {
  return ALL_FONTS.find((f) => f.family === family) || null;
}

function buildGoogleHref(families) {
  const unique = [...new Set((families || []).filter(Boolean))];
  if (!unique.length) return "";
  const parts = unique.map((family) => {
    const meta = findFontMeta(family);
    return googleFamilyParam(family, meta?.weights || "400;700");
  });
  return parts.join("&family=");
}

function getFontPair(fontId) {
  return FONT_PAIRS.find((f) => f.id === fontId) || FONT_PAIRS[0];
}

function themeFontFamilies(site, presetFontId) {
  const pair = getFontPair(presetFontId);
  const custom = site?.theme?.custom || {};
  return {
    heading: custom.headingFont || pair.heading,
    body: custom.bodyFont || pair.body,
    pair
  };
}

function collectSiteFontFamilies(site, themeFonts) {
  const set = new Set([themeFonts.heading, themeFonts.body]);
  const sections = [
    site?.hero,
    site?.hiringPartners,
    site?.alumni,
    site?.journey,
    site?.placementGuarantee,
    site?.course,
    site?.jobProfiles,
    site?.feeStructure,
    site?.eligibility,
    site?.nextBatch,
    site?.contact,
    site?.footerPartners
  ];
  sections.forEach((s) => {
    if (s?.headingFont) set.add(s.headingFont);
    if (s?.bodyFont) set.add(s.bodyFont);
    if (s?.titleFont) set.add(s.titleFont);
  });
  return [...set];
}

module.exports = {
  FONT_PAIRS,
  FONT_OPTIONS: FONT_PAIRS,
  ALL_FONTS,
  BULLET_STYLES,
  getFontPair,
  getFont: getFontPair,
  buildGoogleHref,
  themeFontFamilies,
  collectSiteFontFamilies,
  findFontMeta
};
