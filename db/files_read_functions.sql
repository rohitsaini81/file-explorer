-- Read-only PostgreSQL functions for the files table.
-- Apply with: psql "$DATABASE_URL" -f db/files_read_functions.sql

CREATE OR REPLACE FUNCTION public.list_files(
  p_user_id text,
  p_parent_id uuid DEFAULT NULL,
  p_include_deleted boolean DEFAULT false,
  p_search text DEFAULT NULL,
  p_is_public_only boolean DEFAULT false,
  p_folders_only boolean DEFAULT false,
  p_files_only boolean DEFAULT false,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS SETOF files
LANGUAGE sql
STABLE
AS $$
  SELECT f.*
  FROM files f
  WHERE f.user_id = p_user_id
    AND (
      (p_parent_id IS NULL AND f.parent_id IS NULL)
      OR (p_parent_id IS NOT NULL AND f.parent_id = p_parent_id)
    )
    AND (p_include_deleted OR f.deleted_at IS NULL)
    AND (
      p_search IS NULL
      OR f.file_name ILIKE ('%' || p_search || '%')
      OR f.original_name ILIKE ('%' || p_search || '%')
    )
    AND (NOT p_is_public_only OR f.is_public = TRUE)
    AND (NOT p_folders_only OR f.is_folder = TRUE)
    AND (NOT p_files_only OR f.is_folder = FALSE)
  ORDER BY f.is_folder DESC, f.updated_at DESC
  LIMIT LEAST(GREATEST(p_limit, 1), 200)
  OFFSET GREATEST(p_offset, 0);
$$;

CREATE OR REPLACE FUNCTION public.get_file_by_id(
  p_id uuid,
  p_user_id text DEFAULT NULL,
  p_include_deleted boolean DEFAULT false
)
RETURNS SETOF files
LANGUAGE sql
STABLE
AS $$
  SELECT f.*
  FROM files f
  WHERE f.id = p_id
    AND (p_user_id IS NULL OR f.user_id = p_user_id)
    AND (p_include_deleted OR f.deleted_at IS NULL)
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.get_file_by_storage_key(
  p_storage_key text,
  p_user_id text DEFAULT NULL,
  p_include_deleted boolean DEFAULT false
)
RETURNS SETOF files
LANGUAGE sql
STABLE
AS $$
  SELECT f.*
  FROM files f
  WHERE f.storage_key = p_storage_key
    AND (p_user_id IS NULL OR f.user_id = p_user_id)
    AND (p_include_deleted OR f.deleted_at IS NULL)
  LIMIT 1;
$$;

