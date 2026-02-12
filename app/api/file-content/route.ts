import { NextRequest, NextResponse } from "next/server";
import { resolveFileContent } from "@/lib/files-db";

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  const resolved = await resolveFileContent(fileId);
  console.log("[api/file-content] fileId", fileId, "found", Boolean(resolved));
  if (!resolved) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({ data: resolved });
}
