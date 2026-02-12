import { allowedSourceUrls } from "@/lib/allowed-source-urls";
import { runPsql } from "@/lib/psql";

export type CreateFileParams = {
  userId: string;
  fileName: string;
  originalName: string;
  storageUrl: string;
  storageKey: string;
  mimeType?: string | null;
  fileSize?: number | null;
  parentId?: string | null;
  isFolder?: boolean;
  isPublic?: boolean;
};

function sqlLiteral(value: string | null) {
  if (value === null) return "NULL";
  return `'${value.replace(/'/g, "''")}'`;
}

function sqlBool(value: boolean) {
  return value ? "true" : "false";
}

function sqlNumber(value: number | null) {
  if (value === null) return "NULL";
  return String(value);
}

function sqlUuid(value: string | null) {
  if (!value) return "NULL";
  return sqlLiteral(value);
}

export async function createFile(params: CreateFileParams) {
  const {
    userId,
    fileName,
    originalName,
    storageUrl,
    storageKey,
    mimeType = null,
    fileSize = null,
    parentId = null,
    isFolder = false,
    isPublic = false,
  } = params;

  const sql = `
    select row_to_json(public.create_file(
      ${sqlLiteral(userId)}::text,
      ${sqlLiteral(fileName)}::text,
      ${sqlLiteral(originalName)}::text,
      ${sqlLiteral(storageUrl)}::text,
      ${sqlLiteral(storageKey)}::text,
      ${mimeType ? sqlLiteral(mimeType) : "NULL"}::text,
      ${sqlNumber(fileSize)}::bigint,
      ${sqlUuid(parentId)}::uuid,
      ${sqlBool(isFolder)}::boolean,
      ${sqlBool(isPublic)}::boolean
    )) as row;
  `;

  const output = await runPsql(sql);

  if (!output) {
    throw new Error("create_file returned no data");
  }

  const parsed = JSON.parse(output);
  return parsed;
}

export async function seedAllowedSourceUrls(params: {
  userId: string;
  parentId?: string | null;
}) {
  const { userId, parentId = null } = params;
  const results = [];

  for (const url of allowedSourceUrls) {
    const fileName = url.split("/").pop() ?? url;
    const row = await createFile({
      userId,
      fileName,
      originalName: fileName,
      storageUrl: url,
      storageKey: fileName,
      mimeType: "text/plain",
      fileSize: null,
      parentId,
      isFolder: false,
      isPublic: true,
    });
    results.push(row);
  }

  return results;
}
