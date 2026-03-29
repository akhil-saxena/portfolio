/// <reference types="@cloudflare/workers-types" />

interface Env {
  GITHUB_PAT: string;
  GITHUB_REPO: string;
}

interface DispatchRequest {
  tempKey: string;
  title: string;
  category: string;
  tags?: string[];
}

interface WorkflowRun {
  id: number;
  created_at: string;
  status: string;
}

interface WorkflowRunsResponse {
  workflow_runs: WorkflowRun[];
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

    const body = await context.request.json<DispatchRequest>();
    const { tempKey, title, category, tags } = body;

    if (!tempKey || !title || !category) {
      return new Response("Missing required fields: tempKey, title, category", {
        status: 400,
      });
    }

    const githubHeaders = {
      Authorization: `Bearer ${GITHUB_PAT}`,
      "User-Agent": "portfolio-admin",
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };

    const dispatchedAt = new Date().toISOString();

    const dispatchRes = await fetch(
      `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/process-photos.yml/dispatches`,
      {
        method: "POST",
        headers: githubHeaders,
        body: JSON.stringify({
          ref: "main",
          inputs: {
            temp_key: tempKey,
            title,
            category,
            tags: (tags ?? []).join(","),
          },
        }),
      }
    );

    if (!dispatchRes.ok) {
      const text = await dispatchRes.text();
      return new Response(`GitHub dispatch failed: ${text}`, { status: 502 });
    }

    // Poll for the run ID that was created after dispatchedAt
    let runId: number | null = null;
    const maxAttempts = 10;
    const pollIntervalMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const runsRes = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/actions/workflows/process-photos.yml/runs?per_page=5&event=workflow_dispatch`,
        { headers: githubHeaders }
      );

      if (!runsRes.ok) continue;

      const runsData = (await runsRes.json()) as WorkflowRunsResponse;
      const recentRun = runsData.workflow_runs.find(
        (run) => new Date(run.created_at) >= new Date(dispatchedAt)
      );

      if (recentRun) {
        runId = recentRun.id;
        break;
      }
    }

    if (!runId) {
      return new Response("Could not retrieve workflow run ID after dispatch", {
        status: 504,
      });
    }

    return Response.json({ runId });
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
};
