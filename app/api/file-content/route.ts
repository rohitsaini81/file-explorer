import { NextRequest, NextResponse } from "next/server";
import { resolveFileContent } from "@/lib/files-db";
import { filesTable } from "@/lib/mock-db";
import { isMockFallbackEnabled } from "@/lib/mock-fallback";

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId");
  const allowMockFallback = isMockFallbackEnabled();

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  let resolved = null;
  try {
    resolved = await resolveFileContent(fileId);
  } catch (error) {
    if (allowMockFallback) {
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
    } else {
      console.error("[api/file-content] database read failed", error);
      return NextResponse.json(
        { error: "Unable to load file content from persistent storage" },
        { status: 500 }
      );
    }
  }
  console.log("[api/file-content] fileId", fileId, "found", Boolean(resolved));
  if (!resolved) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  return NextResponse.json({ data: resolved });
}
