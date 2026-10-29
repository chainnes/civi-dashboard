-- Pointer only. This file is not the schema. Running it stops with an error that names the migration.
-- Canonical SQL: supabase/migrations/20261029105510_schema.sql
-- Supabase's GitHub integration applies supabase/migrations/ on merge to main.
-- Add a new timestamped file with: supabase migration new <name>
-- Do not edit sql/001_schema.sql.
do $$ begin
  raise exception 'sql/001_schema.sql moved to supabase/migrations/20261029105510_schema.sql';
end $$;
