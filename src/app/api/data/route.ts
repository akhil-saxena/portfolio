import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    // Auth check — require CF Access session
    const cookie = request.headers.get("cookie") || "";
    if (!cookie.includes("CF_Authorization=")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pat = process.env.GITHUB_PAT;
    const repo = process.env.GITHUB_REPO;
    if (!pat || !repo) {
      return NextResponse.json({ error: "Missing env vars" }, { status: 500 });
    }

    const headers = {
      Authorization: `Bearer ${pat}`,
      "User-Agent": "portfolio-admin",
      Accept: "application/vnd.github.raw+json",
    };

    const [photosRes, resumeRes, branchRes] = await Promise.all([
      fetch(`https://api.github.com/repos/${repo}/contents/data/portfolio_images.json`, { headers }),
      fetch(`https://api.github.com/repos/${repo}/contents/data/resume.json`, { headers }),
      fetch(`https://api.github.com/repos/${repo}/git/ref/heads/main`, {
        headers: { ...headers, Accept: "application/vnd.github+json" },
      }),
    ]);

    if (!photosRes.ok || !resumeRes.ok || !branchRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch data from GitHub" },
        { status: 502 }
      );
    }

    const [photos, resume, branch] = await Promise.all([
      photosRes.json(),
      resumeRes.json(),
      branchRes.json() as Promise<{ object: { sha: string } }>,
    ]);

    const commitSha = branch.object.sha;

    return NextResponse.json(
      { photos, resume, commitSha },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
