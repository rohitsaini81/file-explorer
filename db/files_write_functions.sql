-- Write PostgreSQL functions for the files table.
-- Apply with: psql "$DATABASE_URL" -f db/files_write_functions.sql

CREATE OR REPLACE FUNCTION public.create_file(
  p_user_id text,
  p_file_name text,
  p_original_name text,
  p_storage_url text,
  p_storage_key text,
  p_mime_type text DEFAULT NULL,
  p_file_size bigint DEFAULT NULL,
  p_parent_id uuid DEFAULT NULL,
  p_is_folder boolean DEFAULT false,
  p_is_public boolean DEFAULT false
)
RETURNS files
LANGUAGE plpgsql
AS $$
DECLARE
  v_row files;
BEGIN
  INSERT INTO public.files (
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
  VALUES (
    p_user_id,
    p_file_name,
    p_original_name,
    p_storage_url,
    p_storage_key,
    p_mime_type,
    p_file_size,
    p_parent_id,
    p_is_folder,
    p_is_public,
    now(),
    now()
  )
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_file_storage(
  p_id uuid,
  p_user_id text,
  p_storage_url text,
  p_storage_key text,
  p_mime_type text DEFAULT NULL,
  p_file_size bigint DEFAULT NULL,
  p_is_public boolean DEFAULT NULL
)
RETURNS files
LANGUAGE plpgsql
AS $$
DECLARE
  v_row files;
BEGIN
  UPDATE public.files
  SET storage_url = p_storage_url,
      storage_key = p_storage_key,
      mime_type = COALESCE(p_mime_type, mime_type),
      file_size = COALESCE(p_file_size, file_size),
      is_public = COALESCE(p_is_public, is_public),
      updated_at = now()
  WHERE id = p_id
    AND user_id = p_user_id
    AND deleted_at IS NULL
  RETURNING * INTO v_row;

  RETURN v_row;
END;
$$;
