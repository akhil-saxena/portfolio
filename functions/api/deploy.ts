/// <reference types="@cloudflare/workers-types" />

interface Env {
  GITHUB_PAT: string;
  GITHUB_REPO: string;
}

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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { GITHUB_PAT, GITHUB_REPO } = context.env;

  try {
    // Auth check — require CF Access session
    const cookie = context.request.headers.get("cookie") || "";
    if (!cookie.includes("CF_Authorization=")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await context.request.json<DeployRequest>();
    const { files, baseSha, message } = body;

    if (!files || typeof files !== "object" || Object.keys(files).length === 0) {
      return new Response("No files provided", { status: 400 });
    }

    if (!baseSha || typeof baseSha !== "string") {
      return new Response("Missing baseSha", { status: 400 });
    }

    if (!message || typeof message !== "string") {
      return new Response("Missing commit message", { status: 400 });
    }

    // Validate all file paths are under data/
    for (const filePath of Object.keys(files)) {
      if (!filePath.startsWith("data/")) {
        return new Response(
          `Invalid file path: ${filePath}. All paths must be under data/`,
          { status: 400 }
        );
      }
    }

    const githubHeaders = {
      Authorization: `Bearer ${GITHUB_PAT}`,
      "User-Agent": "portfolio-admin",
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };

    // Check current HEAD SHA for conflict detection
    const headRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/git/ref/heads/main`,
      { headers: githubHeaders }
    );

    if (!headRes.ok) {
      return new Response("Failed to fetch current HEAD SHA", { status: 502 });
    }

    const headData = (await headRes.json()) as GitRefResponse;
    const currentSha = headData.object.sha;

    if (currentSha !== baseSha) {
      return new Response(
        JSON.stringify({
          error: "conflict",
          message:
            "Data was updated externally — please review and try again",
          currentSha,
        }),
        { status: 409, headers: { "Content-Type": "application/json" } }
      );
    }

    // Create blobs for all files
    const blobEntries = await Promise.all(
      Object.entries(files).map(async ([filePath, content]) => {
        const blobRes = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/git/blobs`,
          {
            method: "POST",
            headers: githubHeaders,
            body: JSON.stringify({
              content: btoa(unescape(encodeURIComponent(content))),
              encoding: "base64",
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
      `https://api.github.com/repos/${GITHUB_REPO}/git/trees`,
      {
        method: "POST",
        headers: githubHeaders,
        body: JSON.stringify({
          base_tree: baseSha,
          tree: blobEntries,
        }),
      }
    );

    if (!treeRes.ok) {
      return new Response("Failed to create git tree", { status: 502 });
    }

    const tree = (await treeRes.json()) as GitTreeResponse;

    // Create commit
    const commitRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/git/commits`,
      {
        method: "POST",
        headers: githubHeaders,
        body: JSON.stringify({
          message,
          tree: tree.sha,
          parents: [baseSha],
        }),
      }
    );

    if (!commitRes.ok) {
      return new Response("Failed to create git commit", { status: 502 });
    }

    const commit = (await commitRes.json()) as GitCommitResponse;

    // Update HEAD ref
    const updateRefRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/git/refs/heads/main`,
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
        return new Response(
          JSON.stringify({
            error: "conflict",
            message:
              "Data was updated externally — please review and try again",
          }),
          { status: 409, headers: { "Content-Type": "application/json" } }
        );
      }
      return new Response("Failed to update git ref", { status: 502 });
    }

    return Response.json({ sha: commit.sha, status: "committed" });
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
};
