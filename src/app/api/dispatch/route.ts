import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

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

    const body = (await request.json()) as DispatchRequest;
    const { tempKey, title, category, tags } = body;

    if (!tempKey || !title || !category) {
      return NextResponse.json(
        { error: "Missing required fields: tempKey, title, category" },
        { status: 400 }
      );
    }

    const githubHeaders = {
      Authorization: `Bearer ${pat}`,
      "User-Agent": "portfolio-admin",
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    };

    const dispatchedAt = new Date().toISOString();

    const dispatchRes = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/process-photos.yml/dispatches`,
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
      return NextResponse.json(
        { error: `GitHub dispatch failed: ${text}` },
        { status: 502 }
      );
    }

    // Poll for the run ID that was created after dispatchedAt
    let runId: number | null = null;
    const maxAttempts = 10;
    const pollIntervalMs = 2000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));

      const runsRes = await fetch(
        `https://api.github.com/repos/${repo}/actions/workflows/process-photos.yml/runs?per_page=5&event=workflow_dispatch`,
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
      return NextResponse.json(
        { error: "Could not retrieve workflow run ID after dispatch" },
        { status: 504 }
      );
    }

    return NextResponse.json({ runId });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal server error" },
      { status: 500 }
    );
  }
}
