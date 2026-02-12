import { NextRequest, NextResponse } from "next/server";
import { createFileRecord, listFiles } from "@/lib/files-db";

export async function GET(request: NextRequest) {
  const directoryId = request.nextUrl.searchParams.get("directoryId");

  const filteredFiles = directoryId ? await listFiles(directoryId) : [];
  console.log("[api/files] directoryId", directoryId, "rows", filteredFiles.length);

  return NextResponse.json({
    data: filteredFiles,
  });
}

type CreateFilePayload = {
  directoryId?: string;
  title?: string;
  content?: string;
  mimeType?: string;
  dataUrl?: string;
  size?: number;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateFilePayload;
  const directoryId = body.directoryId?.trim();
  const title = body.title?.trim();
  const content = body.content ?? "";
  const mimeType = body.mimeType?.trim() || "application/octet-stream";
  const dataUrl = body.dataUrl?.trim();

  if (!directoryId || !title) {
    return NextResponse.json(
      { error: "directoryId and title are required" },
      { status: 400 }
    );
  }

  const textSize = new TextEncoder().encode(content).length;
  const fallbackSize = dataUrl ? dataUrl.length : textSize;
  const size = typeof body.size === "number" && body.size > 0 ? body.size : fallbackSize;

  const createdFile = await createFileRecord({
    directoryId,
    title,
    content,
    dataUrl,
    mimeType,
    size,
  });
  console.log("[api/files] created", createdFile.id);

  return NextResponse.json(
    {
      data: createdFile,
    },
    { status: 201 }
  );
}
