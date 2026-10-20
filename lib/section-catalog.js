/**
 * Shopify-style section catalog.
 * Built-in types are unique page modules.
 * Block types can be added multiple times (site.blocks[id]).
 */

function uid(prefix = "blk") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

const BUILTIN_SECTIONS = [
  { type: "hero", title: "IT academy hero", desc: "Main headline and feature bullets", icon: "hero", unique: true },
  { type: "partners", title: "Brand logo slider", desc: "Hiring partners logo carousel", icon: "slider", unique: true },
  { type: "alumni", title: "Desktop image gallery", desc: "Alumni / placement photo grid", icon: "image", unique: true },
  { type: "journey", title: "Scroll timeline", desc: "Journey steps at Nexus IT", icon: "block", unique: true },
  { type: "guarantee", title: "Placement guarantee", desc: "Guarantee headline band", icon: "block", unique: true },
  { type: "course", title: "Course hero", desc: "Scrum Master course + syllabus", icon: "block", unique: true },
  { type: "jobs", title: "Course listing", desc: "Job profile cards list", icon: "block", unique: true },
  { type: "fees", title: "Fee structure", desc: "Pay-after-placement timeline", icon: "block", unique: true },
  { type: "eligibility", title: "Eligibility", desc: "Who can apply list", icon: "block", unique: true },
  { type: "batch", title: "Training program banner", desc: "Next batch + Join Community", icon: "block", unique: true }
];

