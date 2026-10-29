-- Pointer only. This file is not the schema. Running it stops with an error that names the migration.
-- Canonical SQL: supabase/migrations/20261029105515_feedback_referral.sql
-- Supabase's GitHub integration applies supabase/migrations/ on merge to main.
-- Add a new timestamped file with: supabase migration new <name>
-- Do not edit sql/004_feedback_referral.sql.
do $$ begin
  raise exception 'sql/004_feedback_referral.sql moved to supabase/migrations/20261029105515_feedback_referral.sql';
end $$;
