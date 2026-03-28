const sharp = require("sharp");
const path = require("path");
const fs = require("fs/promises");
const exifr = require("exifr");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

const VARIANTS = [
  { suffix: "", maxWidth: 2000, quality: 85 },
  { suffix: "-md", maxWidth: 800, quality: 85 },
];
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

async function processImage(filePath, category, r2Client, bucket, publicUrl) {
  const ext = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath, ext);
  const slug = slugify(baseName);
  const id = `${category}-${slug}`;

  const exif = await extractExif(filePath);

  const imageBuffer = await fs.readFile(filePath);
  const metadata = await sharp(imageBuffer).metadata();
  const sourceWidth = metadata.width || 2000;

  const urls = { original: "", medium: "", thumb: "" };

  for (const variant of VARIANTS) {
    const width = Math.min(variant.maxWidth, sourceWidth);
    const webpBuffer = await sharp(imageBuffer)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: variant.quality })
      .toBuffer();

    const r2Key = `photos/${category}/${slug}${variant.suffix}.webp`;

    await r2Client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: webpBuffer,
        ContentType: "image/webp",
      })
    );

    const urlKey = variant.suffix === "" ? "original" : "medium";
    urls[urlKey] = `${publicUrl}/${r2Key}`;
  }

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

module.exports = { processImage, createR2Client, slugify, titleCase, extractExif };