const BLOCK_TYPES = [
  {
    type: "bold-heading",
    title: "Bold heading",
    desc: "Large title with optional subtitle",
    icon: "text",
    defaults: () => ({
      type: "bold-heading",
      title: "Bold heading",
      subtitle: "",
      align: "center",
      headingSize: 40,
      headingColor: "#121212",
      headingFont: "",
      paddingTop: 40,
      paddingBottom: 24
    })
  },
  {
    type: "modern-bullets",
    title: "Modern bullet points",
    desc: "Styled checklist with marker designs",
    icon: "block",
    defaults: () => ({
      type: "modern-bullets",
      title: "Why choose us",
      items: [
        "45 Days Training Program",
        "Direct interviews with partner MNCs",
        "1 on 1 Mock Interview Training"
      ],
      bulletStyle: "check-circle",
      bulletColor: "#0aaa7c",
      align: "left",
      headingSize: 32,
      headingColor: "#121212",
      paddingTop: 32,
      paddingBottom: 32
    })
  },
  {
    type: "text-green-circle",
    title: "Text with green circle",
    desc: "Paragraph list with green circle markers",
    icon: "text",
    defaults: () => ({
      type: "text-green-circle",
      title: "",
      items: [
        "Genuine pay after placement model",
        "Dedicated placement support team",
        "Industry-ready Scrum Master syllabus"
      ],
      bulletColor: "#0aaa7c",
      paddingTop: 24,
      paddingBottom: 24
    })
  },
  {
    type: "faq-accordion",
    title: "FAQ accordion",
    desc: "Expandable questions and answers",
    icon: "block",
    defaults: () => ({
      type: "faq-accordion",
      title: "Frequently asked questions",
      items: [
        { q: "Is this a pay after placement program?", a: "Yes. You pay a small registration fee upfront and the rest after placement." },
        { q: "How long is the training?", a: "The core program is 45 days with mock interviews and placement support." },
        { q: "Who can apply?", a: "Graduates and career switchers looking for IT / Scrum Master roles." }
      ],
      headingSize: 32,
      headingColor: "#121212",
      paddingTop: 40,
      paddingBottom: 40
    })
  },
  {
    type: "institute-comparison",
    title: "Institute comparison",
    desc: "Side-by-side comparison table",
    icon: "block",
    defaults: () => ({
      type: "institute-comparison",
      title: "Institute comparison",
      leftLabel: "Others",
      rightLabel: "Nexus IT Academy",
      rows: [
        { label: "Pay after placement", left: "Rare / unclear", right: "Genuine model" },
        { label: "Mock interviews", left: "Limited", right: "1-on-1 practice" },
        { label: "Partner MNCs", left: "Few", right: "50+ hiring partners" }
      ],
      headingSize: 32,
      paddingTop: 40,
      paddingBottom: 40
    })
  },
  {
    type: "others-vs-us",
    title: "Others vs. Us comparison",
    desc: "Two-column vs comparison cards",
    icon: "block",
    defaults: () => ({
      type: "others-vs-us",
      title: "Others vs Us",
      leftTitle: "Others",
      rightTitle: "Us",
      leftItems: ["Hidden fees", "Generic training", "No interview support"],
      rightItems: ["Transparent fee structure", "Job-focused syllabus", "Direct interview scheduling"],
      headingSize: 32,
      paddingTop: 40,
      paddingBottom: 40
    })
  },
  {
    type: "logo-slider",
    title: "Logo slider",
    desc: "Extra logo carousel you can place anywhere",
    icon: "slider",
    defaults: () => ({
      type: "logo-slider",
      title: "Our partners",
      logos: [],
      headingAlign: "center",
      headingSize: 28,
      headingColor: "#121212",
      paddingTop: 32,
      paddingBottom: 32
    })
  },
  {
    type: "image-slider",
    title: "Image slider",
    desc: "Carousel of images / stories",
    icon: "image",
    defaults: () => ({
      type: "image-slider",
      title: "Gallery",
      items: [],
      autoplaySeconds: 5,
      headingSize: 28,
      paddingTop: 32,
      paddingBottom: 32
    })
  },
  {
    type: "image-row",
    title: "Desktop image row",
    desc: "Horizontal row of images",
    icon: "image",
    defaults: () => ({
      type: "image-row",
      title: "",
      items: [],
      paddingTop: 24,
      paddingBottom: 24
    })
  },
  {
    type: "single-image",
    title: "Desktop only image",
    desc: "One wide image banner",
    icon: "image",
    defaults: () => ({
      type: "single-image",
      title: "",
      image: "",
      alt: "",
      link: "",
      desktopOnly: true,
      paddingTop: 16,
      paddingBottom: 16
    })
  },
  {
    type: "mobile-image",
    title: "Mobile only image",
    desc: "Image shown only on mobile",
    icon: "image",
    defaults: () => ({
      type: "mobile-image",
      title: "",
      image: "",
      alt: "",
      mobileOnly: true,
      paddingTop: 16,
      paddingBottom: 16
    })
  },
  {
    type: "custom-button",
    title: "Custom button",
    desc: "Call-to-action button / link",
    icon: "button",
    defaults: () => ({
      type: "custom-button",
      label: "Get started",
      url: "https://qlisen.courses.store",
      openInNewTab: true,
      align: "center",
      style: "primary",
      paddingTop: 20,
      paddingBottom: 20
    })
  },
  {
    type: "android-button",
    title: "Android button",
    desc: "App / store style button",
    icon: "button",
    defaults: () => ({
      type: "android-button",
      label: "Download on Android",
      url: "#",
      openInNewTab: true,
      align: "center",
      paddingTop: 20,
      paddingBottom: 20
    })
  },
  {
    type: "line-divider",
    title: "Line divider",
    desc: "Simple horizontal rule",
    icon: "block",
    defaults: () => ({
      type: "line-divider",
      color: "#e5e7eb",
      thickness: 1,
      width: 100,
      paddingTop: 16,
      paddingBottom: 16
    })
  },
  {
    type: "wave-divider",
    title: "Wave divider",
    desc: "Decorative wave between sections",
    icon: "block",
    defaults: () => ({
      type: "wave-divider",
      flip: false,
      paddingTop: 0,
      paddingBottom: 0
    })
  },
  {
    type: "rich-text",
    title: "Hero shine",
    desc: "Rich text band with heading + body",
    icon: "block",
    defaults: () => ({
      type: "rich-text",
      title: "Shine brighter in your career",
      body: "Train with mentors, practice interviews, and get placed with partner companies.",
      align: "center",
      headingSize: 36,
      headingColor: "#121212",
      paddingTop: 48,
      paddingBottom: 48
    })
  },
  {
    type: "scroll-timeline",
    title: "Custom scroll timeline",
    desc: "Vertical timeline of steps",
    icon: "block",
    defaults: () => ({
      type: "scroll-timeline",
      title: "Your path",
      steps: [
        { title: "Enroll", text: "Join the upcoming batch" },
        { title: "Train", text: "45-day intensive program" },
        { title: "Practice", text: "Mock interviews" },
        { title: "Get placed", text: "Partner MNC interviews" }
      ],
      headingSize: 32,
      paddingTop: 40,
      paddingBottom: 40
    })
  }
];

const CATALOG = [
  ...BUILTIN_SECTIONS.map((s) => ({ ...s, kind: "builtin" })),
  ...BLOCK_TYPES.map((s) => ({
    type: s.type,
    title: s.title,
    desc: s.desc,
    icon: s.icon,
    unique: false,
    kind: "block"
  }))
];

function getBlockType(type) {
  return BLOCK_TYPES.find((b) => b.type === type) || null;
}

function createBlock(type) {
  const def = getBlockType(type);
  if (!def) return null;
  const id = uid();
  return { id, data: { id, ...def.defaults() } };
}

function isBlockSectionId(id) {
  return typeof id === "string" && id.startsWith("blk_");
}

module.exports = {
  CATALOG,
  BUILTIN_SECTIONS,
  BLOCK_TYPES,
  getBlockType,
  createBlock,
  isBlockSectionId,
  uid
};
