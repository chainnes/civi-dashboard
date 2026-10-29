-- Pointer only. This file is not the schema. Running it stops with an error that names the migration.
-- Canonical SQL: supabase/migrations/20261029105511_beta.sql
-- Supabase's GitHub integration applies supabase/migrations/ on merge to main.
-- Add a new timestamped file with: supabase migration new <name>
-- Do not edit sql/002_beta.sql.
do $$ begin
  raise exception 'sql/002_beta.sql moved to supabase/migrations/20261029105511_beta.sql';
end $$;
