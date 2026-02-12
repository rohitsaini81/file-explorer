import { NextRequest, NextResponse } from "next/server";
import { filesTable } from "@/lib/mock-db";

export async function GET(request: NextRequest) {
  const directoryId = request.nextUrl.searchParams.get("directoryId");

  const filteredFiles = directoryId
    ? filesTable.filter((file) => file.directoryId === directoryId)
    : filesTable;

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

  const now = new Date().toISOString();
  const storageKey = crypto.randomUUID();
  const extension = title.includes(".") ? title.split(".").pop()?.toLowerCase() ?? "bin" : "bin";
  const textSize = new TextEncoder().encode(content).length;
  const fallbackSize = dataUrl ? dataUrl.length : textSize;
  const size = typeof body.size === "number" && body.size > 0 ? body.size : fallbackSize;

  const createdFile = {
    id: `file-${crypto.randomUUID()}`,
    name: title,
    storageKey,
    directoryId,
    size,
    extension,
    mimeType,
    updatedAt: now,
    localContent: content || undefined,
    dataUrl: dataUrl || undefined,
  };

  filesTable.push(createdFile);

  return NextResponse.json(
    {
      data: createdFile,
    },
    { status: 201 }
  );
}
