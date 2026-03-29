import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  const cookie = request.headers.get("cookie") || "";
  if (!cookie.includes("CF_Authorization=")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !file.name.endsWith(".pdf")) {
      return NextResponse.json({ error: "Please upload a PDF file" }, { status: 400 });
    }

    const pat = process.env.GITHUB_PAT;
    const repo = process.env.GITHUB_REPO;
    if (!pat || !repo) {
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    // Convert to base64
    const buffer = await file.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    // First, get the current file SHA (needed to update an existing file)
    const getRes = await fetch(`https://api.github.com/repos/${repo}/contents/public/resume.pdf`, {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "portfolio-admin",
      },
    });

    let sha: string | undefined;
    if (getRes.ok) {
      const getData = await getRes.json() as { sha?: string };
      sha = getData.sha;
    }

    // Commit the PDF via the Contents API
    const putRes = await fetch(`https://api.github.com/repos/${repo}/contents/public/resume.pdf`, {
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
    });

    if (!putRes.ok) {
      const errText = await putRes.text();
      console.error("GitHub error:", putRes.status, errText);
      return NextResponse.json({ error: `GitHub error: ${putRes.status}` }, { status: 502 });
    }

    return NextResponse.json({ status: "uploaded", message: "Resume updated! Site will rebuild." });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Upload failed" }, { status: 500 });
  }
}
