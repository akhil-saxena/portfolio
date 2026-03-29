import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

interface DeployRequest {
  files: Record<string, string>;
  baseSha: string;
  message: string;
}

interface GitBlob {
  sha: string;
}

interface GitTreeResponse {
  sha: string;
}

interface GitCommitResponse {
  sha: string;
}

interface GitRefResponse {
  object: { sha: string };
}

export async function POST(request: NextRequest) {
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

    const body = (await request.json()) as DeployRequest;
    const { files, baseSha, message } = body;

    if (!files || typeof files !== "object" || Object.keys(files).length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (!baseSha || typeof baseSha !== "string") {
      return NextResponse.json({ error: "Missing baseSha" }, { status: 400 });
    }

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Missing commit message" }, { status: 400 });
    }

    // Validate all file paths are under data/
    for (const filePath of Object.keys(files)) {
      if (!filePath.startsWith("data/")) {
        return NextResponse.json(
          { error: `Invalid file path: ${filePath}. All paths must be under data/` },
          { status: 400 }
        );
      }
    }

    const githubHeaders = {
      Authorization: `Bearer ${pat}`,
      "User-Agent": "portfolio-admin",
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };

    // Check current HEAD SHA for conflict detection
    const headRes = await fetch(
      `https://api.github.com/repos/${repo}/git/ref/heads/main`,
      { headers: githubHeaders }
    );

    if (!headRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch current HEAD SHA" },
        { status: 502 }
      );
    }

    const headData = (await headRes.json()) as GitRefResponse;
    const currentSha = headData.object.sha;

    // Skip conflict check if baseSha is "latest" — just use current HEAD
    if (baseSha !== "latest" && currentSha !== baseSha) {
      return NextResponse.json(
        {
          error: "conflict",
          message: "Data was updated externally — please review and try again",
          currentSha,
        },
        { status: 409 }
      );
    }

    // Create blobs for all files
    const blobEntries = await Promise.all(
      Object.entries(files).map(async ([filePath, content]) => {
        const blobRes = await fetch(
          `https://api.github.com/repos/${repo}/git/blobs`,
          {
            method: "POST",
            headers: githubHeaders,
            body: JSON.stringify({
              content,
              encoding: "utf-8",
            }),
          }
        );

        if (!blobRes.ok) {
          throw new Error(`Failed to create blob for ${filePath}`);
        }

        const blob = (await blobRes.json()) as GitBlob;
        return {
          path: filePath,
          mode: "100644" as const,
          type: "blob" as const,
          sha: blob.sha,
        };
      })
    );

    // Create tree
    const treeRes = await fetch(
      `https://api.github.com/repos/${repo}/git/trees`,
      {
        method: "POST",
        headers: githubHeaders,
        body: JSON.stringify({
          base_tree: currentSha,
          tree: blobEntries,
        }),
      }
    );

    if (!treeRes.ok) {
      return NextResponse.json(
        { error: "Failed to create git tree" },
        { status: 502 }
      );
    }

    const tree = (await treeRes.json()) as GitTreeResponse;

    // Create commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${repo}/git/commits`,
      {
        method: "POST",
        headers: githubHeaders,
        body: JSON.stringify({
          message,
          tree: tree.sha,
          parents: [currentSha],
        }),
      }
    );

    if (!commitRes.ok) {
      return NextResponse.json(
        { error: "Failed to create git commit" },
        { status: 502 }
      );
    }

    const commit = (await commitRes.json()) as GitCommitResponse;

    // Update HEAD ref
    const updateRefRes = await fetch(
      `https://api.github.com/repos/${repo}/git/refs/heads/main`,
      {
        method: "PATCH",
        headers: githubHeaders,
        body: JSON.stringify({
          sha: commit.sha,
          force: false,
        }),
      }
    );

    if (!updateRefRes.ok) {
      // If update failed, check if it's a conflict (another commit landed)
      if (updateRefRes.status === 422) {
        return NextResponse.json(
          {
            error: "conflict",
            message: "Data was updated externally — please review and try again",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Failed to update git ref" },
        { status: 502 }
      );
    }

    return NextResponse.json({ sha: commit.sha, status: "committed" });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
