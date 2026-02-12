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
  name?: string;
  content?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as CreateFilePayload;
  const directoryId = body.directoryId?.trim();
  const name = body.name?.trim();
  const content = body.content ?? "";

  if (!directoryId || !name) {
    return NextResponse.json(
      { error: "directoryId and name are required" },
      { status: 400 }
    );
  }

  if (!name.toLowerCase().endsWith(".txt")) {
    return NextResponse.json(
      { error: "Only .txt files are supported in this demo" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const createdFile = {
    id: `file-${crypto.randomUUID()}`,
    name,
    directoryId,
    size: content.length,
    extension: "txt",
    updatedAt: now,
    localContent: content,
  };

  filesTable.push(createdFile);

  return NextResponse.json(
    {
      data: createdFile,
    },
    { status: 201 }
  );
}
