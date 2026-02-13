-- Migration: Add preferred area of harvest columns to users table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- Add preferred_area_code column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_area_code TEXT;

-- Add preferred_area_label column
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_area_label TEXT;

-- Add comment for documentation
COMMENT ON COLUMN users.preferred_area_code IS 'User''s preferred area of harvest code (DMF area code) - pre-fills report form';
COMMENT ON COLUMN users.preferred_area_label IS 'User''s preferred area of harvest label (display name) - pre-fills report form';
