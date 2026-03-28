const path = require("path");
const fs = require("fs/promises");
const { processImage, createR2Client } = require("./process-images");

const NEW_PHOTOS_DIR = path.resolve(__dirname, "../new-photos");
const JSON_PATH = path.resolve(__dirname, "../data/portfolio_images.json");
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".tiff"]);

async function run() {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;
  const r2Client = createR2Client();

  let existing = [];
  try {
    const raw = await fs.readFile(JSON_PATH, "utf-8");
    existing = JSON.parse(raw);
  } catch {
    existing = [];
  }

  const existingIds = new Set(existing.map((e) => e.id));
  let maxOrder = existing.reduce((max, e) => Math.max(max, e.order || 0), 0);

  const categories = await fs.readdir(NEW_PHOTOS_DIR);
  const toProcess = [];

  for (const category of categories) {
    if (category === ".gitkeep") continue;
    const catDir = path.join(NEW_PHOTOS_DIR, category);
    const stat = await fs.stat(catDir);
    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(catDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!IMAGE_EXTS.has(ext)) continue;
      toProcess.push({ filePath: path.join(catDir, file), category, file });
    }
  }

  if (toProcess.length === 0) {
    console.log("No images to process.");
    return;
  }

  console.log(`Processing ${toProcess.length} images...`);
  const newEntries = [];
  const processedFiles = [];

  for (const { filePath, category, file } of toProcess) {
    const entry = await processImage(filePath, category, r2Client, bucket, publicUrl);

    if (existingIds.has(entry.id)) {
      console.warn(`SKIP (duplicate id): ${entry.id} — rename or remove existing entry first`);
      continue;
    }

    maxOrder++;
    entry.order = maxOrder;
    newEntries.push(entry);
    processedFiles.push(filePath);
    console.log(`OK: ${entry.id}`);
  }

  if (newEntries.length === 0) {
    console.log("No new entries to add (all duplicates).");
    return;
  }

  const merged = [...existing, ...newEntries];
  await fs.writeFile(JSON_PATH, JSON.stringify(merged, null, 2));

  for (const filePath of processedFiles) {
    await fs.unlink(filePath);
  }

  for (const category of categories) {
    if (category === ".gitkeep") continue;
    const catDir = path.join(NEW_PHOTOS_DIR, category);
    try {
      const remaining = await fs.readdir(catDir);
      if (remaining.length === 0) {
        await fs.rmdir(catDir);
      }
    } catch {
      // ignore
    }
  }

  console.log(`\nProcessed ${newEntries.length} images. Total in manifest: ${merged.length}`);
}

run().catch((err) => {
  console.error("Processing failed:", err);
  process.exit(1);
});
