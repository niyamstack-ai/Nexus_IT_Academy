const FONT_OPTIONS = [
  { id: "roboto-condensed", label: "Roboto Condensed", heading: "Arsenal", body: "Roboto Condensed", google: "Arsenal|Roboto+Condensed:wght@400;700" },
  { id: "poppins", label: "Poppins Modern", heading: "Poppins", body: "Poppins", google: "Poppins:wght@400;600;700" },
  { id: "inter", label: "Inter Clean", heading: "Inter", body: "Inter", google: "Inter:wght@400;600;700" },
  { id: "montserrat", label: "Montserrat Bold", heading: "Montserrat", body: "Open Sans", google: "Montserrat:wght@600;700|Open+Sans:wght@400;600" },
  { id: "playfair", label: "Playfair Premium", heading: "Playfair Display", body: "Source Sans 3", google: "Playfair+Display:wght@600;700|Source+Sans+3:wght@400;600" }
];

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
  return FONT_OPTIONS.find((f) => f.id === fontId) || FONT_OPTIONS[0];
}

function getPreset(presetId) {
  return THEME_PRESETS.find((t) => t.id === presetId) || THEME_PRESETS[0];
}

function resolveTheme(site) {
  const preset = getPreset(site.theme?.presetId || "nexus-classic");
  const custom = site.theme?.custom || {};
  const fontId = custom.fontPreset || preset.fonts;
  const font = getFont(fontId);

  return {
    presetId: preset.id,
    presetName: preset.name,
    colors: { ...preset.colors, ...custom.colors },
    fonts: {
      id: font.id,
      heading: custom.headingFont || font.heading,
      body: custom.bodyFont || font.body,
      google: font.google
    }
  };
}

module.exports = { FONT_OPTIONS, THEME_PRESETS, getFont, getPreset, resolveTheme };
