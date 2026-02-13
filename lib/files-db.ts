import { getDbPool } from "@/lib/db";
import { allowedSourceUrls } from "@/lib/allowed-source-urls";

const allowedSourceUrlSet = new Set(allowedSourceUrls);

export type DirectoryRow = {
  id: string;
  name: string;
  parentId: string | null;
};

export type FileRow = {
  id: string;
  name: string;
  storageKey: string;
  directoryId: string;
  size: number;
  extension: string;
  mimeType: string;
  updatedAt: string;
  storageUrl: string | null;
  isPublic: boolean;
};

export type FileContentRow = {
  id: string;
  name: string;
  mimeType: string;
  content: string | null;
  dataUrl: string | null;
  sourceUrl: string | null;
};

function getDefaultUserId() {
  return process.env.FILE_USER_ID ?? "8199889776";
}

function getExtension(name: string) {
  const idx = name.lastIndexOf(".");
  if (idx === -1) return "bin";
  return name.slice(idx + 1).toLowerCase() || "bin";
}

function guessMimeType(name: string, fallback?: string | null) {
  if (fallback) return fallback;
  const lower = name.toLowerCase();
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".json")) return "application/json";
  if (lower.endsWith(".csv")) return "text/csv";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".mp4")) return "video/mp4";
  return "application/octet-stream";
}

export async function listDirectories() {
  const pool = getDbPool();
  const userId = getDefaultUserId();

  const result = await pool.query(
    `
    select id,
           file_name as name,
           parent_id as "parentId"
    from public.files
    where user_id = $1
      and is_folder = true
      and deleted_at is null
    order by updated_at desc
    `,
    [userId]
  );

  return result.rows as DirectoryRow[];
}

export async function listFiles(directoryId: string) {
  const pool = getDbPool();
  const userId = getDefaultUserId();
  const directoryResult = await pool.query(
    `
    select id,
           file_name,
           parent_id
    from public.files
    where id = $1::uuid
      and user_id = $2
      and is_folder = true
      and deleted_at is null
    limit 1
    `,
    [directoryId, userId]
  );

  const selectedDirectory = directoryResult.rows[0] as
    | { id: string; file_name: string; parent_id: string | null }
    | undefined;
  if (!selectedDirectory) {
    return [];
  }

  const includeTopLevelFiles =
    selectedDirectory.parent_id === null &&
    String(selectedDirectory.file_name).toLowerCase() === "root";

  const result = await pool.query(
    `
    select id,
           file_name,
           storage_key,
           storage_url,
           mime_type,
           file_size,
           parent_id,
           is_public,
           updated_at
    from public.files
    where user_id = $1
      and (
        parent_id = $2::uuid
        or ($3::boolean = true and parent_id is null)
      )
      and is_folder = false
      and deleted_at is null
    order by updated_at desc
    `,
    [userId, directoryId, includeTopLevelFiles]
  );

  return result.rows.map((row) => {
    const name = row.file_name as string;
    const mimeType = guessMimeType(name, row.mime_type);
    return {
      id: row.id,
      name,
      storageKey: row.storage_key,
      directoryId: row.parent_id,
      size: Number(row.file_size ?? 0),
      extension: getExtension(name),
      mimeType,
      updatedAt: new Date(row.updated_at).toISOString(),
      storageUrl: row.storage_url ?? null,
      isPublic: Boolean(row.is_public),
    } satisfies FileRow;
  });
}

export async function getFileById(fileId: string) {
  const pool = getDbPool();
  const userId = getDefaultUserId();

  const result = await pool.query(
    `
    select id,
           file_name,
           storage_url,
           mime_type,
           is_public
    from public.files
    where id = $1::uuid
      and user_id = $2
      and deleted_at is null
    limit 1
    `,
    [fileId, userId]
  );

  const row = result.rows[0];
  if (!row) return null;

  return {
    id: row.id as string,
    name: row.file_name as string,
    storageUrl: (row.storage_url as string | null) ?? null,
    mimeType: guessMimeType(row.file_name, row.mime_type),
    isPublic: Boolean(row.is_public),
  };
}

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return { mimeType: match[1], buffer: Buffer.from(match[2], "base64") };
}

export async function resolveFileContent(fileId: string): Promise<FileContentRow | null> {
  const file = await getFileById(fileId);
  if (!file) return null;

  const base: FileContentRow = {
    id: file.id,
    name: file.name,
    mimeType: file.mimeType,
    content: null,
    dataUrl: null,
    sourceUrl: null,
  };

  if (!file.storageUrl) {
    return base;
  }

  if (file.storageUrl.startsWith("data:")) {
    base.dataUrl = file.storageUrl;
    const parsed = parseDataUrl(file.storageUrl);
    if (parsed && parsed.mimeType.startsWith("text/")) {
      base.content = parsed.buffer.toString("utf8");
    }
    return base;
  }

  if (file.storageUrl.startsWith("http")) {
    base.sourceUrl = file.storageUrl;
    if (file.mimeType.startsWith("text/")) {
      if (!allowedSourceUrlSet.has(file.storageUrl)) {
        return base;
      }
      const response = await fetch(file.storageUrl, {
        headers: { Accept: "text/plain, text/*;q=0.9, */*;q=0.5" },
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (response.ok) {
        base.content = await response.text();
      }
    } else if (file.isPublic) {
      base.dataUrl = file.storageUrl;
    }
    return base;
  }

  return base;
}

export async function createFileRecord(params: {
  directoryId: string;
  title: string;
  mimeType: string;
  size?: number;
  dataUrl?: string | null;
  content?: string | null;
}) {
  const pool = getDbPool();
  const userId = getDefaultUserId();
  const now = new Date().toISOString();
  const name = params.title;
  const mimeType = params.mimeType || guessMimeType(name, null);

  let storageUrl: string | null = params.dataUrl ?? null;
  if (!storageUrl && params.content) {
    storageUrl = `data:${mimeType};base64,${Buffer.from(params.content).toString("base64")}`;
  }

  const result = await pool.query(
    `
    insert into public.files (
      user_id,
      file_name,
      original_name,
      storage_url,
      storage_key,
      mime_type,
      file_size,
      parent_id,
      is_folder,
      is_public,
      created_at,
      updated_at
    )
    values (
      $1::text,
      $2::text,
      $3::text,
      $4::text,
      $5::text,
      $6::text,
      $7::bigint,
      $8::uuid,
      false,
      true,
      $9::timestamptz,
      $9::timestamptz
    )
    returning id,
              file_name,
              storage_key,
              parent_id,
              file_size,
              mime_type,
              updated_at,
              storage_url,
              is_public
    `,
    [
      userId,
      name,
      name,
      storageUrl,
      name,
      mimeType,
      params.size ?? null,
      params.directoryId,
      now,
    ]
  );

  const row = result.rows[0];
  return {
    id: row.id,
    name: row.file_name,
    storageKey: row.storage_key,
    directoryId: row.parent_id,
    size: Number(row.file_size ?? 0),
    extension: getExtension(row.file_name),
    mimeType: row.mime_type,
    updatedAt: new Date(row.updated_at).toISOString(),
    storageUrl: row.storage_url ?? null,
    isPublic: Boolean(row.is_public),
  } satisfies FileRow;
}
