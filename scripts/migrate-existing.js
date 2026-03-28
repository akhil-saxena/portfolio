const path = require("path");
const fs = require("fs/promises");
const { processImage, createR2Client } = require("./process-images");

const SOURCE_DIR = path.resolve(__dirname, "../../temp-website-project/akhil-photo/public/images/portfolio");
const JSON_PATH = path.resolve(__dirname, "../data/portfolio_images.json");
const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".tiff"]);

async function migrate() {
  const bucket = process.env.R2_BUCKET_NAME;
  const publicUrl = process.env.R2_PUBLIC_URL;

  if (!bucket || !publicUrl) {
    console.error("Missing R2_BUCKET_NAME or R2_PUBLIC_URL env vars");
    process.exit(1);
  }

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

  const categories = await fs.readdir(SOURCE_DIR);
  const newEntries = [];

  for (const category of categories) {
    const catDir = path.join(SOURCE_DIR, category);
    const stat = await fs.stat(catDir);
    if (!stat.isDirectory()) continue;

    const files = await fs.readdir(catDir);
    for (const file of files) {
      const ext = path.extname(file).toLowerCase();
      if (!IMAGE_EXTS.has(ext)) continue;

      const filePath = path.join(catDir, file);
      const entry = await processImage(filePath, category, r2Client, bucket, publicUrl);

      if (existingIds.has(entry.id)) {
        console.log(`SKIP (duplicate): ${entry.id}`);
        continue;
      }

      maxOrder++;
      entry.order = maxOrder;
      newEntries.push(entry);
      console.log(`OK: ${entry.id} (order: ${maxOrder})`);
    }
  }

  if (newEntries.length === 0) {
    console.log("No new images to migrate.");
    return;
  }

  const merged = [...existing, ...newEntries];
  await fs.writeFile(JSON_PATH, JSON.stringify(merged, null, 2));
  console.log(`\nMigrated ${newEntries.length} images. Total: ${merged.length}`);
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
