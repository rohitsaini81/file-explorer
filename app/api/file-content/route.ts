import { NextRequest, NextResponse } from "next/server";
import { filesTable } from "@/lib/mock-db";

const allowedSourceUrls = new Set([
  "https://sample-files.com/downloads/documents/txt/simple.txt",
  "https://sample-files.com/downloads/documents/txt/long-doc.txt",
  "https://sample-files.com/downloads/documents/txt/ascii-art.txt",
  "https://sample-files.com/downloads/documents/txt/data.txt",
  "https://sample-files.com/downloads/documents/txt/multilang.txt",
]);

export async function GET(request: NextRequest) {
  const fileId = request.nextUrl.searchParams.get("fileId");

  if (!fileId) {
    return NextResponse.json({ error: "fileId is required" }, { status: 400 });
  }

  const file = filesTable.find((item) => item.id === fileId);
  if (!file) {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }

  if (file.localContent) {
    return NextResponse.json({
      data: {
        id: file.id,
        name: file.name,
        content: file.localContent,
        sourceUrl: null,
      },
    });
  }

  if (!file.sourceUrl) {
    return NextResponse.json({ error: "File has no readable source" }, { status: 400 });
  }

  if (!allowedSourceUrls.has(file.sourceUrl)) {
    return NextResponse.json({ error: "Source URL is not allowed" }, { status: 403 });
  }

  try {
    const response = await fetch(file.sourceUrl, {
      headers: { Accept: "text/plain, text/*;q=0.9, */*;q=0.5" },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch remote file (${response.status})` },
        { status: 502 }
      );
    }

    const content = await response.text();

    return NextResponse.json({
      data: {
        id: file.id,
        name: file.name,
        content,
        sourceUrl: file.sourceUrl,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unable to fetch remote text file" }, { status: 502 });
  }
}

