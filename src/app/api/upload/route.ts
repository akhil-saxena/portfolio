import { type NextRequest, NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { toBase64 } from "@/lib/base64";

export const runtime = "edge";

const MAX_BYTES = 25 * 1024 * 1024; // 25 MB
const ALLOWED_EXT = new Set(["jpg", "jpeg", "png", "webp", "gif", "heic", "heif", "tif", "tiff"]);

export async function POST(request: NextRequest) {
  const denied = await requireAccess(request);
  if (denied) return denied;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const category = (formData.get("category") as string) || "uncategorized";
    const title =
      (formData.get("title") as string) || (file instanceof File ? file.name : "untitled");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 413 });
    }
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (!ALLOWED_EXT.has(ext) || !(file.type === "" || file.type.startsWith("image/"))) {
      return NextResponse.json({ error: "Only image files are allowed" }, { status: 415 });
    }

    const pat = process.env.GITHUB_PAT;
    const repo = process.env.GITHUB_REPO;
    if (!pat || !repo) {
      return NextResponse.json({ error: "GitHub credentials not configured" }, { status: 500 });
    }

    const base64 = toBase64(await file.arrayBuffer());
    const safeName = title.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    const safeCategory = category.replace(/[^a-zA-Z0-9_-]/g, "") || "uncategorized";
    const path = `new-photos/${safeCategory}/${safeName}.${ext}`;

    // Commit to the repo — this triggers the process-photos Action.
    const res = await fetch(`https://api.github.com/repos/${repo}/contents/${path}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "portfolio-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: `chore: upload photo ${safeName} via admin`,
        content: base64,
      }),
    });

    if (!res.ok) {
      console.error("GitHub upload failed:", res.status, await res.text());
      return NextResponse.json({ error: "Upload to repository failed" }, { status: 502 });
    }

    return NextResponse.json({
      status: "uploaded",
      message: `Photo committed to ${path}. The GitHub Action will process it automatically.`,
      path,
    });
  } catch (err) {
    console.error("upload failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
