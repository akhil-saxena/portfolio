/// <reference types="@cloudflare/workers-types" />

interface Env {
  PORTFOLIO_BUCKET: R2Bucket;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { PORTFOLIO_BUCKET } = context.env;

  try {
    const formData = await context.request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response("No file provided", { status: 400 });
    }

    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const tempKey = `temp/${timestamp}-${sanitizedName}`;

    const buffer = await file.arrayBuffer();
    await PORTFOLIO_BUCKET.put(tempKey, buffer, {
      httpMetadata: { contentType: file.type || "application/octet-stream" },
    });

    return Response.json({ tempKey });
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
};
