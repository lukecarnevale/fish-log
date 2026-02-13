// types/fishSpecies.ts
import { FishSpecies } from './index';

// Enhanced Fish Species interface with additional fields from FishRules app
// Using Omit to exclude 'regulations' from FishSpecies since we have a different structure
export interface EnhancedFishSpecies extends Omit<FishSpecies, 'regulations'> {
  commonNames: string[];
  images: {
    primary: string;
    additional: string[];
  };
  identification: string;
  maxSize: string;
  distribution: string;
  
  // Enhanced regulations structure
  regulations: {
    sizeLimit: {
      min: number | null;
      max: number | null;
      unit: 'in' | 'cm';
      notes?: string;
    };
    bagLimit: number | null;
    openSeasons: {
      from: string; // mm-dd format
      to: string;   // mm-dd format
    }[] | null;
    closedAreas?: string[];
    specialRegulations?: string[];
  };
  
  // Conservation information
  conservationStatus: 'Least Concern' | 'Near Threatened' | 'Vulnerable' | 'Endangered' | 'Critically Endangered';
  
  // Enhanced fishing information
  fishingTips: {
    techniques: string[];
    baits: string[];
    equipment: string[];
    locations: string[];
  };
  
  // Categorical info for filtering
  categories: {
    type: ('Freshwater' | 'Saltwater' | 'Brackish')[];
    group: string[]; // e.g., "Bass", "Flounder", etc.
  };
  
  similarSpecies?: {
    id: string;
    name: string;
    differentiatingFeatures: string;
  }[];

  // Harvest status (set by active bulletins — closures, restrictions)
  harvestStatus: 'open' | 'closed' | 'catch_and_release' | 'restricted';
  harvestStatusNote?: string;
  harvestStatusEffectiveDate?: string;
  harvestStatusExpirationDate?: string | null;
  harvestStatusBulletinId?: string;
}