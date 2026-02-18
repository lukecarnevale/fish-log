import {
  generateGlobalId,
  generateConfirmationNumber,
  transformToDMFPayload,
  checkRequiredDMFFields,
} from '../../src/services/harvestReportService';
import { makeHarvestInput } from '../factories';

describe('generateGlobalId', () => {
  it('produces correct format {XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX}', () => {
    const id = generateGlobalId();
    expect(id).toMatch(
      /^\{[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\}$/
    );
  });

  it('wraps in curly braces', () => {
    const id = generateGlobalId();
    expect(id.startsWith('{')).toBe(true);
    expect(id.endsWith('}')).toBe(true);
  });

  it('uses uppercase hex characters', () => {
    const id = generateGlobalId();
    const inner = id.slice(1, -1).replace(/-/g, '');
    expect(inner).toMatch(/^[0-9A-F]+$/);
  });

  it('generates unique IDs across 100 calls', () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateGlobalId()));
    expect(ids.size).toBe(100);
  });
});

describe('generateConfirmationNumber', () => {
  it('returns object with dateS, rand, and unique1', () => {
    const result = generateConfirmationNumber();
    expect(result).toHaveProperty('dateS');
    expect(result).toHaveProperty('rand');
    expect(result).toHaveProperty('unique1');
  });

  it('dateS is current day of month', () => {
    const result = generateConfirmationNumber();
    const expected = new Date().getDate().toString();
    expect(result.dateS).toBe(expected);
  });

  it('unique1 is dateS + rand concatenated', () => {
    const result = generateConfirmationNumber();
    expect(result.unique1).toBe(result.dateS + result.rand);
  });

  it('rand is a numeric string', () => {
    const result = generateConfirmationNumber();
    expect(result.rand).toMatch(/^\d+$/);
  });

  it('generates mostly unique numbers across 1000 calls', () => {
    const numbers = new Set(
      Array.from({ length: 1000 }, () => generateConfirmationNumber().unique1)
    );
    expect(numbers.size).toBeGreaterThan(900);
  });
});

