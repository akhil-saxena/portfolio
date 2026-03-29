/// <reference types="@cloudflare/workers-types" />

interface Env {
  GITHUB_PAT: string;
  GITHUB_REPO: string;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { GITHUB_PAT, GITHUB_REPO } = context.env;

  const headers = {
    Authorization: `Bearer ${GITHUB_PAT}`,
    "User-Agent": "portfolio-admin",
    Accept: "application/vnd.github.raw+json",
  };

  try {
    // Auth check — require CF Access session
    const cookie = context.request.headers.get("cookie") || "";
    if (!cookie.includes("CF_Authorization=")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const [photosRes, resumeRes, branchRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/data/portfolio_images.json`,
        { headers }
      ),
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/contents/data/resume.json`,
        { headers }
      ),
      fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/git/ref/heads/main`,
        { headers: { ...headers, Accept: "application/vnd.github+json" } }
      ),
    ]);

    if (!photosRes.ok || !resumeRes.ok || !branchRes.ok) {
      return new Response("Failed to fetch data from GitHub", { status: 502 });
    }

    const [photos, resume, branch] = await Promise.all([
      photosRes.json(),
      resumeRes.json(),
      branchRes.json() as Promise<{ object: { sha: string } }>,
    ]);

    const commitSha = branch.object.sha;

    return Response.json({ photos, resume, commitSha });
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
};
