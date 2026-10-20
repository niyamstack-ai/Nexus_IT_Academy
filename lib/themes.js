const {
  FONT_OPTIONS,
  FONT_PAIRS,
  ALL_FONTS,
  BULLET_STYLES,
  getFontPair,
  buildGoogleHref,
  themeFontFamilies,
  collectSiteFontFamilies
} = require("./fonts");

const THEME_PRESETS = [
  {
    id: "nexus-classic",
    name: "Nexus Classic",
    description: "Original black hero with magenta accent — pay-after-placement focus.",
    category: "coaching",
    colors: {
      primary: "#bc0d5d",
      accent: "#121212",
      heroBg: "#000000",
      heroText: "#ffffff",
      tickerBg: "#bc0d5d",
      tickerText: "#ffffff",
      journeyBg: "#121212",
      journeyText: "#ffffff",
      sectionBg: "#ffffff",
      mutedBg: "#e8e8e8",
      gradientStart: "#333333",
      gradientEnd: "#1878b9"
    },
    fonts: "roboto-condensed"
  },
  {
    id: "career-blue",
    name: "Career Blue",
    description: "Professional blue theme for IT training & placement institutes.",
    category: "coaching",
    colors: {
      primary: "#1565c0",
      accent: "#0d47a1",
      heroBg: "#0a1929",
      heroText: "#ffffff",
      tickerBg: "#1565c0",
      tickerText: "#ffffff",
      journeyBg: "#0d47a1",
      journeyText: "#ffffff",
      sectionBg: "#ffffff",
      mutedBg: "#e3f2fd",
      gradientStart: "#0d47a1",
      gradientEnd: "#42a5f5"
    },
    fonts: "inter"
  },
  {
    id: "growth-green",
    name: "Growth Green",
    description: "Fresh green theme emphasizing placement success & growth.",
    category: "coaching",
    colors: {
      primary: "#0aaa7c",
      accent: "#064e3b",
      heroBg: "#022c22",
      heroText: "#ffffff",
      tickerBg: "#059669",
      tickerText: "#ffffff",
      journeyBg: "#064e3b",
      journeyText: "#ffffff",
      sectionBg: "#ffffff",
      mutedBg: "#ecfdf5",
      gradientStart: "#064e3b",
      gradientEnd: "#34d399"
    },
    fonts: "poppins"
  },
  {
    id: "premium-purple",
    name: "Premium Purple",
    description: "Modern purple theme for premium coaching academies.",
    category: "coaching",
    colors: {
      primary: "#7c3aed",
      accent: "#4c1d95",
      heroBg: "#1e1b4b",
      heroText: "#ffffff",
      tickerBg: "#7c3aed",
      tickerText: "#ffffff",
      journeyBg: "#4c1d95",
      journeyText: "#ffffff",
      sectionBg: "#ffffff",
      mutedBg: "#f5f3ff",
      gradientStart: "#4c1d95",
      gradientEnd: "#a78bfa"
    },
    fonts: "montserrat"
  },
  {
    id: "trust-navy",
    name: "Trust Navy",
    description: "Corporate navy theme for enterprise IT consultancy branding.",
    category: "coaching",
    colors: {
      primary: "#c9a227",
      accent: "#1a2744",
      heroBg: "#0f172a",
      heroText: "#ffffff",
      tickerBg: "#1a2744",
      tickerText: "#ffffff",
      journeyBg: "#1a2744",
      journeyText: "#ffffff",
      sectionBg: "#ffffff",
      mutedBg: "#f1f5f9",
      gradientStart: "#1a2744",
      gradientEnd: "#c9a227"
    },
    fonts: "playfair"
  },
  {
    id: "sunrise-orange",
    name: "Sunrise Orange",
    description: "Energetic orange theme for bootcamp & upskilling programs.",
    category: "coaching",
    colors: {
      primary: "#ea580c",
      accent: "#7c2d12",
      heroBg: "#1c1917",
      heroText: "#ffffff",
      tickerBg: "#ea580c",
      tickerText: "#ffffff",
      journeyBg: "#7c2d12",
      journeyText: "#ffffff",
      sectionBg: "#ffffff",
      mutedBg: "#fff7ed",
      gradientStart: "#7c2d12",
      gradientEnd: "#fb923c"
    },
    fonts: "poppins"
  }
];

function getFont(fontId) {
  return getFontPair(fontId);
}

function getPreset(presetId) {
  return THEME_PRESETS.find((t) => t.id === presetId) || THEME_PRESETS[0];
}

function resolveTheme(site) {
  const preset = getPreset(site.theme?.presetId || "nexus-classic");
  const custom = site.theme?.custom || {};
  const fontId = custom.fontPreset || preset.fonts;
  const themeFonts = themeFontFamilies(site, fontId);
  const families = collectSiteFontFamilies(site, themeFonts);

  return {
    presetId: preset.id,
    presetName: preset.name,
    colors: { ...preset.colors, ...custom.colors },
    fonts: {
      id: fontId,
      heading: themeFonts.heading,
      body: themeFonts.body,
      google: buildGoogleHref(families)
    }
  };
}

module.exports = {
  FONT_OPTIONS,
  FONT_PAIRS,
  ALL_FONTS,
  BULLET_STYLES,
  THEME_PRESETS,
  getFont,
  getPreset,
  resolveTheme
};
