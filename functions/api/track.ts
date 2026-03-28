/// <reference types="@cloudflare/workers-types" />

interface Env {
  PHOTO_ANALYTICS: AnalyticsEngineDataset;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const { photoId } = await context.request.json<{ photoId: string }>();

    if (!photoId || typeof photoId !== "string") {
      return new Response("Bad request", { status: 400 });
    }

    context.env.PHOTO_ANALYTICS.writeDataPoint({
      indexes: ["photo_view"],
      blobs: [photoId],
      doubles: [1],
    });

    return new Response("OK", { status: 200 });
  } catch {
    return new Response("Error", { status: 500 });
  }
};
