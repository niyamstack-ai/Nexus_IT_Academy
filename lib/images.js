const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const sharp = require("sharp");

const UPLOAD_DIR = path.join(__dirname, "..", "public", "uploads");

const IMAGE_PRESETS = {
  logo: {
    label: "Site Logo",
    width: 500,
    height: 140,
    aspectRatio: 500 / 140,
    quality: 82,
    hint: "Recommended: 500 x 140 px (header logo)"
  },
  footerLogo: {
    label: "Footer Logo",
    width: 520,
    height: 160,
    aspectRatio: 520 / 160,
    quality: 82,
    hint: "Recommended: 520 x 160 px"
  },
  partnerLogo: {
    label: "Partner Logo",
    width: 400,
    height: 120,
    aspectRatio: 400 / 120,
    quality: 80,
    hint: "Recommended: 400 x 120 px (company logo)"
  },
  alumni: {
    label: "Success Story Photo",
    width: 1200,
    height: 900,
    aspectRatio: NaN,
    fit: "inside",
    quality: 82,
    hint: "Recommended: wide alumni card photo. Full image is kept (no top/bottom crop)."
  },
  journeyIcon: {
    label: "Journey Step Icon",
    width: 128,
    height: 128,
    aspectRatio: 1,
    quality: 85,
    hint: "Recommended: 128 x 128 px (square icon)"
  }
};

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  }
}

function parseBase64Image(dataUrl) {
  const match = String(dataUrl || "").match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error("Invalid image data");
  return { format: match[1], buffer: Buffer.from(match[2], "base64") };
}

async function processAndSaveImage(dataUrl, presetId) {
  const preset = IMAGE_PRESETS[presetId];
  if (!preset) throw new Error("Unknown image preset");

  ensureUploadDir();
  const { buffer } = parseBase64Image(dataUrl);

  const processed = await sharp(buffer)
    .rotate()
    .resize(preset.width, preset.height, {
      fit: preset.fit || "cover",
      position: "top",
      withoutEnlargement: preset.fit === "inside"
    })
    .webp({ quality: preset.quality, effort: 4 })
    .toBuffer();

  const filename = `${presetId}-${Date.now()}-${crypto.randomBytes(4).toString("hex")}.webp`;
  const filepath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filepath, processed);

  return {
    url: `/uploads/${filename}`,
    width: preset.width,
    height: preset.height,
    sizeKB: Math.round(processed.length / 1024),
    preset: presetId
  };
}

function downloadUrl(url) {
  return new Promise((resolve, reject) => {
    const https = require("https");
    const http = require("http");
    const client = url.startsWith("https") ? https : http;
    const req = client.get(url, { headers: { "User-Agent": "NexusCMS/1.0" } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        reject(new Error(`Could not download image (${res.statusCode})`));
        return;
      }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error("Image download timed out"));
    });
  });
}

async function localizeExternalUrl(url, presetId) {
  if (!url || typeof url !== "string") return url;
  if (url.startsWith("/uploads/")) return url;
  if (!/^https?:\/\//i.test(url)) return url;

  const preset = IMAGE_PRESETS[presetId] || IMAGE_PRESETS.partnerLogo;
  ensureUploadDir();
  const buffer = await downloadUrl(url);
  const processed = await sharp(buffer)
    .rotate()
    .resize(preset.width, preset.height, {
      fit: "inside",
      withoutEnlargement: true
    })
    .webp({ quality: preset.quality, effort: 4 })
    .toBuffer();

  const filename = `${presetId}-imported-${Date.now()}-${crypto.randomBytes(3).toString("hex")}.webp`;
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), processed);
  return `/uploads/${filename}`;
}

async function localizeSiteImages(site) {
  const out = JSON.parse(JSON.stringify(site));
  out.logo = await localizeExternalUrl(out.logo, "logo");
  out.footerLogo = await localizeExternalUrl(out.footerLogo, "footerLogo");
  for (const logo of out.hiringPartners?.logos || []) {
    logo.url = await localizeExternalUrl(logo.url, "partnerLogo");
  }
  for (const item of out.alumni?.items || []) {
    item.image = await localizeExternalUrl(item.image, "alumni");
  }
  for (const step of out.journey?.steps || []) {
    step.icon = await localizeExternalUrl(step.icon, "journeyIcon");
  }
  for (const logo of out.footerPartners?.logos || []) {
    logo.url = await localizeExternalUrl(logo.url, "partnerLogo");
  }
  out.updatedAt = new Date().toISOString();
  return out;
}

module.exports = {
  IMAGE_PRESETS,
  UPLOAD_DIR,
  ensureUploadDir,
  processAndSaveImage,
  localizeSiteImages
};
