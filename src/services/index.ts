// services/index.ts
//
// Barrel export for all services.
//

// Harvest Report Service (DMF Submission)
export {
  generateGlobalId,
  generateConfirmationNumber,
  transformToDMFPayload,
  submitToDMF,
  mockSubmitToDMF,
  submitHarvestReport,
  previewDMFPayload,
  checkRequiredDMFFields,
  type ConfirmationNumberParts,
  type MockSubmitOptions,
} from './harvestReportService';

// Offline Queue Service
export {
  // Queue management
  addToQueue,
  getQueue,
  getQueueCount,
  clearQueue,
  removeFromQueue,
  syncQueuedReports,
  // History management
  addToHistory,
  getHistory,
  getHistoryCount,
  clearHistory,
  getHistoryEntry,
  // Combined submission
  submitWithQueueFallback,
  // Types
  type SyncResult,
  type SubmitWithQueueResult,
} from './offlineQueue';

// User Profile Service
export {
  getCachedUser,
  cacheUser,
  getCachedStats,
  cacheStats,
  syncToUserProfile,
  updateUserInSupabase,
  fetchStatsFromSupabase,
  getCurrentUser,
  updateCurrentUser,
  getUserStats,
  getAllAchievements,
  syncUserData,
} from './userProfileService';

// Rewards Conversion Service
export {
  convertToRewardsMember,
  isRewardsMember,
  getRewardsMemberForAnonymousUser,
  linkEmailToUser,
  createRewardsMemberFromAuthUser,
  findRewardsMemberByAuthId,
} from './rewardsConversionService';
