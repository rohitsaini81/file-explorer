import { NextRequest, NextResponse } from "next/server";
import { createFileRecord, listFiles } from "@/lib/files-db";
import { filesTable } from "@/lib/mock-db";
import { isMockFallbackEnabled } from "@/lib/mock-fallback";

function getExtension(name: string) {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "bin";
  return name.slice(idx + 1).toLowerCase() || "bin";
}

function inferMimeType(name: string, fallback?: string) {
  if (fallback && fallback.trim()) return fallback;
  const lower = name.toLowerCase();
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  return "application/octet-stream";
}

function isInvalidUuidError(error: unknown) {
  return (
    error instanceof Error && /invalid input syntax for type uuid/i.test(error.message)
  );
}

export async function GET(request: NextRequest) {
  const directoryId = request.nextUrl.searchParams.get("directoryId");
  const allowMockFallback = isMockFallbackEnabled();

  let filteredFiles = [];
  try {
    filteredFiles = directoryId ? await listFiles(directoryId) : [];
  } catch (error) {
    if (allowMockFallback) {
      console.error("[api/files] falling back to mock data", error);
      filteredFiles = directoryId
        ? filesTable.filter((file) => file.directoryId === directoryId)
        : [];
    } else {
      console.error("[api/files] database read failed", error);
      if (isInvalidUuidError(error)) {
        return NextResponse.json(
          { error: "directoryId must be a valid UUID" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Unable to load files from persistent storage" },
        { status: 500 }
      );
    }
  }
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
  const allowMockFallback = isMockFallbackEnabled();
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

  let createdFile;
  try {
    createdFile = await createFileRecord({
      directoryId,
      title,
      content,
      dataUrl,
      mimeType,
      size,
    });
  } catch (error) {
    if (allowMockFallback) {
      console.error("[api/files] create fallback to mock data", error);
      const id = `file-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const storageKey = `asset-${id}`;
      const now = new Date().toISOString();
      const mockFile = {
        id,
        name: title,
        storageKey,
        directoryId,
        size,
        extension: getExtension(title),
        mimeType: inferMimeType(title, mimeType),
        updatedAt: now,
        ...(dataUrl ? { dataUrl } : {}),
        ...(!dataUrl && content ? { localContent: content } : {}),
      };
      filesTable.unshift(mockFile);
      createdFile = mockFile;
    } else {
      console.error("[api/files] database write failed", error);
      if (isInvalidUuidError(error)) {
        return NextResponse.json(
          { error: "directoryId must be a valid UUID" },
          { status: 400 }
        );
      }
      return NextResponse.json(
        { error: "Unable to save file to persistent storage" },
        { status: 500 }
      );
    }
  }
  console.log("[api/files] created", createdFile.id);

  return NextResponse.json(
    {
      data: createdFile,
    },
    { status: 201 }
  );
}
