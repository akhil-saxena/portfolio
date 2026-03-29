import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  // Auth check
  const cookie = request.headers.get("cookie") || "";
  if (!cookie.includes("CF_Authorization=")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const category = formData.get("category") as string || "uncategorized";
    const title = formData.get("title") as string || file?.name || "untitled";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const pat = process.env.GITHUB_PAT;
    const repo = process.env.GITHUB_REPO;
    if (!pat || !repo) {
      return NextResponse.json({ error: "GitHub credentials not configured" }, { status: 500 });
    }

    // Convert file to base64
    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    // Sanitize filename
    const safeName = title.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    const ext = file.name.split(".").pop() || "jpg";
    const path = `new-photos/${category}/${safeName}.${ext}`;

    // Commit file to GitHub repo — this triggers the process-photos Action
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
      const err = await res.text();
      return NextResponse.json({ error: `GitHub upload failed: ${res.status} — ${err}` }, { status: 502 });
    }

    return NextResponse.json({
      status: "uploaded",
      message: `Photo committed to ${path}. The GitHub Action will process it automatically.`,
      path,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload failed" },
      { status: 500 }
    );
  }
}
