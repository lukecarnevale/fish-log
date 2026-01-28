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
  seaTow: require('../assets/sea_tow_boat.jpg'),
  shimanoReels: require('../assets/shimano-reels.jpg'),
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
  {
    id: 'sea-tow-2026',
    companyName: 'Sea Tow',
    promoText: '24/7 On-Water Assistance - Join Today!',
    promoCode: 'NCFISH20',
    linkUrl: 'https://www.seatow.com/',
    image: adImages.seaTow,
    isActive: true,
    priority: 2,
  },
  {
    id: 'shimano-reels-2026',
    companyName: 'Shimano',
    promoText: 'Premium Fishing Reels - Built to Perform',
    promoCode: 'CATCH15',
    linkUrl: 'https://fish.shimano.com/',
    image: adImages.shimanoReels,
    isActive: true,
    priority: 3,
  },
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
