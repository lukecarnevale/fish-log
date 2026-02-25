import { AdvertisementRowSchema, PartnerInquirySchema } from '../../../src/services/validators/promotionSchemas';

const makeValidAdRow = (overrides?: Record<string, unknown>) => ({
  id: 'ad-1',
  company_name: 'Test Co',
  promo_text: 'Big sale',
  promo_code: 'SAVE10',
  link_url: 'https://example.com',
  image_url: 'https://example.com/img.jpg',
  is_active: true,
  priority: 1,
  placements: ['home'],
  location: 'Outer Banks',
  start_date: '2026-01-01',
  end_date: '2026-12-31',
  click_count: 0,
  impression_count: 0,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
  category: 'promotion',
  area_codes: ['OBX'],
  featured: false,
  ...overrides,
});

describe('AdvertisementRowSchema', () => {
  it('parses a valid row', () => {
    const result = AdvertisementRowSchema.parse(makeValidAdRow());
    expect(result.id).toBe('ad-1');
    expect(result.company_name).toBe('Test Co');
  });

  it('rejects missing id', () => {
    expect(() => AdvertisementRowSchema.parse(makeValidAdRow({ id: '' }))).toThrow();
  });

  it('rejects missing company_name', () => {
    expect(() => AdvertisementRowSchema.parse(makeValidAdRow({ company_name: '' }))).toThrow();
  });

  it('rejects javascript: link_url', () => {
    expect(() => AdvertisementRowSchema.parse(makeValidAdRow({ link_url: 'javascript:alert(1)' }))).toThrow();
  });

  it('allows null link_url', () => {
    const result = AdvertisementRowSchema.parse(makeValidAdRow({ link_url: null }));
    expect(result.link_url).toBeNull();
  });

  it('defaults category to promotion when missing', () => {
    const result = AdvertisementRowSchema.parse(makeValidAdRow({ category: undefined }));
    expect(result.category).toBe('promotion');
  });

  it('defaults area_codes to empty array when missing', () => {
    const result = AdvertisementRowSchema.parse(makeValidAdRow({ area_codes: undefined }));
    expect(result.area_codes).toEqual([]);
  });

  it('defaults featured to false when missing', () => {
    const result = AdvertisementRowSchema.parse(makeValidAdRow({ featured: undefined }));
    expect(result.featured).toBe(false);
  });

  it('defaults is_active to true', () => {
    const result = AdvertisementRowSchema.parse(makeValidAdRow({ is_active: undefined }));
    expect(result.is_active).toBe(true);
  });

  it('coerces string priority to number', () => {
    const result = AdvertisementRowSchema.parse(makeValidAdRow({ priority: '5' }));
    expect(result.priority).toBe(5);
  });

  it('allows extra fields via passthrough', () => {
    const result = AdvertisementRowSchema.parse(makeValidAdRow({ extra_field: 'keep' }));
    expect((result as any).extra_field).toBe('keep');
  });

  it('rejects invalid category value', () => {
    expect(() => AdvertisementRowSchema.parse(makeValidAdRow({ category: 'invalid' }))).toThrow();
  });

  it('accepts all valid categories', () => {
    for (const cat of ['promotion', 'charter', 'gear', 'service', 'experience']) {
      const result = AdvertisementRowSchema.parse(makeValidAdRow({ category: cat }));
      expect(result.category).toBe(cat);
    }
  });
});

describe('PartnerInquirySchema', () => {
  const makeValidInquiry = (overrides?: Record<string, unknown>) => ({
    businessName: 'Test Charters',
    contactName: 'John Doe',
    email: 'john@test.com',
    businessType: 'charter',
    message: 'We want to advertise our charter service to NC anglers.',
    areaCodes: ['OBX'],
    ...overrides,
  });

  it('parses a valid inquiry', () => {
    const result = PartnerInquirySchema.parse(makeValidInquiry());
    expect(result.businessName).toBe('Test Charters');
    expect(result.email).toBe('john@test.com');
  });

  it('trims whitespace from businessName', () => {
    const result = PartnerInquirySchema.parse(makeValidInquiry({ businessName: '  Test  ' }));
    expect(result.businessName).toBe('Test');
  });

  it('lowercases email', () => {
    const result = PartnerInquirySchema.parse(makeValidInquiry({ email: 'John@Test.COM' }));
    expect(result.email).toBe('john@test.com');
  });

  it('rejects missing businessName', () => {
    expect(() => PartnerInquirySchema.parse(makeValidInquiry({ businessName: '' }))).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => PartnerInquirySchema.parse(makeValidInquiry({ email: 'not-an-email' }))).toThrow();
  });

  it('rejects message shorter than 10 chars', () => {
    expect(() => PartnerInquirySchema.parse(makeValidInquiry({ message: 'short' }))).toThrow();
  });

  it('rejects invalid business type', () => {
    expect(() => PartnerInquirySchema.parse(makeValidInquiry({ businessType: 'invalid' }))).toThrow();
  });

  it('accepts all valid business types', () => {
    for (const type of ['charter', 'gear_shop', 'guide_service', 'brand', 'marina', 'other']) {
      const result = PartnerInquirySchema.parse(makeValidInquiry({ businessType: type }));
      expect(result.businessType).toBe(type);
    }
  });

  it('allows optional phone', () => {
    const result = PartnerInquirySchema.parse(makeValidInquiry({ phone: undefined }));
    expect(result.phone).toBeUndefined();
  });

  it('allows optional website with valid URL', () => {
    const result = PartnerInquirySchema.parse(makeValidInquiry({ website: 'https://test.com' }));
    expect(result.website).toBe('https://test.com');
  });

  it('rejects invalid website URL', () => {
    expect(() => PartnerInquirySchema.parse(makeValidInquiry({ website: 'not-a-url' }))).toThrow();
  });

  it('defaults areaCodes to empty array', () => {
    const result = PartnerInquirySchema.parse(makeValidInquiry({ areaCodes: undefined }));
    expect(result.areaCodes).toEqual([]);
  });

  it('limits areaCodes to max 10', () => {
    const codes = Array.from({ length: 11 }, (_, i) => `CODE${i}`);
    expect(() => PartnerInquirySchema.parse(makeValidInquiry({ areaCodes: codes }))).toThrow();
  });
});
