import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(request: NextRequest) {
  // Auth check — require CF Access session
  const cookie = request.headers.get("cookie") || "";
  if (!cookie.includes("CF_Authorization=")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // R2 bindings are not accessible from Next.js route handlers on CF Pages.
  // Upload functionality requires a direct CF Pages Function with R2 binding access,
  // which is unavailable when _worker.js is present.
  // TODO: Implement via presigned URLs or an alternative upload path.
  return NextResponse.json(
    {
      error:
        "Upload is temporarily unavailable. R2 bindings are not accessible from Next.js route handlers.",
    },
    { status: 503 }
  );
}
