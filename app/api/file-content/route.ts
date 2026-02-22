import { NextRequest, NextResponse } from "next/server";
import { resolveFileContent } from "@/lib/files-db";
import { filesTable } from "@/lib/mock-db";

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  let resolved = null;
  try {
    resolved = await resolveFileContent(fileId);
  } catch (error) {
    console.error("[api/file-content] falling back to mock data", error);
    const file = filesTable.find((item) => item.id === fileId);
    if (file) {
      resolved = {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        content: file.localContent ?? null,
        dataUrl: file.dataUrl ?? null,
        sourceUrl: file.sourceUrl ?? null,
      };
    }
  }
  console.log("[api/file-content] fileId", fileId, "found", Boolean(resolved));
  if (!resolved) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({ data: resolved });
}
