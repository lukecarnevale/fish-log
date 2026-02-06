/**
 * src/services/transformers/fishSpeciesTransformer.ts
 *
 * Transformer for converting Supabase fish species rows to camelCase TypeScript types.
 * Consolidates snake_case -> camelCase transformations for the EnhancedFishSpecies entity.
 */

import { EnhancedFishSpecies } from '../../types/fishSpecies';

/**
 * Raw Supabase fish species row (snake_case).
 */
export interface SupabaseFishSpeciesRow {
  id: string;
  name: string;
  common_names: string[];
  scientific_name: string;
  image_primary: string;
  image_additional: string[];
  description: string;
  identification: string;
  max_size: string | null;
  habitat: string | null;
  distribution: string | null;
  regulations: {
    sizeLimit?: {
      min: number | null;
      max: number | null;
      unit: 'in' | 'cm';
      notes?: string;
    };
    bagLimit?: number | null;
    openSeasons?: { from: string; to: string }[] | null;
    closedAreas?: string[];
    specialRegulations?: string[];
  };
  conservation_status: string;
  fishing_tips: {
    techniques?: string[];
    baits?: string[];
    equipment?: string[];
    locations?: string[];
  };
  water_types: string[];
  species_group: string[];
  season_spring: boolean;
  season_summer: boolean;
  season_fall: boolean;
  season_winter: boolean;
  similar_species: {
    id: string;
    name: string;
    differentiatingFeatures: string;
  }[];
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Transform a Supabase fish species row to the camelCase EnhancedFishSpecies type.
 *
 * Handles the following field mappings:
 * - common_names -> commonNames
 * - scientific_name -> scientificName
 * - image_primary -> images.primary
 * - image_additional -> images.additional
 * - max_size -> maxSize
 * - conservation_status -> conservationStatus
 * - fishing_tips -> fishingTips
 * - water_types -> categories.type
 * - species_group -> categories.group
 * - season_* -> seasons.*
 * - similar_species -> similarSpecies
 * - is_active -> (not included in output)
 * - sort_order -> (not included in output)
 * - created_at, updated_at -> (not included in output)
 */
export function transformFishSpecies(row: SupabaseFishSpeciesRow): EnhancedFishSpecies {
  return {
    id: row.id,
    name: row.name,
    commonNames: row.common_names || [],
    scientificName: row.scientific_name,
    image: row.image_primary, // Required by FishSpecies base interface
    images: {
      primary: row.image_primary,
      additional: row.image_additional || [],
    },
    description: row.description,
    identification: row.identification,
    maxSize: row.max_size || '',
    habitat: row.habitat || '',
    distribution: row.distribution || '',
    regulations: {
      sizeLimit: row.regulations?.sizeLimit || { min: null, max: null, unit: 'in' },
      bagLimit: row.regulations?.bagLimit ?? null,
      openSeasons: row.regulations?.openSeasons || null,
      closedAreas: row.regulations?.closedAreas,
      specialRegulations: row.regulations?.specialRegulations,
    },
    conservationStatus: row.conservation_status as EnhancedFishSpecies['conservationStatus'],
    fishingTips: {
      techniques: row.fishing_tips?.techniques || [],
      baits: row.fishing_tips?.baits || [],
      equipment: row.fishing_tips?.equipment || [],
      locations: row.fishing_tips?.locations || [],
    },
    categories: {
      type: row.water_types as ('Freshwater' | 'Saltwater' | 'Brackish')[],
      group: row.species_group || [],
    },
    seasons: {
      spring: row.season_spring,
      summer: row.season_summer,
      fall: row.season_fall,
      winter: row.season_winter,
    },
    similarSpecies: row.similar_species || [],
  };
}

/**
 * Transform a list of Supabase fish species rows to camelCase EnhancedFishSpecies types.
 */
export function transformFishSpeciesList(rows: SupabaseFishSpeciesRow[]): EnhancedFishSpecies[] {
  return rows.map(transformFishSpecies);
}
