import {
  CoordinatesSchema,
  AnglerSchema,
  FishReportSchema,
  FishSpeciesSchema,
  UserProfileSchema,
  FishingLicenseSchema,
} from '../../src/models/schemas';

describe('CoordinatesSchema', () => {
  it('accepts valid coordinates', () => {
    expect(CoordinatesSchema.parse({ latitude: 35.5, longitude: -76.5 })).toEqual({
      latitude: 35.5,
      longitude: -76.5,
    });
  });

  it('rejects missing latitude', () => {
    expect(() => CoordinatesSchema.parse({ longitude: -76.5 })).toThrow();
  });

  it('rejects non-numeric latitude', () => {
    expect(() => CoordinatesSchema.parse({ latitude: 'abc', longitude: -76.5 })).toThrow();
  });
});

describe('AnglerSchema', () => {
  it('accepts valid angler with all fields', () => {
    const result = AnglerSchema.parse({
      name: 'Test Angler',
      email: 'test@example.com',
      phone: '919-555-1234',
      licenseNumber: 'NC12345',
    });
    expect(result.name).toBe('Test Angler');
  });

  it('accepts empty object (all fields optional)', () => {
    expect(() => AnglerSchema.parse({})).not.toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => AnglerSchema.parse({ email: 'not-an-email' })).toThrow();
  });
});

describe('FishReportSchema', () => {
  it('accepts valid fish report', () => {
    const result = FishReportSchema.parse({
      species: 'Red Drum',
      length: '24',
      location: 'Pamlico Sound',
    });
    expect(result.species).toBe('Red Drum');
  });

  it('accepts empty object', () => {
    expect(() => FishReportSchema.parse({})).not.toThrow();
  });

  it('rejects invalid UUID for id', () => {
    expect(() => FishReportSchema.parse({ id: 'not-uuid' })).toThrow();
  });

  it('accepts Date object for date field', () => {
    const result = FishReportSchema.parse({ date: new Date('2026-01-15') });
    expect(result.date).toBeInstanceOf(Date);
  });

  it('accepts string for date field', () => {
    const result = FishReportSchema.parse({ date: '2026-01-15' });
    expect(result.date).toBe('2026-01-15');
  });

  it('accepts nested coordinates', () => {
    const result = FishReportSchema.parse({
      coordinates: { latitude: 35.5, longitude: -76.5 },
    });
    expect(result.coordinates).toEqual({ latitude: 35.5, longitude: -76.5 });
  });
});

describe('FishSpeciesSchema', () => {
  const validSpecies = {
    id: 'sp-1',
    name: 'Red Drum',
    scientificName: 'Sciaenops ocellatus',
    image: 'https://img.com/rd.jpg',
    description: 'A large fish',
    habitat: 'Coastal waters',
    seasons: { spring: true, summer: true, fall: true, winter: false },
  };

  it('accepts valid species', () => {
    const result = FishSpeciesSchema.parse(validSpecies);
    expect(result.name).toBe('Red Drum');
  });

  it('rejects missing required fields', () => {
    expect(() => FishSpeciesSchema.parse({ id: 'sp-1' })).toThrow();
  });

  it('accepts regulations as array of strings', () => {
    const result = FishSpeciesSchema.parse({ ...validSpecies, regulations: ['Rule 1', 'Rule 2'] });
    expect(result.regulations).toEqual(['Rule 1', 'Rule 2']);
  });

  it('accepts regulations as string', () => {
    const result = FishSpeciesSchema.parse({ ...validSpecies, regulations: 'No size limit' });
    expect(result.regulations).toBe('No size limit');
  });
});

describe('UserProfileSchema', () => {
  it('accepts valid profile', () => {
    const result = UserProfileSchema.parse({
      firstName: 'Test',
      lastName: 'User',
      email: 'test@example.com',
    });
    expect(result.firstName).toBe('Test');
  });

  it('accepts empty object', () => {
    expect(() => UserProfileSchema.parse({})).not.toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => UserProfileSchema.parse({ email: 'bad' })).toThrow();
  });

  it('rejects invalid UUID for id', () => {
    expect(() => UserProfileSchema.parse({ id: 'not-uuid' })).toThrow();
  });

  it('enforces firstName max length of 50', () => {
    expect(() => UserProfileSchema.parse({ firstName: 'a'.repeat(51) })).toThrow();
  });
});

describe('FishingLicenseSchema', () => {
  it('accepts valid license', () => {
    const result = FishingLicenseSchema.parse({
      licenseNumber: 'NC12345',
      licenseType: 'Annual',
    });
    expect(result.licenseNumber).toBe('NC12345');
  });

  it('accepts empty object', () => {
    expect(() => FishingLicenseSchema.parse({})).not.toThrow();
  });

  it('rejects invalid UUID for id', () => {
    expect(() => FishingLicenseSchema.parse({ id: 'not-uuid' })).toThrow();
  });
});
