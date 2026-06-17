import { type NextRequest, NextResponse } from "next/server";
import { requireAccess } from "@/lib/access";
import { toBase64 } from "@/lib/base64";

export const runtime = "edge";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export async function POST(request: NextRequest) {
  const denied = await requireAccess(request);
  if (denied) return denied;

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File) || !file.name.toLowerCase().endsWith(".pdf")) {
      return NextResponse.json({ error: "Please upload a PDF file" }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 413 });
    }

    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    // PDF magic bytes: "%PDF-"
    const isPdf =
      bytes[0] === 0x25 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x44 &&
      bytes[3] === 0x46 &&
      bytes[4] === 0x2d;
    if (!isPdf) {
      return NextResponse.json({ error: "File is not a valid PDF" }, { status: 415 });
    }

    const pat = process.env.GITHUB_PAT;
    const repo = process.env.GITHUB_REPO;
    if (!pat || !repo) {
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    const base64 = toBase64(buffer);

    // Get the current file SHA (required to update an existing file).
    const getRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/public/resume.pdf`,
      {
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "portfolio-admin",
        },
      },
    );

    let sha: string | undefined;
    if (getRes.ok) {
      const getData = (await getRes.json()) as { sha?: string };
      sha = getData.sha;
    }

    const putRes = await fetch(
      `https://api.github.com/repos/${repo}/contents/public/resume.pdf`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${pat}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "portfolio-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: "chore: update resume PDF via admin",
          content: base64,
          ...(sha ? { sha } : {}),
        }),
      },
    );

    if (!putRes.ok) {
      console.error("GitHub error:", putRes.status, await putRes.text());
      return NextResponse.json({ error: "Upload to repository failed" }, { status: 502 });
    }

    return NextResponse.json({ status: "uploaded", message: "Resume updated! Site will rebuild." });
  } catch (err) {
    console.error("upload-resume failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
