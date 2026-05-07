-- ============================================================
-- Migration 004 : Drop the checklist feature
--
-- The checklist module is being replaced by a menu/meal planning
-- module. Existing checklist data will be lost — the feature is
-- being removed entirely.
--
-- → Run this once in the Supabase SQL Editor.
-- ============================================================

DROP TABLE IF EXISTS public.checklist_items CASCADE;
