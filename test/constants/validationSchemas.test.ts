import { profileSchema } from '../../src/constants/validationSchemas';

describe('profileSchema', () => {
  describe('wrcId conditional validation', () => {
    it('requires wrcId when hasLicense is true', async () => {
      await expect(
        profileSchema.validate({ hasLicense: true, wrcId: '' })
      ).rejects.toThrow('WRC ID');
    });

    it('accepts missing wrcId when hasLicense is false', async () => {
      await expect(
        profileSchema.validate({
          hasLicense: false,
          firstName: 'Jane',
          lastName: 'Doe',
        })
      ).resolves.toBeDefined();
    });
  });

  describe('name conditional validation', () => {
    it('requires firstName when hasLicense is false', async () => {
      await expect(
        profileSchema.validate({ hasLicense: false, firstName: '', lastName: 'Doe' })
      ).rejects.toThrow('First name');
    });

    it('requires lastName when hasLicense is false', async () => {
      await expect(
        profileSchema.validate({ hasLicense: false, firstName: 'Jane', lastName: '' })
      ).rejects.toThrow('Last name');
    });

    it('does not require name when hasLicense is true', async () => {
      await expect(
        profileSchema.validate({ hasLicense: true, wrcId: 'NC12345' })
      ).resolves.toBeDefined();
    });
  });

  describe('zipCode validation', () => {
    it('accepts valid 5-digit zipCode', async () => {
      await expect(
        profileSchema.validate({ zipCode: '27601' })
      ).resolves.toBeDefined();
    });

    it('rejects non-5-digit zipCode', async () => {
      await expect(
        profileSchema.validate({ zipCode: '123' })
      ).rejects.toThrow('5 digits');
    });

    it('accepts undefined zipCode (optional)', async () => {
      await expect(
        profileSchema.validate({})
      ).resolves.toBeDefined();
    });
  });

  describe('email validation', () => {
    it('accepts valid email', async () => {
      await expect(
        profileSchema.validate({ email: 'test@example.com' })
      ).resolves.toBeDefined();
    });

    it('rejects invalid email', async () => {
      await expect(
        profileSchema.validate({ email: 'not-an-email' })
      ).rejects.toThrow('email');
    });
  });

  describe('phone validation', () => {
    it('accepts valid US phone number', async () => {
      await expect(
        profileSchema.validate({ phone: '+19195551234' })
      ).resolves.toBeDefined();
    });

    it('rejects invalid phone number', async () => {
      await expect(
        profileSchema.validate({ phone: '123' })
      ).rejects.toThrow('phone');
    });

    it('accepts undefined phone (optional)', async () => {
      await expect(
        profileSchema.validate({})
      ).resolves.toBeDefined();
    });
  });
});
