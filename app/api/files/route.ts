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

