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

### 4. Environment Variables

Ensure any API keys, endpoints, or sensitive configuration are set for production:

- [ ] API endpoints point to production servers
- [ ] Analytics/tracking is properly configured
- [ ] Error reporting services are enabled

---

### 5. Final Testing

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

---

## Notes

- The `devConfig.ts` file is the single source of truth for development flags
- All development features should check these flags before enabling
- Keep this checklist updated as new development features are added
