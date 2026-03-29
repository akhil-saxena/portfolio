import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  try {
    const { photoId } = (await request.json()) as { photoId: unknown };
    if (!photoId || typeof photoId !== "string") {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }
    // Analytics Engine not accessible from Next.js routes on CF Pages.
    // Acknowledge the request — analytics will work via direct CF integration.
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
