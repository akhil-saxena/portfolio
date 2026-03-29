/**
 * Re-processes all existing photos to generate missing variants (large, small)
 * and update dimensions. Does NOT create new JSON entries — updates existing ones.
 */
const path = require("path");
const fs = require("fs/promises");
const sharp = require("sharp");
const { S3Client, PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");

const JSON_PATH = path.resolve(__dirname, "../data/portfolio_images.json");

const VARIANTS = [
  { suffix: "", maxWidth: 2000, quality: 85, urlKey: "original" },
  { suffix: "-lg", maxWidth: 1200, quality: 85, urlKey: "large" },
  { suffix: "-md", maxWidth: 800, quality: 85, urlKey: "medium" },
  { suffix: "-sm", maxWidth: 400, quality: 80, urlKey: "small" },
];

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

async function addWatermark(imageBuffer, width) {
  const fontSize = Math.max(10, Math.min(24, Math.round(width * 0.01)));
  const metadata = await sharp(imageBuffer).metadata();
  const height = metadata.height || Math.round(width * 0.67);
  const xOffset = Math.round(width * 0.015);
  const yOffset = Math.round(width * 0.015);

  const svgText = `
    <svg width="${width}" height="${height}">
      <text x="${width - xOffset}" y="${height - yOffset}"
        font-family="monospace" font-size="${fontSize}" font-weight="400"
        fill="rgba(255,255,255,0.20)" text-anchor="end"
        letter-spacing="0.08em">akhil saxena</text>
    </svg>
  `;

  return sharp(imageBuffer)
    .composite([{ input: Buffer.from(svgText), gravity: "center" }])
    .toBuffer();
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function run() {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  const r2Client = createR2Client();

  const data = JSON.parse(await fs.readFile(JSON_PATH, "utf-8"));
  console.log(`Processing ${data.length} photos...`);

  for (const entry of data) {
    const { id, category } = entry;
    const slug = id.replace(`${category}-`, "");

    // Download the existing original from R2
    console.log(`\n[${id}] Downloading original...`);
    let imageBuffer;
    try {
      const res = await r2Client.send(new GetObjectCommand({
        Bucket: bucket,
        Key: `photos/${category}/${slug}.webp`,
      }));
      imageBuffer = await streamToBuffer(res.Body);
    } catch (err) {
      // Try private clean original
      try {
        const res = await r2Client.send(new GetObjectCommand({
          Bucket: bucket,
          Key: `private/${category}/${slug}-clean.webp`,
        }));
        imageBuffer = await streamToBuffer(res.Body);
      } catch {
        console.log(`  SKIP — no source found on R2`);
        continue;
      }
    }

    const metadata = await sharp(imageBuffer).metadata();
    const sourceWidth = metadata.width || 2000;
    console.log(`  Source: ${sourceWidth}x${metadata.height}`);

    // Update dimensions
    entry.dimensions = {
      width: metadata.width || 2000,
      height: metadata.height || 1333,
    };

    // Generate and upload all variants
    for (const variant of VARIANTS) {
      const width = Math.min(variant.maxWidth, sourceWidth);
      const resizedBuffer = await sharp(imageBuffer)
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: variant.quality })
        .toBuffer();

      // Apply watermark (not to thumb)
      const finalBuffer = await addWatermark(resizedBuffer, width);

      const r2Key = `photos/${category}/${slug}${variant.suffix}.webp`;
      await r2Client.send(new PutObjectCommand({
        Bucket: bucket,
        Key: r2Key,
        Body: finalBuffer,
        ContentType: "image/webp",
      }));

      entry.urls[variant.urlKey] = `${publicUrl}/${r2Key}`;
      console.log(`  ✓ ${variant.urlKey} (${width}px)`);
    }

    // Upload clean original to private
    const cleanOriginal = await sharp(imageBuffer)
      .resize({ width: Math.min(2000, sourceWidth), withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    await r2Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: `private/${category}/${slug}-clean.webp`,
      Body: cleanOriginal,
      ContentType: "image/webp",
    }));
    console.log(`  ✓ private clean original`);

    // Regenerate thumb
    const thumbBuffer = await sharp(imageBuffer)
      .resize({ width: 40, withoutEnlargement: true })
      .webp({ quality: 60 })
      .toBuffer();
    entry.urls.thumb = `data:image/webp;base64,${thumbBuffer.toString("base64")}`;
    console.log(`  ✓ thumb`);
  }

  await fs.writeFile(JSON_PATH, JSON.stringify(data, null, 2));
  console.log(`\nDone. Updated ${data.length} entries.`);
}

run().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
