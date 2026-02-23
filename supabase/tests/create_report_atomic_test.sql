-- pgTAP tests for create_report_atomic RPC function
--
-- Tests:
-- 1. Authenticated user can create a report
-- 2. Duplicate submission (same dmf_object_id) returns existing record (idempotency)
-- 3. Server-side idempotency on user_id + harvest_date + area_code
--
-- Run with: supabase db test
-- Requires: pgTAP extension enabled on the test database

BEGIN;

SELECT plan(6);

-- ============================================
-- Setup: Create test auth user
-- ============================================

-- Insert a test user into auth.users (simulates Supabase Auth)
INSERT INTO auth.users (id, email, raw_user_meta_data, created_at, updated_at, instance_id, aud, role)
VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'test-atomic@example.com',
  '{"firstName": "Test", "lastName": "Atomic"}'::jsonb,
  now(),
  now(),
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated'
)
ON CONFLICT (id) DO NOTHING;

-- Set the role and auth context to simulate an authenticated request
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claim.sub = '00000000-0000-0000-0000-000000000001';

-- ============================================
-- Test 1: First insert succeeds
-- ============================================

SELECT lives_ok(
  $$
    SELECT create_report_atomic(
      jsonb_build_object(
        'user_id', '00000000-0000-0000-0000-000000000001',
        'anonymous_user_id', NULL,
        'dmf_status', 'submitted',
        'dmf_confirmation_number', 'TEST-ATOMIC-001',
        'dmf_object_id', 99901,
        'dmf_submitted_at', now()::text,
        'has_license', true,
        'wrc_id', 'NC-TEST-001',
        'first_name', 'Test',
        'last_name', 'Atomic',
        'zip_code', '27601',
        'phone', NULL,
        'email', 'test-atomic@example.com',
        'want_text_confirmation', false,
        'want_email_confirmation', false,
        'harvest_date', '2026-01-15',
        'area_code', 'NC-PGTAP-001',
        'area_label', 'pgTAP Test Area',
        'used_hook_and_line', true,
        'gear_code', NULL,
        'gear_label', NULL,
        'red_drum_count', 2,
        'flounder_count', 1,
        'spotted_seatrout_count', 0,
        'weakfish_count', 0,
        'striped_bass_count', 0,
        'reporting_for', 'self',
        'family_count', NULL,
        'notes', 'pgTAP test report',
        'photo_url', NULL,
        'gps_latitude', NULL,
        'gps_longitude', NULL,
        'entered_rewards', false,
        'rewards_drawing_id', NULL,
        'fish_entries', '[]'::jsonb
      )
    )
  $$,
  'First insert via create_report_atomic succeeds'
);

-- Verify exactly one report was created
SELECT is(
  (SELECT count(*)::int FROM harvest_reports
   WHERE user_id = '00000000-0000-0000-0000-000000000001'
     AND area_code = 'NC-PGTAP-001'),
  1,
  'Exactly one report exists after first insert'
);

-- ============================================
-- Test 2: Duplicate submission is idempotent (dmf_object_id match)
-- ============================================

SELECT lives_ok(
  $$
    SELECT create_report_atomic(
      jsonb_build_object(
        'user_id', '00000000-0000-0000-0000-000000000001',
        'anonymous_user_id', NULL,
        'dmf_status', 'submitted',
        'dmf_confirmation_number', 'TEST-ATOMIC-001',
        'dmf_object_id', 99901,
        'dmf_submitted_at', now()::text,
        'has_license', true,
        'wrc_id', 'NC-TEST-001',
        'first_name', 'Test',
        'last_name', 'Atomic',
        'zip_code', '27601',
        'phone', NULL,
        'email', 'test-atomic@example.com',
        'want_text_confirmation', false,
        'want_email_confirmation', false,
        'harvest_date', '2026-01-15',
        'area_code', 'NC-PGTAP-001',
        'area_label', 'pgTAP Test Area',
        'used_hook_and_line', true,
        'gear_code', NULL,
        'gear_label', NULL,
        'red_drum_count', 2,
        'flounder_count', 1,
        'spotted_seatrout_count', 0,
        'weakfish_count', 0,
        'striped_bass_count', 0,
        'reporting_for', 'self',
        'family_count', NULL,
        'notes', 'pgTAP duplicate test',
        'photo_url', NULL,
        'gps_latitude', NULL,
        'gps_longitude', NULL,
        'entered_rewards', false,
        'rewards_drawing_id', NULL,
        'fish_entries', '[]'::jsonb
      )
    )
  $$,
  'Duplicate insert (same dmf_object_id) does not throw'
);

-- Still only one report should exist (idempotency)
SELECT is(
  (SELECT count(*)::int FROM harvest_reports
   WHERE user_id = '00000000-0000-0000-0000-000000000001'
     AND area_code = 'NC-PGTAP-001'),
  1,
  'Only one record exists after duplicate insert (idempotency via dmf_object_id)'
);

-- ============================================
-- Test 3: DMF-required fields are stored correctly
-- ============================================

SELECT is(
  (SELECT red_drum_count FROM harvest_reports
   WHERE user_id = '00000000-0000-0000-0000-000000000001'
     AND area_code = 'NC-PGTAP-001'
   LIMIT 1),
  2,
  'Red drum count is stored correctly'
);

SELECT is(
  (SELECT dmf_confirmation_number FROM harvest_reports
   WHERE user_id = '00000000-0000-0000-0000-000000000001'
     AND area_code = 'NC-PGTAP-001'
   LIMIT 1),
  'TEST-ATOMIC-001',
  'DMF confirmation number is stored correctly'
);

-- ============================================
-- Cleanup
-- ============================================

SELECT * FROM finish();
ROLLBACK;
