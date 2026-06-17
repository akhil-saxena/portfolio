import { type NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";
import { requireAccess } from "@/lib/access";

export const runtime = "edge";

interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
}

const ALLOWED_PATH = /^(logos|icons)\/[a-zA-Z0-9._-]+\.(png|jpg|jpeg|webp|svg)$/;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB

export async function POST(request: NextRequest) {
  const denied = await requireAccess(request);
  if (denied) return denied;

  try {
    const env = getRequestContext().env as {
      PORTFOLIO_BUCKET?: R2Bucket;
      R2_PUBLIC_URL?: string;
    };
    if (!env.PORTFOLIO_BUCKET) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const path = formData.get("path");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (typeof path !== "string" || !ALLOWED_PATH.test(path)) {
      return NextResponse.json(
        { error: "Invalid path. Use logos/<name>.ext or icons/<name>.ext (png|jpg|jpeg|webp|svg)" },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
    }

    const assetKey = `assets/${path}`;
    await env.PORTFOLIO_BUCKET.put(assetKey, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    const base = (env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
    return NextResponse.json({ url: `${base}/${assetKey}` });
  } catch (err) {
    console.error("upload-asset failed:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
