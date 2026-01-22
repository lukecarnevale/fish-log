// data/advertisementsData.ts
import { ImageSourcePropType } from 'react-native';

export interface Advertisement {
  id: string;
  companyName: string;
  promoText: string;
  promoCode?: string; // Optional promo code to display
  linkUrl: string;
  image: ImageSourcePropType;
  isActive: boolean;
  // Optional fields for tracking/scheduling
  startDate?: string;
  endDate?: string;
  priority?: number; // Higher priority ads show first
}

// Define available ad images - add new images here as they become available
export const adImages = {
  qualifiedCaptain1: require('../assets/QC Ad1.png'),
  // Add more ad images here as needed:
  // companyName1: require('../assets/CompanyAd1.png'),
};

// Active advertisements - easily maintainable list
export const advertisements: Advertisement[] = [
  {
    id: 'qc-hats-2026',
    companyName: 'The Qualified Captain',
    promoText: '15% off hats to all users!',
    promoCode: 'FISHREPORT',
    linkUrl: 'https://thequalifiedcaptain.com/',
    image: adImages.qualifiedCaptain1,
    isActive: true,
    priority: 1,
  },
  // Add more advertisements here:
  // {
  //   id: 'company-promo-2026',
  //   companyName: 'Another Company',
  //   promoText: 'Special offer text here!',
  //   linkUrl: 'https://example.com/',
  //   image: adImages.companyName1,
  //   isActive: true,
  //   priority: 2,
  // },
];

// Helper function to get active advertisements sorted by priority
export const getActiveAdvertisements = (): Advertisement[] => {
  return advertisements
    .filter((ad) => ad.isActive)
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));
};

// Helper function to get a specific advertisement by ID
export const getAdvertisementById = (id: string): Advertisement | undefined => {
  return advertisements.find((ad) => ad.id === id);
};
