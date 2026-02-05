# Pre-Production Checklist

Before releasing this app to production, complete the following checklist to ensure all development/demo features are properly disabled and all production infrastructure is in place.

---

## Infrastructure & Services Setup

### External Services (Free Tiers)

- [ ] **Crash Reporting** - Set up Sentry (5K events/month free)
  - [ ] Create Sentry project
  - [ ] Install SDK (`@sentry/react-native`)
  - [ ] Configure DSN in environment variables
  - [ ] Test error capture in development

- [ ] **Analytics** - Set up PostHog (1M events/month free)
  - [ ] Create PostHog project
  - [ ] Install SDK
  - [ ] Configure project key in environment variables
  - [ ] Define key events to track (sign up, report submitted, etc.)

- [ ] **Push Notifications** - Set up OneSignal (unlimited free)
  - [ ] Create OneSignal app
  - [ ] Configure iOS APNs credentials (from Apple Developer)
  - [ ] Configure Android FCM credentials (from Firebase Console)
  - [ ] Install SDK (`react-native-onesignal`)
  - [ ] Create Supabase Edge Function for triggering notifications
  - [ ] Test notifications on both platforms

- [ ] **Transactional Email** - Set up Resend (3K emails/month free)
  - [ ] Create Resend account
  - [ ] Verify sending domain (or use onboarding domain initially)
  - [ ] Create email templates (welcome, password reset, etc.)
  - [ ] Configure API key in Supabase Edge Functions

### Supabase Production Setup

- [ ] **Environment Separation**
  - [ ] Set up Supabase CLI for local development (`supabase init`, `supabase start`)
  - [ ] Confirm production project is separate from any dev/test projects
  - [ ] Document environment variable differences between local and production

- [ ] **Database Backups**
  - [ ] Understand backup retention (free tier: 7 days, Pro: 30 days)
  - [ ] Document recovery procedure
  - [ ] Consider upgrading to Pro before launch if data is critical

- [ ] **Database Indexes**
  - [ ] Add indexes for frequently queried columns
  - [ ] Review query performance in Supabase dashboard

---

## CI/CD Pipeline

### GitHub Actions Setup

- [ ] **Build Workflow** - Automate builds on push/PR
  - [ ] Create `.github/workflows/build.yml`
  - [ ] Run linting and type checking
  - [ ] Run unit tests
  - [ ] Build for both iOS and Android

- [ ] **Release Workflow** - Automate app store submissions (optional for v1)
  - [ ] Set up Fastlane for iOS (`fastlane init`)
  - [ ] Set up Fastlane for Android
  - [ ] Store signing credentials securely (GitHub Secrets)
  - [ ] Configure App Store Connect API key
  - [ ] Configure Google Play Service Account

---

## App Store Requirements

### Apple App Store (iOS)

