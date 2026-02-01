# Pre-Production Checklist

Before releasing this app to production, complete the following checklist to ensure all development/demo features are properly disabled.

---

## Required Changes

### 1. Disable Development Configuration Flags

**File:** `src/config/devConfig.ts`

Update the following flags to `false`:

```typescript
export const devConfig = {
  SHOW_SAMPLE_REPORTS: false,      // Disables sample data in Past Reports
  SHOW_DEVELOPER_OPTIONS: false,   // Hides Developer Options menu item
};
```

---

### 2. Review Advertisement Data

**File:** `src/data/advertisementsData.ts`

- Ensure all active advertisements have valid, approved content
- Verify all `linkUrl` values point to correct destinations
- Confirm `promoCode` values are current and valid
- Remove any test/placeholder advertisements

---

### 3. Review Raffle/Prize Data

**File:** `src/data/prizesData.ts`

- Update raffle dates (`startDate`, `endDate`, `drawingDate`) to actual dates
- Verify prize information is accurate
- Confirm eligibility requirements are correct

---

### 4. Supabase Security

**Dashboard:** [Supabase Project](https://supabase.com/dashboard)

Enable Row Level Security (RLS) on all tables and configure proper policies:

- [ ] Enable RLS on `users` table
- [ ] Enable RLS on `harvest_reports` table
- [ ] Enable RLS on `fish_entries` table
- [ ] Enable RLS on `user_rewards_entries` table
- [ ] Enable RLS on `user_achievements` table
- [ ] Enable RLS on `user_species_stats` table
- [ ] Enable RLS on `device_merge_requests` table

**Recommended policies for production:**

```sql
-- Users: Only allow operations on own data (matched by device_id or auth.uid)
CREATE POLICY "Users manage own profile" ON users
  USING (device_id = current_setting('request.headers')::json->>'x-device-id'
         OR auth.uid()::text = id);

-- Reports: Only allow operations on own reports
CREATE POLICY "Users manage own reports" ON harvest_reports
  USING (user_id IN (SELECT id FROM users WHERE device_id = current_setting('request.headers')::json->>'x-device-id')
         OR auth.uid()::text = user_id);
```

**Note:** For development, RLS can be disabled. For production, enable RLS and implement proper authentication (email/password or OAuth) for stronger security.

#### Storage Bucket Policies

Enable RLS on storage buckets for profile photos:

- [ ] Remove development policy from `profile-photos` bucket
- [ ] Add production policies for `profile-photos` bucket

```sql
-- Remove the permissive development policy
DROP POLICY IF EXISTS "Allow all operations on profile-photos" ON storage.objects;

-- Allow authenticated users to upload their own profile photos
CREATE POLICY "Authenticated users can upload profile photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'profile-photos'
  AND (storage.foldername(name))[1] IS NULL
  AND name ~ ('^' || auth.uid()::text || '_')
);

-- Allow authenticated users to update their own photos
CREATE POLICY "Users can update own profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND name ~ ('^' || auth.uid()::text || '_')
);

-- Allow authenticated users to delete their own photos
CREATE POLICY "Users can delete own profile photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'profile-photos'
  AND name ~ ('^' || auth.uid()::text || '_')
);

-- Allow public read access for profile photos
CREATE POLICY "Public read access for profile photos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-photos');
```

---

### 5. Environment Variables

Ensure any API keys, endpoints, or sensitive configuration are set for production:

- [ ] API endpoints point to production servers
- [ ] Analytics/tracking is properly configured
- [ ] Error reporting services are enabled
- [ ] Supabase URL and anon key are correct for production project

---

### 6. Legal Documents

Review and finalize all legal documents before production:

- [ ] **Privacy Policy** (`PRIVACY_POLICY.md`) - Review with attorney
  - [ ] Fill in all `[INSERT ...]` placeholders (company name, email, address, etc.)
  - [ ] Update "Last Updated" date
  - [ ] Ensure compliance with GDPR, CCPA, COPPA requirements
  - [ ] Host on accessible URL and link from app

- [ ] **Terms of Use** (`TERMS_OF_USE.md`) - Review with attorney
  - [ ] Fill in all `[INSERT ...]` placeholders
  - [ ] Update "Last Updated" date
  - [ ] Review arbitration and class action waiver clauses
  - [ ] Host on accessible URL and link from app

- [ ] **Third-Party Licenses** (`LICENSES.md`)
  - [ ] Verify all dependencies are listed
  - [ ] Update "Last Updated" date
  - [ ] Make accessible in app settings

- [ ] Add in-app links to legal documents (Settings or About screen)
- [ ] Add acceptance checkbox for Terms during onboarding (if required)

**IMPORTANT:** These documents are templates and MUST be reviewed by a qualified attorney before production use.

---

### 7. Final Testing

- [ ] Test app with `devConfig` flags set to `false`
- [ ] Verify Past Reports shows empty state (not sample data) for new users
- [ ] Confirm Developer Options menu is hidden
- [ ] Test full user flow from registration to report submission

---

## Files to Review

| File | What to Check |
|------|---------------|
| `src/config/devConfig.ts` | Set all flags to `false` |
| `src/data/advertisementsData.ts` | Verify ad content and links |
| `src/data/prizesData.ts` | Update dates and prize info |
| `app.json` | Version number, bundle ID |
| `PRIVACY_POLICY.md` | Fill placeholders, attorney review |
| `TERMS_OF_USE.md` | Fill placeholders, attorney review |
| `LICENSES.md` | Verify all dependencies listed |

---

## Notes

- The `devConfig.ts` file is the single source of truth for development flags
- All development features should check these flags before enabling
- Keep this checklist updated as new development features are added
