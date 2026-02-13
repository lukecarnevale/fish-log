// config/devConfig.ts
//
// Development feature flags - now derived from environment variables at build time.
// No manual changes needed before production release!

import { env } from './env';

export const devConfig = {
  /** Show Developer Options menu item in hamburger menu */
  get SHOW_DEVELOPER_OPTIONS(): boolean {
    return env.SHOW_DEVELOPER_TOOLS;
  },
};

export default devConfig;
