const path = require("path");
const fs = require("fs/promises");
const { S3Client, GetObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { processImage, createR2Client, slugify } = require("./process-images");

const JSON_PATH = path.resolve(__dirname, "../data/portfolio_images.json");

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
  const tempKey = process.env.INPUT_TEMP_KEY;
  const title = process.env.INPUT_TITLE;
  const category = process.env.INPUT_CATEGORY;
  const tags = process.env.INPUT_TAGS ? process.env.INPUT_TAGS.split(",").map((t) => t.trim()).filter(Boolean) : [];

  if (!tempKey || !title || !category) {
    console.error("Missing required inputs: INPUT_TEMP_KEY, INPUT_TITLE, INPUT_CATEGORY");
    process.exit(1);
  }

  const r2Client = createR2Client();

  // Download image from R2 temp
  console.log(`Downloading from R2: ${tempKey}`);
  const getRes = await r2Client.send(
    new GetObjectCommand({ Bucket: bucket, Key: tempKey })
  );
  const imageBuffer = await streamToBuffer(getRes.Body);

  // Write to a local temp file for processImage (it reads from file path)
  const tempDir = path.resolve(__dirname, "../.tmp");
  await fs.mkdir(tempDir, { recursive: true });
  const localPath = path.join(tempDir, path.basename(tempKey));
  await fs.writeFile(localPath, imageBuffer);

  // Read existing manifest
  let existing = [];
  try {
    const raw = await fs.readFile(JSON_PATH, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    existing = [];
  }

  const existingIds = new Set(existing.map((e) => e.id));
  let maxOrder = existing.reduce((max, e) => Math.max(max, e.order || 0), 0);

  // Process the image
  const entry = await processImage(localPath, category, r2Client, bucket, publicUrl);

  // Override title and tags from inputs (processImage derives title from filename)
  entry.title = title;
  entry.tags = tags;

  if (existingIds.has(entry.id)) {
    console.error(`Duplicate ID: ${entry.id} — aborting`);
    process.exit(1);
  }

  maxOrder++;
  entry.order = maxOrder;

  // Update JSON
  const merged = [...existing, entry];
  await fs.writeFile(JSON_PATH, JSON.stringify(merged, null, 2));
  console.log(`Added: ${entry.id} (order: ${maxOrder})`);

  // Clean up: delete temp file from R2
  await r2Client.send(
    new DeleteObjectCommand({ Bucket: bucket, Key: tempKey })
  );
  console.log(`Deleted R2 temp: ${tempKey}`);

  // Clean up local temp
  await fs.unlink(localPath);
  await fs.rmdir(tempDir).catch(() => {});

  console.log("Done.");
}

run().catch((err) => {
  console.error("Processing failed:", err);
  process.exit(1);
});
