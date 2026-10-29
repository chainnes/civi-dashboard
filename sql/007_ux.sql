-- Pointer only. This file is not the schema. Running it stops with an error that names the migration.
-- Canonical SQL: supabase/migrations/20261029105520_ux.sql
-- Supabase's GitHub integration applies supabase/migrations/ on merge to main.
-- Add a new timestamped file with: supabase migration new <name>
-- Do not edit sql/007_ux.sql.
do $$ begin
  raise exception 'sql/007_ux.sql moved to supabase/migrations/20261029105520_ux.sql';
end $$;
