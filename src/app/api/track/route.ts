import { type NextRequest, NextResponse } from "next/server";
import { getRequestContext } from "@cloudflare/next-on-pages";

export const runtime = "edge";

interface AnalyticsEngineDataset {
  writeDataPoint(event: {
    indexes?: string[];
    blobs?: (string | null)[];
    doubles?: number[];
  }): void;
}

export async function POST(request: NextRequest) {
  try {
    const { photoId } = (await request.json()) as { photoId: unknown };
    if (!photoId || typeof photoId !== "string" || photoId.length > 256) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // Best-effort write to the Analytics Engine binding. Unavailable under plain
    // `next dev` (no Cloudflare request context), so swallow — tracking must
    // never fail the request.
    try {
      const env = getRequestContext().env as { PHOTO_ANALYTICS?: AnalyticsEngineDataset };
      env.PHOTO_ANALYTICS?.writeDataPoint({
        indexes: ["photo_view"],
        blobs: [photoId],
        doubles: [1],
      });
    } catch {
      // no Cloudflare binding in this context
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
