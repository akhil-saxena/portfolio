const sharp = require("sharp");
const path = require("path");
const fs = require("fs/promises");
const exifr = require("exifr");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const VARIANTS = [
  { suffix: "", maxWidth: 2000, quality: 85 },
  { suffix: "-lg", maxWidth: 1200, quality: 85 },
  { suffix: "-md", maxWidth: 800, quality: 85 },
  { suffix: "-sm", maxWidth: 400, quality: 80 },
];
const URL_KEY_MAP = { "": "original", "-lg": "large", "-md": "medium", "-sm": "small" };
const THUMB_WIDTH = 40;
const THUMB_QUALITY = 60;

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function titleCase(name) {
  return name
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function extractExif(filePath) {
  try {
    const data = await exifr.parse(filePath, {
      pick: ["Make", "Model", "LensModel", "FNumber", "ExposureTime", "ISO", "FocalLength"],
      gps: false,
    });
    if (!data) return null;

    return {
      camera: [data.Make, data.Model].filter(Boolean).join(" ") || null,
      lens: data.LensModel || null,
      aperture: data.FNumber ? `f/${data.FNumber}` : null,
      shutter: data.ExposureTime
        ? data.ExposureTime < 1
          ? `1/${Math.round(1 / data.ExposureTime)}`
          : `${data.ExposureTime}s`
        : null,
      iso: data.ISO || null,
      focalLength: data.FocalLength ? `${data.FocalLength}mm` : null,
    };
  } catch {
    return null;
  }
}

async function addWatermark(imageBuffer, width) {
  const fontSize = Math.max(10, Math.min(24, Math.round(width * 0.01)));
  const xOffset = Math.round(width * 0.015);
  const yOffset = Math.round(width * 0.015);

  // Get image height for positioning
  const metadata = await sharp(imageBuffer).metadata();
  const height = metadata.height || Math.round(width * 0.67);

  const svgText = `
    <svg width="${width}" height="${height}">
      <text
        x="${width - xOffset}"
        y="${height - yOffset}"
        font-family="monospace"
        font-size="${fontSize}"
        font-weight="400"
        fill="rgba(255,255,255,0.20)"
        text-anchor="end"
        dominant-baseline="auto"
        letter-spacing="0.08em"
      >akhil saxena</text>
    </svg>
  `;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svgText), gravity: "center" }])
    .toBuffer();
}

async function processImage(filePath, category, r2Client, bucket, publicUrl) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);
  const slug = slugify(baseName);
  const id = `${category}-${slug}`;

  const exif = await extractExif(filePath);

  const imageBuffer = await fs.readFile(filePath);
  const metadata = await sharp(imageBuffer).metadata();
  const sourceWidth = metadata.width || 2000;

  const urls = { original: "", large: "", medium: "", small: "", thumb: "" };

  // Process and upload variants with watermark
  for (const variant of VARIANTS) {
    const width = Math.min(variant.maxWidth, sourceWidth);
    const resizedBuffer = await sharp(imageBuffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: variant.quality })
      .toBuffer();

    // Apply watermark to original and medium (not thumb)
    const watermarkedBuffer = await addWatermark(resizedBuffer, width);

    const r2Key = `photos/${category}/${slug}${variant.suffix}.webp`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: watermarkedBuffer,
        ContentType: "image/webp",
      })
    );

    const urlKey = URL_KEY_MAP[variant.suffix];
    urls[urlKey] = `${publicUrl}/${r2Key}`;
  }

  // Upload clean (unwatermarked) original to /private/
  const cleanOriginal = await sharp(imageBuffer)
    .resize({ width: Math.min(2000, sourceWidth), withoutEnlargement: true })
    .webp({ quality: 85 })
    .toBuffer();

  await r2Client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: `private/${category}/${slug}-clean.webp`,
      Body: cleanOriginal,
      ContentType: "image/webp",
    })
  );

  // Generate base64 thumbnail (no watermark — too small)
  const thumbBuffer = await sharp(imageBuffer)
    .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: THUMB_QUALITY })
    .toBuffer();
  urls.thumb = `data:image/webp;base64,${thumbBuffer.toString("base64")}`;

  return {
    id,
    title: titleCase(baseName),
    category,
    tags: [],
    date: new Date().toISOString().split("T")[0],
    exif: exif || {
      camera: null,
      lens: null,
      aperture: null,
      shutter: null,
      iso: null,
      focalLength: null,
    },
    urls,
    dimensions: {
      width: metadata.width || 2000,
      height: metadata.height || 1333,
    },
  };
}

function createR2Client() {
  return new S3Client({
    region: "auto",
    endpoint: process.env.R2_ENDPOINT,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
  });
}

module.exports = { processImage, createR2Client, slugify, titleCase, extractExif, addWatermark };
