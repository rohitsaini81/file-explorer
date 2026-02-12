export type FilesTableRow = {
  id: string;
  user_id: string;
  file_name: string;
  original_name: string;
  storage_url: string;
  storage_key: string;
  mime_type: string | null;
  file_size: number | null;
  parent_id: string | null;
  is_folder: boolean;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SqlQuery = {
  text: string;
  values: readonly unknown[];
};

export type QueryExecutor = <T>(
  text: string,
  values?: readonly unknown[]
) => Promise<{ rows: T[] }>;

export type ListFilesFilters = {
  userId: string;
  parentId?: string | null;
  includeDeleted?: boolean;
  search?: string;
  isPublicOnly?: boolean;
  foldersOnly?: boolean;
  filesOnly?: boolean;
  limit?: number;
  offset?: number;
};

const BASE_SELECT = `
  SELECT
    id,
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
    updated_at,
    deleted_at
  FROM files
`;

export function buildListFilesQuery(filters: ListFilesFilters): SqlQuery {
  const values: unknown[] = [];
  const whereClauses: string[] = [];

  values.push(filters.userId);
  whereClauses.push(`user_id = $${values.length}`);

  if (filters.parentId === null) {
    whereClauses.push("parent_id IS NULL");
  } else if (typeof filters.parentId === "string") {
    values.push(filters.parentId);
    whereClauses.push(`parent_id = $${values.length}::uuid`);
  }

  if (!filters.includeDeleted) {
    whereClauses.push("deleted_at IS NULL");
  }

  if (filters.search) {
    values.push(`%${filters.search}%`);
    whereClauses.push(`(file_name ILIKE $${values.length} OR original_name ILIKE $${values.length})`);
  }

  if (filters.isPublicOnly) {
    whereClauses.push("is_public = TRUE");
  }

  if (filters.foldersOnly && !filters.filesOnly) {
    whereClauses.push("is_folder = TRUE");
  }

  if (filters.filesOnly && !filters.foldersOnly) {
    whereClauses.push("is_folder = FALSE");
  }

  const limit = Math.min(Math.max(filters.limit ?? 50, 1), 200);
  const offset = Math.max(filters.offset ?? 0, 0);
  values.push(limit);
  const limitParam = `$${values.length}`;
  values.push(offset);
  const offsetParam = `$${values.length}`;

  const text = `
    ${BASE_SELECT}
    ${whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : ""}
    ORDER BY is_folder DESC, updated_at DESC
    LIMIT ${limitParam}
    OFFSET ${offsetParam}
  `.trim();

  return { text, values };
}

export function buildGetFileByIdQuery(
  id: string,
  options?: { userId?: string; includeDeleted?: boolean }
): SqlQuery {
  const values: unknown[] = [id];
  const whereClauses: string[] = ["id = $1::uuid"];

  if (options?.userId) {
    values.push(options.userId);
    whereClauses.push(`user_id = $${values.length}`);
  }

  if (!options?.includeDeleted) {
    whereClauses.push("deleted_at IS NULL");
  }

  return {
    text: `
      ${BASE_SELECT}
      WHERE ${whereClauses.join(" AND ")}
      LIMIT 1
    `.trim(),
    values,
  };
}

export function buildGetFileByStorageKeyQuery(
  storageKey: string,
  options?: { userId?: string; includeDeleted?: boolean }
): SqlQuery {
  const values: unknown[] = [storageKey];
  const whereClauses: string[] = ["storage_key = $1"];

  if (options?.userId) {
    values.push(options.userId);
    whereClauses.push(`user_id = $${values.length}`);
  }

  if (!options?.includeDeleted) {
    whereClauses.push("deleted_at IS NULL");
  }

  return {
    text: `
      ${BASE_SELECT}
      WHERE ${whereClauses.join(" AND ")}
      LIMIT 1
    `.trim(),
    values,
  };
}

export async function listFiles(
  executor: QueryExecutor,
  filters: ListFilesFilters
): Promise<FilesTableRow[]> {
  const { text, values } = buildListFilesQuery(filters);
  const result = await executor<FilesTableRow>(text, values);
  return result.rows;
}

export async function getFileById(
  executor: QueryExecutor,
  id: string,
  options?: { userId?: string; includeDeleted?: boolean }
): Promise<FilesTableRow | null> {
  const { text, values } = buildGetFileByIdQuery(id, options);
  const result = await executor<FilesTableRow>(text, values);
  return result.rows[0] ?? null;
}

export async function getFileByStorageKey(
  executor: QueryExecutor,
  storageKey: string,
  options?: { userId?: string; includeDeleted?: boolean }
): Promise<FilesTableRow | null> {
  const { text, values } = buildGetFileByStorageKeyQuery(storageKey, options);
  const result = await executor<FilesTableRow>(text, values);
  return result.rows[0] ?? null;
}

