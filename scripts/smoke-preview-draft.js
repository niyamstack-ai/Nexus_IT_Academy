/**
 * Smoke test: login → preview-draft → /preview shows draft → / does not.
 * Uses env ADMIN_USERNAME / ADMIN_PASSWORD (defaults match LOCAL_DEV test).
 */
const base = process.env.BASE_URL || "http://localhost:3000";
const username = process.env.ADMIN_USERNAME || "testadmin";
const password = process.env.ADMIN_PASSWORD || "testpass123";

async function main() {
  const jar = { cookie: "" };

  function storeCookies(res) {
    const raw = res.headers.getSetCookie?.() || [];
    const fallback = res.headers.get("set-cookie");
    const list = raw.length ? raw : fallback ? [fallback] : [];
    for (const c of list) {
      const part = c.split(";")[0];
      jar.cookie = jar.cookie ? `${jar.cookie}; ${part}` : part;
    }
  }

  async function req(path, opts = {}) {
    const headers = { ...(opts.headers || {}) };
    if (jar.cookie) headers.Cookie = jar.cookie;
    if (opts.body && !headers["Content-Type"]) headers["Content-Type"] = "application/json";
    const res = await fetch(`${base}${path}`, { ...opts, headers });
    storeCookies(res);
    const text = await res.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      /* html */
    }
    return { res, text, json };
  }

  const login = await req("/api/admin/login", {
    method: "POST",
    body: JSON.stringify({ username, password })
  });
  if (!login.res.ok) {
    console.error("LOGIN_FAIL", login.text);
    process.exit(1);
  }
  console.log("login ok");

  const me = await req("/api/admin/me");
  if (!me.json?.authenticated) {
    console.error("AUTH_FAIL", me.json);
    process.exit(1);
  }

  const marker = `DRAFT_HEADLINE_${Date.now()}`;
  const draftBody = {
    siteName: "Draft Test",
    meta: { title: "Draft", description: "d" },
    logo: "",
    footerLogo: "",
    theme: { presetId: "nexus-classic", custom: { fontPreset: "arsenal-roboto", colors: {} } },
    ticker: { enabled: true, items: ["draft ticker"], speed: 75 },
    navigation: { register: {}, login: {} },
    hero: { headline: marker, features: ["feat"] },
    hiringPartners: { title: "", logos: [] },
    alumni: { title: "", items: [] },
    journey: { title: "", steps: [] },
    placementGuarantee: { title: "", subtitle: "" },
    course: { enabled: false, modules: [] },
    jobProfiles: { enabled: false, items: [] },
    feeStructure: { title: "", steps: [] },
    eligibility: { enabled: false, items: [] },
    nextBatch: { enabled: false },
    community: { enabled: false },
    contact: {},
    footerPartners: { logos: [] },
    domain: {}
  };

  const draft = await req("/api/admin/preview-draft", {
    method: "PUT",
    body: JSON.stringify(draftBody)
  });
  if (!draft.res.ok) {
    console.error("DRAFT_FAIL", draft.text);
    process.exit(1);
  }
  console.log("draft ok");

  const preview = await req("/preview");
  if (!preview.text.includes(marker)) {
    console.error("PREVIEW_MISSING_MARKER");
    process.exit(1);
  }
  console.log("preview shows draft");

  const live = await fetch(`${base}/`);
  const liveHtml = await live.text();
  if (liveHtml.includes(marker)) {
    console.error("PUBLIC_LEAKED_DRAFT");
    process.exit(1);
  }
  console.log("public site clean");

  const site = await req("/api/admin/site");
  if (site.json?.hero?.headline === marker) {
    console.error("SITE_WAS_PUBLISHED");
    process.exit(1);
  }
  console.log("published site unchanged");
  console.log("SMOKE_OK");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
