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
    height: 675,
    aspectRatio: 16 / 9,
    quality: 78,
    hint: "Recommended: 1200 x 675 px (16:9 photo)"
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
      fit: "cover",
      position: "centre"
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

module.exports = {
  IMAGE_PRESETS,
  UPLOAD_DIR,
  ensureUploadDir,
  processAndSaveImage
};
