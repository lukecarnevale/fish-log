// config/devConfig.ts
//
// ⚠️  DEVELOPMENT CONFIGURATION - MUST BE UPDATED BEFORE PRODUCTION  ⚠️
//
// See PRE_PRODUCTION_CHECKLIST.md for details on what to change before release.
//

/**
 * Development configuration flags
 *
 * These flags control development/demo features that should be
 * disabled before deploying to production.
 */
export const devConfig = {
  /**
   * When true, sample data will be shown in Past Reports when no real reports exist.
   *
   * ⚠️  SET TO FALSE BEFORE PRODUCTION RELEASE
   */
  SHOW_SAMPLE_REPORTS: true,

  /**
   * When true, the Developer Options menu item is visible in the hamburger menu.
   *
   * ⚠️  SET TO FALSE BEFORE PRODUCTION RELEASE
   */
  SHOW_DEVELOPER_OPTIONS: true,
};

export default devConfig;
