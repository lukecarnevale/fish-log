import {
  transformFishSpecies,
  transformFishSpeciesList,
  SupabaseFishSpeciesRow,
} from '../../../src/services/transformers/fishSpeciesTransformer';

const makeRow = (overrides?: Partial<SupabaseFishSpeciesRow>): SupabaseFishSpeciesRow => ({
  id: 'sp-1',
  name: 'Red Drum',
  common_names: ['Channel Bass', 'Puppy Drum'],
  scientific_name: 'Sciaenops ocellatus',
  image_primary: 'https://img.com/red-drum.jpg',
  image_additional: ['https://img.com/rd2.jpg'],
  description: 'A large Atlantic fish',
  identification: 'Copper color with black spot on tail',
  max_size: '60 inches',
  habitat: 'Coastal waters',
  distribution: 'Atlantic coast',
  regulations: {
    sizeLimit: { min: 18, max: 27, unit: 'in' },
    bagLimit: 1,
    openSeasons: [{ from: '2026-01-01', to: '2026-12-31' }],
    closedAreas: [],
    specialRegulations: [],
  },
  conservation_status: 'least_concern',
  fishing_tips: {
    techniques: ['Bottom fishing'],
    baits: ['Shrimp'],
    equipment: ['Medium rod'],
    locations: ['Pamlico Sound'],
  },
  water_types: ['Saltwater'],
  species_group: ['Game Fish'],
  season_spring: true,
  season_summer: true,
  season_fall: true,
  season_winter: false,
  similar_species: [{ id: 'sp-2', name: 'Black Drum', differentiatingFeatures: 'No tail spot' }],
  is_active: true,
  sort_order: 1,
  harvest_status: 'open',
  harvest_status_note: null,
  harvest_status_effective_date: null,
  harvest_status_expiration_date: null,
  harvest_status_bulletin_id: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-15T00:00:00Z',
  ...overrides,
});

describe('transformFishSpecies', () => {
  it('maps core fields correctly', () => {
    const result = transformFishSpecies(makeRow());
    expect(result.id).toBe('sp-1');
    expect(result.name).toBe('Red Drum');
    expect(result.scientificName).toBe('Sciaenops ocellatus');
    expect(result.commonNames).toEqual(['Channel Bass', 'Puppy Drum']);
  });

  it('maps images correctly', () => {
    const result = transformFishSpecies(makeRow());
    expect(result.image).toBe('https://img.com/red-drum.jpg');
    expect(result.images.primary).toBe('https://img.com/red-drum.jpg');
    expect(result.images.additional).toEqual(['https://img.com/rd2.jpg']);
  });

  it('maps seasons from individual booleans', () => {
    const result = transformFishSpecies(makeRow());
    expect(result.seasons).toEqual({
      spring: true,
      summer: true,
      fall: true,
      winter: false,
    });
  });

  it('maps categories from water_types and species_group', () => {
    const result = transformFishSpecies(makeRow());
    expect(result.categories.type).toEqual(['Saltwater']);
    expect(result.categories.group).toEqual(['Game Fish']);
  });

  it('maps regulations with all fields', () => {
    const result = transformFishSpecies(makeRow());
    expect(result.regulations.sizeLimit).toEqual({ min: 18, max: 27, unit: 'in' });
    expect(result.regulations.bagLimit).toBe(1);
  });

  it('handles null/missing nullable fields', () => {
    const result = transformFishSpecies(makeRow({
      max_size: null,
      habitat: null,
      distribution: null,
    }));
    expect(result.maxSize).toBe('');
    expect(result.habitat).toBe('');
    expect(result.distribution).toBe('');
  });

  it('defaults harvestStatus to open when null', () => {
    const result = transformFishSpecies(makeRow({
      harvest_status: null as any,
    }));
    expect(result.harvestStatus).toBe('open');
  });

  it('maps harvestStatus fields', () => {
    const result = transformFishSpecies(makeRow({
      harvest_status: 'closed',
      harvest_status_note: 'Seasonal closure',
      harvest_status_effective_date: '2026-01-01',
      harvest_status_expiration_date: '2026-03-31',
      harvest_status_bulletin_id: 'bulletin-1',
    }));
    expect(result.harvestStatus).toBe('closed');
    expect(result.harvestStatusNote).toBe('Seasonal closure');
    expect(result.harvestStatusExpirationDate).toBe('2026-03-31');
    expect(result.harvestStatusBulletinId).toBe('bulletin-1');
  });

  it('maps similarSpecies', () => {
    const result = transformFishSpecies(makeRow());
    expect(result.similarSpecies).toEqual([
      { id: 'sp-2', name: 'Black Drum', differentiatingFeatures: 'No tail spot' },
    ]);
  });
});

describe('transformFishSpeciesList', () => {
  it('transforms multiple rows', () => {
    const result = transformFishSpeciesList([makeRow({ id: 'a' }), makeRow({ id: 'b' })]);
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('a');
    expect(result[1].id).toBe('b');
  });
});
