-- Seed allowed source URLs into public.files using public.create_file.
-- Usage:
--   psql "$DATABASE_URL" -v user_id='USER_ID_HERE' -v parent_id='PARENT_UUID_OR_EMPTY' -f db/seed_allowed_source_urls.sql

DO $$
DECLARE
  v_user_id text := :'user_id';
  v_parent_id uuid := NULLIF(:'parent_id', '')::uuid;
BEGIN
  IF v_user_id IS NULL OR length(v_user_id) = 0 THEN
    RAISE EXCEPTION 'user_id is required (psql -v user_id=...)';
  END IF;

  WITH urls(url) AS (
    VALUES
      ('https://sample-files.com/downloads/documents/txt/simple.txt'),
      ('https://sample-files.com/downloads/documents/txt/long-doc.txt'),
      ('https://sample-files.com/downloads/documents/txt/ascii-art.txt'),
      ('https://sample-files.com/downloads/documents/txt/data.txt'),
      ('https://sample-files.com/downloads/documents/txt/multilang.txt')
  ),
  mapped AS (
    SELECT
      url,
      regexp_replace(url, '.*/', '') AS file_name
    FROM urls
  )
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
  SELECT
    v_user_id,
    file_name,
    file_name,
    url,
    file_name,
    'text/plain',
    NULL::bigint,
    v_parent_id,
    false,
    true,
    now(),
    now()
  FROM mapped;
END $$;
