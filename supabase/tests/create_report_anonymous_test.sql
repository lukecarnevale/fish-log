-- pgTAP tests for create_report_anonymous RPC function
--
-- Tests:
-- 1. Anonymous user can create a report with device_id
-- 2. Duplicate anonymous submission is idempotent
-- 3. Anonymous reports have correct anonymous_user_id set
--
-- Run with: supabase db test
-- Requires: pgTAP extension enabled on the test database

BEGIN;

SELECT plan(5);

-- ============================================
-- Setup: Create test anonymous user
-- ============================================

-- Ensure an anonymous user exists for device 'pgtap-device-001'
INSERT INTO anonymous_users (device_id, created_at, updated_at)
VALUES ('pgtap-device-001', now(), now())
ON CONFLICT (device_id) DO NOTHING;

-- Use service role for anonymous operations (no auth.uid() required)
SET LOCAL ROLE service_role;

-- ============================================
-- Test 1: Anonymous report creation succeeds
-- ============================================

SELECT lives_ok(
  $$
    SELECT create_report_anonymous(
      'pgtap-device-001',
      jsonb_build_object(
        'user_id', NULL,
        'anonymous_user_id', NULL,
        'dmf_status', 'submitted',
        'dmf_confirmation_number', 'TEST-ANON-001',
        'dmf_object_id', 99902,
        'dmf_submitted_at', now()::text,
        'has_license', false,
        'wrc_id', NULL,
        'first_name', 'Anonymous',
        'last_name', 'Tester',
        'zip_code', '28401',
        'phone', NULL,
        'email', NULL,
        'want_text_confirmation', false,
        'want_email_confirmation', false,
        'harvest_date', '2026-02-01',
        'area_code', 'NC-PGTAP-ANON',
        'area_label', 'pgTAP Anonymous Area',
        'used_hook_and_line', true,
        'gear_code', NULL,
        'gear_label', NULL,
        'red_drum_count', 1,
        'flounder_count', 0,
        'spotted_seatrout_count', 0,
        'weakfish_count', 0,
        'striped_bass_count', 0,
        'reporting_for', 'self',
        'family_count', NULL,
        'notes', NULL,
        'photo_url', NULL,
        'gps_latitude', NULL,
        'gps_longitude', NULL,
        'entered_rewards', false,
        'rewards_drawing_id', NULL,
        'fish_entries', '[]'::jsonb
      )
    )
  $$,
  'Anonymous report creation succeeds'
);

-- Verify the report was created
SELECT is(
  (SELECT count(*)::int FROM harvest_reports
   WHERE area_code = 'NC-PGTAP-ANON'),
  1,
  'Exactly one anonymous report exists'
);

-- ============================================
-- Test 2: Anonymous report has correct anonymous_user_id
-- ============================================

SELECT isnt(
  (SELECT anonymous_user_id FROM harvest_reports
   WHERE area_code = 'NC-PGTAP-ANON'
   LIMIT 1),
  NULL,
  'Anonymous report has anonymous_user_id set (not null)'
);

-- ============================================
-- Test 3: Duplicate anonymous submission is idempotent
-- ============================================

SELECT lives_ok(
  $$
    SELECT create_report_anonymous(
      'pgtap-device-001',
      jsonb_build_object(
        'user_id', NULL,
        'anonymous_user_id', NULL,
        'dmf_status', 'submitted',
        'dmf_confirmation_number', 'TEST-ANON-001',
        'dmf_object_id', 99902,
        'dmf_submitted_at', now()::text,
        'has_license', false,
        'wrc_id', NULL,
        'first_name', 'Anonymous',
        'last_name', 'Tester',
        'zip_code', '28401',
        'phone', NULL,
        'email', NULL,
        'want_text_confirmation', false,
        'want_email_confirmation', false,
        'harvest_date', '2026-02-01',
        'area_code', 'NC-PGTAP-ANON',
        'area_label', 'pgTAP Anonymous Area',
        'used_hook_and_line', true,
        'gear_code', NULL,
        'gear_label', NULL,
        'red_drum_count', 1,
        'flounder_count', 0,
        'spotted_seatrout_count', 0,
        'weakfish_count', 0,
        'striped_bass_count', 0,
        'reporting_for', 'self',
        'family_count', NULL,
        'notes', NULL,
        'photo_url', NULL,
        'gps_latitude', NULL,
        'gps_longitude', NULL,
        'entered_rewards', false,
        'rewards_drawing_id', NULL,
        'fish_entries', '[]'::jsonb
      )
    )
  $$,
  'Duplicate anonymous insert does not throw'
);

-- Still only one report (idempotency)
SELECT is(
  (SELECT count(*)::int FROM harvest_reports
   WHERE area_code = 'NC-PGTAP-ANON'),
  1,
  'Only one record exists after duplicate anonymous insert'
);

-- ============================================
-- Cleanup
-- ============================================

SELECT * FROM finish();
ROLLBACK;