describe('transformToDMFPayload', () => {
  it('returns object with attributes and geometry', () => {
    const payload = transformToDMFPayload(makeHarvestInput());
    expect(payload).toHaveProperty('attributes');
    expect(payload).toHaveProperty('geometry');
  });

  it('always has GlobalID in correct format', () => {
    const payload = transformToDMFPayload(makeHarvestInput());
    expect(payload.attributes.GlobalID).toMatch(
      /^\{[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}\}$/
    );
  });

  it('always has confirmation number (Unique1)', () => {
    const payload = transformToDMFPayload(makeHarvestInput());
    expect(payload.attributes.Unique1).toBeDefined();
    expect(payload.attributes.Unique1.length).toBeGreaterThan(0);
  });

  it('geometry is always (0,0,0) with wkid 4326', () => {
    const payload = transformToDMFPayload(makeHarvestInput());
    expect(payload.geometry).toEqual({
      spatialReference: { wkid: 4326 },
      x: 0, y: 0, z: 0,
    });
  });

  it('Harvest is always "Recreational"', () => {
    const payload = transformToDMFPayload(makeHarvestInput());
    expect(payload.attributes.Harvest).toBe('Recreational');
  });

  it('legacy species flags are always null', () => {
    const payload = transformToDMFPayload(makeHarvestInput());
    expect(payload.attributes.RedDr).toBeNull();
    expect(payload.attributes.Flound).toBeNull();
    expect(payload.attributes.SST).toBeNull();
    expect(payload.attributes.Weakf).toBeNull();
    expect(payload.attributes.Striped).toBeNull();
  });

  it('DateH is harvest date in Unix milliseconds', () => {
    const date = new Date('2026-01-15T00:00:00.000Z');
    const payload = transformToDMFPayload(makeHarvestInput({ harvestDate: date }));
    expect(payload.attributes.DateH).toBe(date.getTime());
  });

  it('species counts are strings', () => {
    const payload = transformToDMFPayload(makeHarvestInput({
      redDrumCount: 2, flounderCount: 0,
    }));
    expect(payload.attributes.NumRD).toBe('2');
    expect(payload.attributes.NumF).toBe('0');
    expect(typeof payload.attributes.NumRD).toBe('string');
  });

  // --- Combinatorial matrix: licensed/unlicensed × hook/gear × self/family ---
  const matrix = [
    { licensed: true,  hookAndLine: true,  family: false, desc: 'licensed, hook-and-line, self' },
    { licensed: true,  hookAndLine: true,  family: true,  desc: 'licensed, hook-and-line, family' },
    { licensed: true,  hookAndLine: false, family: false, desc: 'licensed, other gear, self' },
    { licensed: true,  hookAndLine: false, family: true,  desc: 'licensed, other gear, family' },
    { licensed: false, hookAndLine: true,  family: false, desc: 'unlicensed, hook-and-line, self' },
    { licensed: false, hookAndLine: true,  family: true,  desc: 'unlicensed, hook-and-line, family' },
    { licensed: false, hookAndLine: false, family: false, desc: 'unlicensed, other gear, self' },
    { licensed: false, hookAndLine: false, family: true,  desc: 'unlicensed, other gear, family' },
  ];

  it.each(matrix)('correctly transforms: $desc', ({ licensed, hookAndLine, family }) => {
    const input = makeHarvestInput({
      hasLicense: licensed,
      wrcId: licensed ? 'NC12345' : undefined,
      firstName: 'Jane',
      lastName: 'Doe',
      zipCode: '27601',
      usedHookAndLine: hookAndLine,
      gearCode: hookAndLine ? undefined : 'NET',
      reportingFor: family ? 'family' : 'self',
      familyCount: family ? 3 : undefined,
    });
    const payload = transformToDMFPayload(input);

    // Required fields always present
    expect(payload.attributes.GlobalID).toBeDefined();
    expect(payload.attributes.Unique1).toBeDefined();
    expect(payload.attributes.Area).toBe('NC-001');

    // License mapping
    expect(payload.attributes.Licenque).toBe(licensed ? 'Yes' : 'No');
    expect(payload.attributes.License).toBe(licensed ? 'NC12345' : null);

    // Hook & Line mapping
    expect(payload.attributes.Hook).toBe(hookAndLine ? 'Yes' : 'No');
    if (hookAndLine) {
      expect(payload.attributes.Gear).toBeNull();
    } else {
      expect(payload.attributes.Gear).toBe('NET');
    }

    // Family mapping
    if (family) {
      expect(payload.attributes.Fam).toBe('Myself and/or minor children under the age of 18');
      expect(payload.attributes.FamNum).toBe('3');
    } else {
      expect(payload.attributes.Fam).toBe('Myself Only');
      expect(payload.attributes.FamNum).toBeNull();
    }
  });

  // --- Contact preferences ---
  it('includes phone when wantTextConfirmation is true', () => {
    const payload = transformToDMFPayload(makeHarvestInput({
      wantTextConfirmation: true,
      phone: '919-555-1234',
    }));
    expect(payload.attributes.TextCon).toBe('Yes');
    expect(payload.attributes.Phone).toBe('919-555-1234');
  });

  it('excludes phone when wantTextConfirmation is false', () => {
    const payload = transformToDMFPayload(makeHarvestInput({
      wantTextConfirmation: false,
      phone: '919-555-1234', // Should still be excluded
    }));
    expect(payload.attributes.TextCon).toBe('No');
    expect(payload.attributes.Phone).toBeNull();
  });

  it('includes email when wantEmailConfirmation is true', () => {
    const payload = transformToDMFPayload(makeHarvestInput({
      wantEmailConfirmation: true,
      email: 'test@example.com',
    }));
    expect(payload.attributes.EmailCon).toBe('Yes');
    expect(payload.attributes.Email).toBe('test@example.com');
  });

  it('excludes email when wantEmailConfirmation is false', () => {
    const payload = transformToDMFPayload(makeHarvestInput({
      wantEmailConfirmation: false,
      email: 'test@example.com',
    }));
    expect(payload.attributes.EmailCon).toBe('No');
    expect(payload.attributes.Email).toBeNull();
  });

  // --- Name/identity mapping ---
  it('maps firstName/lastName to FirstN/LastN', () => {
    const payload = transformToDMFPayload(makeHarvestInput({
      firstName: 'Jane',
      lastName: 'Doe',
    }));
    expect(payload.attributes.FirstN).toBe('Jane');
    expect(payload.attributes.LastN).toBe('Doe');
  });

  it('maps missing name to null', () => {
    const payload = transformToDMFPayload(makeHarvestInput({
      firstName: undefined,
      lastName: undefined,
    }));
    expect(payload.attributes.FirstN).toBeNull();
    expect(payload.attributes.LastN).toBeNull();
  });
});

describe('checkRequiredDMFFields', () => {
  it('returns valid for complete input', () => {
    const result = checkRequiredDMFFields(makeHarvestInput());
    expect(result.isValid).toBe(true);
    expect(result.missingFields).toHaveLength(0);
  });

  it('reports missing harvestDate', () => {
    const input = makeHarvestInput();
    (input as any).harvestDate = null;
    const result = checkRequiredDMFFields(input);
    expect(result.missingFields).toContain('harvestDate');
  });

  it('reports missing areaCode', () => {
    const result = checkRequiredDMFFields(makeHarvestInput({ areaCode: '' }));
    expect(result.missingFields).toContain('areaCode');
  });

  it('reports missing wrcId for licensed users', () => {
    const result = checkRequiredDMFFields(makeHarvestInput({ hasLicense: true, wrcId: '' }));
    expect(result.missingFields).toContain('wrcId');
  });

  it('reports missing name/zip for unlicensed users', () => {
    const result = checkRequiredDMFFields(makeHarvestInput({
      hasLicense: false,
      firstName: '',
      lastName: '',
      zipCode: '',
    }));
    expect(result.missingFields).toContain('firstName');
    expect(result.missingFields).toContain('lastName');
    expect(result.missingFields).toContain('zipCode');
  });

  it('reports missing gearCode when not using hook and line', () => {
    const result = checkRequiredDMFFields(makeHarvestInput({
      usedHookAndLine: false,
      gearCode: undefined,
    }));
    expect(result.missingFields).toContain('gearCode');
  });
});
