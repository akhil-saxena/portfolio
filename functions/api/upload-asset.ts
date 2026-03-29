/// <reference types="@cloudflare/workers-types" />

interface Env {
  PORTFOLIO_BUCKET: R2Bucket;
  ASSET_BASE_URL: string;
}

const ALLOWED_PATH_PATTERN = /^(logos|icons)\/[a-zA-Z0-9._-]+\.(png|jpg|jpeg|webp|svg)$/;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { PORTFOLIO_BUCKET, ASSET_BASE_URL } = context.env;

  try {
    const formData = await context.request.formData();
    const file = formData.get("file") as File | null;
    const path = formData.get("path") as string | null;

    if (!file) {
      return new Response("No file provided", { status: 400 });
    }

    if (!path) {
      return new Response("No path provided", { status: 400 });
    }

    if (!ALLOWED_PATH_PATTERN.test(path)) {
      return new Response(
        "Invalid path. Must be logos/<name>.ext or icons/<name>.ext with allowed extension",
        { status: 400 }
      );
    }

    const assetKey = `assets/${path}`;
    const buffer = await file.arrayBuffer();

    await PORTFOLIO_BUCKET.put(assetKey, buffer, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    const baseUrl = ASSET_BASE_URL?.replace(/\/$/, "") ?? "";
    const url = `${baseUrl}/${assetKey}`;

    return Response.json({ url });
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
};