- [ ] **App Store Connect Setup**
  - [ ] Create app record in App Store Connect
  - [ ] Fill in app description, keywords, categories
  - [ ] Prepare screenshots for all required device sizes (6.7", 6.5", 5.5")
  - [ ] Prepare app preview video (optional but recommended)
  - [ ] Set up pricing and availability

- [ ] **Required Compliance**
  - [ ] Complete export compliance questionnaire (encryption)
  - [ ] Complete content ratings questionnaire
  - [ ] Provide privacy nutrition labels (data collection disclosure)
  - [ ] Add App Privacy Policy URL

- [ ] **TestFlight Beta Testing**
  - [ ] Upload initial build to TestFlight
  - [ ] Add internal testers
  - [ ] Test full flow on physical devices

### Google Play Store (Android)

- [ ] **Play Console Setup**
  - [ ] Create app in Google Play Console
  - [ ] Fill in store listing (description, screenshots, feature graphic)
  - [ ] Set up pricing and distribution
  - [ ] Complete content rating questionnaire
  - [ ] Complete data safety questionnaire

- [ ] **Internal Testing Track**
  - [ ] Upload initial AAB to internal testing
  - [ ] Add test users
  - [ ] Test full flow on physical devices

- [ ] **Signing**
  - [ ] Set up Play App Signing (recommended)
  - [ ] Securely store upload key

---

## Required App Features

### Account Deletion (Apple Requirement)

- [ ] **In-App Account Deletion**
  - [ ] Add "Delete Account" option in Settings/Profile
  - [ ] Show confirmation dialog explaining what will be deleted
  - [ ] Implement Supabase function to delete all user data:
    - [ ] Delete from `users` table
    - [ ] Delete from `harvest_reports` table
    - [ ] Delete from `fish_entries` table
    - [ ] Delete from `user_rewards_entries` table
    - [ ] Delete from `user_achievements` table
    - [ ] Delete from `user_species_stats` table
    - [ ] Delete profile photos from storage
  - [ ] Sign user out after deletion
  - [ ] Test complete data removal

### Data Export (GDPR Compliance)

- [ ] **Export User Data Feature**
  - [ ] Add "Export My Data" option in Settings
  - [ ] Create Supabase Edge Function to compile user data
  - [ ] Generate downloadable JSON/CSV file
  - [ ] Test export includes all user data

### Force Update Mechanism

- [ ] **Version Checking**
  - [ ] Create `app_config` table in Supabase with `minimum_version` field
  - [ ] Add version check on app launch
  - [ ] Show blocking modal if version is below minimum
  - [ ] Link to appropriate app store for update

### Offline Handling

- [ ] **Network State Detection**
  - [ ] Detect when device is offline
  - [ ] Show user-friendly message when offline
  - [ ] Queue actions for when connection returns (or inform user)
  - [ ] Test app behavior in airplane mode

### Deep Linking (Recommended)

- [ ] **Universal Links (iOS) / App Links (Android)**
  - [ ] Configure `apple-app-site-association` file
  - [ ] Configure `assetlinks.json` file
  - [ ] Host files on your domain
  - [ ] Test links open correct screens in app

---

## Communication & Support

### User Communication

- [ ] **Support Email**
  - [ ] Set up support@yourdomain.com (required by app stores)
  - [ ] Configure email forwarding/inbox
  - [ ] Add support email in app (Settings/About screen)
  - [ ] Add support email in app store listings

- [ ] **In-App Feedback** (optional for v1)
  - [ ] Add feedback option in app
  - [ ] Consider rate prompt after positive interactions

### Emergency Communication

- [ ] **User Contact Method**
  - [ ] Verify you have email addresses from Supabase Auth
  - [ ] Resend account ready to send bulk notifications if needed
  - [ ] Document procedure for emergency user communication

---

## Monitoring & Logging

### Production Monitoring

- [ ] **Error Tracking**
  - [ ] Sentry configured and tested
  - [ ] Alert notifications set up (email/Slack)
  - [ ] Source maps uploaded for readable stack traces

- [ ] **Key Event Logging**
  - [ ] Log critical events to Supabase table (optional)
  - [ ] Track: sign ups, report submissions, errors
  - [ ] Set up simple dashboard or queries to monitor health

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

## Beta Testing & Launch Strategy

### Phase 1: Beta Testing

#### TestFlight (iOS)

- [ ] Upload build to TestFlight
- [ ] Add internal testers (up to 100, no review needed)
- [ ] Submit for beta review (required for external testers)
- [ ] Create public TestFlight link for sharing
- [ ] Share link in NC fishing Facebook groups
- [ ] Collect feedback for 1-2 weeks
- [ ] Fix critical issues before public launch

#### Google Play Closed Testing

- [ ] Upload AAB to closed testing track
- [ ] Create opt-in link for testers
- [ ] Share link alongside TestFlight link
- [ ] Monitor Android-specific issues
- [ ] Promote to production when stable

#### Beta Feedback Collection

- [ ] Create simple feedback form (Google Forms or Typeform)
- [ ] Add feedback link in app settings during beta
- [ ] Ask testers: What's confusing? What crashed? What's missing?
- [ ] Track common issues and prioritize fixes

### Phase 2: Soft Launch

- [ ] Submit to both app stores (don't promote yet)
- [ ] Wait for approval
- [ ] Post in ONE Facebook group initially
- [ ] Monitor for 1 week with ~50 users
- [ ] Fix any issues that emerge
- [ ] Check app store reviews daily

### Phase 3: Full Launch & Marketing

#### Web Presence

- [ ] **Domain Setup**
  - [ ] Purchase domain (e.g., fishlogapp.com or similar)
  - [ ] Set up simple landing page (Carrd.co recommended - $19/year)
  - [ ] Include: app name, tagline, 1-2 screenshots, store badges
  - [ ] Host Privacy Policy and Terms of Use
  - [ ] Add support email
  - [ ] Create redirect URL for QR codes (e.g., yourdomain.com/download)

#### QR Code Campaign

- [ ] **QR Code Setup**
  - [ ] Design QR code pointing to yourdomain.com/download (NOT direct to app store)
  - [ ] Create weatherproof sign design with messaging:
    - "Report Your Catch in 30 Seconds"
    - "Skip the paper forms. Enter to win fishing gear."
  - [ ] Print laminated/weatherproof signs
  - [ ] Test QR code scans before printing in bulk

- [ ] **Distribution Locations**
  - [ ] Identify public boat ramps in mandatory reporting areas
  - [ ] Contact local bait shops about displaying signs
  - [ ] Check regulations about posting signs at public ramps
  - [ ] Track which locations generate most downloads (use UTM parameters)

#### Facebook Group Outreach

- [ ] Identify NC fishing Facebook groups (coastal/inshore focused)
- [ ] Join groups and participate genuinely before promoting
- [ ] Draft authentic post (not salesy):
  > "Hey everyone - I built a free app to make DMF harvest reporting faster.
  > Takes about 30 seconds instead of filling out the paper form.
  > You can also enter to win fishing gear. Would love feedback from fellow NC anglers."
- [ ] Post in groups after soft launch proves stability
- [ ] Respond to comments and questions promptly
- [ ] Don't spam - one post per group is enough

#### Other Marketing Ideas

- [ ] Contact local fishing blogs/podcasts about coverage
- [ ] Reach out to fishing guides who might recommend to clients
- [ ] Consider partnership with NC DMF (they might promote compliant tools)
- [ ] Ask happy beta testers to leave App Store reviews

---

## Launch Day Checklist

- [ ] All `devConfig` flags set to `false`
- [ ] Production Supabase project with RLS enabled
- [ ] All environment variables pointing to production
- [ ] Sentry and PostHog configured
- [ ] App submitted and approved on both stores
- [ ] Legal documents hosted and accessible
- [ ] Support email monitored
- [ ] Team notified and available for issues

---

## Post-Launch (First Week)

- [ ] Monitor Sentry for crash reports
- [ ] Monitor PostHog for user behavior
- [ ] Check Supabase dashboard for database health
- [ ] Respond to any app store reviews
- [ ] Monitor support email
- [ ] Check analytics for drop-off points in user flow
- [ ] Prepare hotfix process if critical bugs found

---

## Future Considerations (Post-v1)

These are not required for initial launch but consider adding:

- [ ] **Staging Environment** - Second Supabase project for testing
- [ ] **Feature Flags** - Remote configuration for A/B testing
- [ ] **Uptime Monitoring** - Better Uptime or similar
- [ ] **In-App Purchases** - RevenueCat if adding paid features
- [ ] **Customer Support Tool** - Intercom/Crisp if volume increases
- [ ] **Automated Testing** - E2E tests with Detox or Maestro

---

## Notes

- The `devConfig.ts` file is the single source of truth for development flags
- All development features should check these flags before enabling
- Keep this checklist updated as new development features are added
- Free tier limits to watch:
  - Sentry: 5K events/month
  - PostHog: 1M events/month
  - Resend: 3K emails/month
  - Supabase Free: 500MB database, 1GB storage, 50K auth users
  - GitHub Actions: 2K minutes/month (private repos)
