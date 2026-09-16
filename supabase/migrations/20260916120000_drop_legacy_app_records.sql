-- Remove the inert app_records store from the earlier Base44-detachment attempt.
-- The live application uses the typed tables (investments, holdings, profiles,
-- transactions, etc.) through the Supabase compatibility layer instead.
-- Keep the original create migration in history; this forward migration is the
-- safe way to remove an already-applied object without creating migration drift.
drop table if exists public.app_records cascade;
