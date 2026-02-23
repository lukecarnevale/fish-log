/**
 * harvestReportService.test.ts - DMF submission service tests
 *
 * Tests payload transformation, confirmation number generation,
 * webhook triggering, and submission routing (mock vs production).
 */
import { mockSupabase } from '../mocks/supabase';
import { makeHarvestInput } from '../factories';

import {
  generateGlobalId,
  generateConfirmationNumber,
  transformToDMFPayload,
  checkRequiredDMFFields,
  previewDMFPayload,
  triggerDMFConfirmationWebhook,
  submitHarvestReport,
  mockSubmitToDMF,
} from '../../src/services/harvestReportService';

describe('harvestReportService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // generateGlobalId
  // ============================================================
  describe('generateGlobalId', () => {
    it('returns a GUID with curly braces', () => {
      const id = generateGlobalId();
      expect(id).toMatch(/^\{[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}\}$/);
    });

    it('generates unique IDs', () => {
      const ids = Array.from({ length: 100 }, () => generateGlobalId());
      const unique = new Set(ids);
      expect(unique.size).toBe(100);
    });
  });

  // ============================================================
  // generateConfirmationNumber
  // ============================================================
  describe('generateConfirmationNumber', () => {
    it('returns dateS, rand, and unique1', () => {
      const parts = generateConfirmationNumber();
      expect(parts.dateS).toBeDefined();
      expect(parts.rand).toBeDefined();
      expect(parts.unique1).toBe(parts.dateS + parts.rand);
    });

    it('dateS is the current day of month', () => {
      const parts = generateConfirmationNumber();
      const today = new Date().getDate().toString();
      expect(parts.dateS).toBe(today);
    });

    it('rand is a string representation of a number', () => {
      const parts = generateConfirmationNumber();
      expect(Number(parts.rand)).not.toBeNaN();
    });
  });

  // ============================================================
  // transformToDMFPayload
  // ============================================================
  describe('transformToDMFPayload', () => {
    it('transforms input to DMF ArcGIS format', () => {
      const input = makeHarvestInput({
        hasLicense: true,
        wrcId: 'NC12345',
        firstName: 'John',
        lastName: 'Doe',
        redDrumCount: 2,
        flounderCount: 1,
        areaCode: 'NC-005',
      });

      const payload = transformToDMFPayload(input);

      expect(payload.attributes).toBeDefined();
      expect(payload.geometry).toBeDefined();

      // Check attribute mapping
      expect(payload.attributes.Licenque).toBe('Yes');
      expect(payload.attributes.License).toBe('NC12345');
      expect(payload.attributes.FirstN).toBe('John');
      expect(payload.attributes.LastN).toBe('Doe');
      expect(payload.attributes.NumRD).toBe('2');
      expect(payload.attributes.NumF).toBe('1');
      expect(payload.attributes.Area).toBe('NC-005');
      expect(payload.attributes.Harvest).toBe('Recreational');
    });

    it('sets Licenque to No when hasLicense is false', () => {
      const input = makeHarvestInput({ hasLicense: false });
      const payload = transformToDMFPayload(input);

      expect(payload.attributes.Licenque).toBe('No');
      expect(payload.attributes.License).toBeNull();
    });

    it('formats family reporting correctly', () => {
      const input = makeHarvestInput({
        reportingFor: 'family',
        familyCount: 3,
      } as any);
      const payload = transformToDMFPayload(input);

      expect(payload.attributes.Fam).toBe('Myself and/or minor children under the age of 18');
      expect(payload.attributes.FamNum).toBe('3');
    });

    it('sets self reporting correctly', () => {
      const input = makeHarvestInput({ reportingFor: 'self' });
      const payload = transformToDMFPayload(input);

      expect(payload.attributes.Fam).toBe('Myself Only');
      expect(payload.attributes.FamNum).toBeNull();
    });

    it('includes text confirmation preferences', () => {
      const input = makeHarvestInput({
        wantTextConfirmation: true,
        phone: '5551234567',
      } as any);
      const payload = transformToDMFPayload(input);

      expect(payload.attributes.TextCon).toBe('Yes');
      expect(payload.attributes.Phone).toBe('5551234567');
    });

    it('excludes phone when text confirmation disabled', () => {
      const input = makeHarvestInput({ wantTextConfirmation: false });
      const payload = transformToDMFPayload(input);

      expect(payload.attributes.TextCon).toBe('No');
      expect(payload.attributes.Phone).toBeNull();
    });

    it('includes email confirmation preferences', () => {
      const input = makeHarvestInput({
        wantEmailConfirmation: true,
        email: 'test@example.com',
      } as any);
      const payload = transformToDMFPayload(input);

      expect(payload.attributes.EmailCon).toBe('Yes');
      expect(payload.attributes.Email).toBe('test@example.com');
    });

    it('sets harvestDate as Unix milliseconds', () => {
      const date = new Date('2026-01-15T00:00:00.000Z');
      const input = makeHarvestInput({ harvestDate: date });
      const payload = transformToDMFPayload(input);

      expect(payload.attributes.DateH).toBe(date.getTime());
    });

    it('maps hook and line correctly', () => {
      const hookInput = makeHarvestInput({ usedHookAndLine: true });
      expect(transformToDMFPayload(hookInput).attributes.Hook).toBe('Yes');

      const gearInput = makeHarvestInput({
        usedHookAndLine: false,
        gearCode: 'GILL_NET',
      } as any);
      const gearPayload = transformToDMFPayload(gearInput);
      expect(gearPayload.attributes.Hook).toBe('No');
      expect(gearPayload.attributes.Gear).toBe('GILL_NET');
    });

    it('includes correct geometry', () => {
      const input = makeHarvestInput();
      const payload = transformToDMFPayload(input);

      expect(payload.geometry.spatialReference.wkid).toBe(4326);
      expect(payload.geometry.x).toBe(0);
      expect(payload.geometry.y).toBe(0);
      expect(payload.geometry.z).toBe(0);
    });

    it('species count fields are strings', () => {
      const input = makeHarvestInput({
        redDrumCount: 5,
        flounderCount: 3,
        spottedSeatroutCount: 0,
        weakfishCount: 0,
        stripedBassCount: 0,
      });
      const payload = transformToDMFPayload(input);

      expect(payload.attributes.NumRD).toBe('5');
      expect(payload.attributes.NumF).toBe('3');
      expect(payload.attributes.NumSS).toBe('0');
      expect(payload.attributes.NumW).toBe('0');
      expect(payload.attributes.NumSB).toBe('0');
    });

    it('generates GlobalID and Unique1', () => {
      const input = makeHarvestInput();
      const payload = transformToDMFPayload(input);

      expect(payload.attributes.GlobalID).toMatch(/^\{.+\}$/);
      expect(payload.attributes.Unique1).toBeDefined();
      expect(typeof payload.attributes.Unique1).toBe('string');
    });
  });

  // ============================================================
  // checkRequiredDMFFields
  // ============================================================
  describe('checkRequiredDMFFields', () => {
    it('validates a complete input as valid', () => {
      const input = makeHarvestInput();
      const result = checkRequiredDMFFields(input);
      expect(result.isValid).toBe(true);
      expect(result.missingFields).toEqual([]);
    });

    it('requires hasLicense', () => {
      const input = makeHarvestInput();
      (input as any).hasLicense = undefined;
      const result = checkRequiredDMFFields(input);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('hasLicense');
    });

    it('requires harvestDate', () => {
      const input = makeHarvestInput({ harvestDate: null as any });
      const result = checkRequiredDMFFields(input);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('harvestDate');
    });

    it('requires areaCode', () => {
      const input = makeHarvestInput({ areaCode: '' });
      const result = checkRequiredDMFFields(input);
      expect(result.isValid).toBe(false);
      expect(result.missingFields).toContain('areaCode');
    });

    it('requires wrcId when hasLicense is true', () => {
      const input = makeHarvestInput({ hasLicense: true, wrcId: '' });
      const result = checkRequiredDMFFields(input);
      expect(result.missingFields).toContain('wrcId');
    });

    it('requires name and zip when no license', () => {
      const input = makeHarvestInput({
        hasLicense: false,
        firstName: '',
        lastName: '',
        zipCode: '',
      });
      const result = checkRequiredDMFFields(input);
      expect(result.missingFields).toContain('firstName');
      expect(result.missingFields).toContain('lastName');
      expect(result.missingFields).toContain('zipCode');
    });

    it('requires gearCode when not using hook and line', () => {
      const input = makeHarvestInput({ usedHookAndLine: false } as any);
      const result = checkRequiredDMFFields(input);
      expect(result.missingFields).toContain('gearCode');
    });
  });

  // ============================================================
  // previewDMFPayload
  // ============================================================
  describe('previewDMFPayload', () => {
    it('returns the same payload as transformToDMFPayload', () => {
      const input = makeHarvestInput();
      const preview = previewDMFPayload(input);
      expect(preview.attributes).toBeDefined();
      expect(preview.geometry).toBeDefined();
    });
  });

  // ============================================================
  // triggerDMFConfirmationWebhook
  // ============================================================
  describe('triggerDMFConfirmationWebhook', () => {
    // The function persists webhook status via supabase.from().update().eq().
    // The default mock has `then: jest.fn()` which makes `await` hang (JS thenables).
    // Override `from` for all webhook tests to return a properly resolving chain.
    beforeEach(() => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));
    });

    it('invokes Supabase edge function', async () => {
      // Setup mock for supabase.functions.invoke
      (mockSupabase as any).functions = {
        invoke: jest.fn().mockResolvedValue({
          data: { webhooksTriggered: 2, message: 'ok', errors: [] },
          error: null,
        }),
      };

      const result = await triggerDMFConfirmationWebhook(
        42, '{MOCK-GUID}', {} as any, {} as any, false
      );

      expect(result.success).toBe(true);
      expect(result.webhooksTriggered).toBe(2);
      expect((mockSupabase as any).functions.invoke).toHaveBeenCalledWith(
        'trigger-dmf-webhook',
        expect.any(Object)
      );
    });

    it('handles edge function error gracefully', async () => {
      (mockSupabase as any).functions = {
        invoke: jest.fn().mockResolvedValue({
          data: null,
          error: { message: 'Edge function timeout' },
        }),
      };

      const result = await triggerDMFConfirmationWebhook(
        42, '{MOCK-GUID}', {} as any, {} as any, false
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Edge function timeout');
    });

    it('handles thrown exceptions gracefully', async () => {
      (mockSupabase as any).functions = {
        invoke: jest.fn().mockRejectedValue(new Error('Network failure')),
      };

      const result = await triggerDMFConfirmationWebhook(
        42, '{MOCK-GUID}', {} as any, {} as any, false
      );

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Network failure');
    });

    it('persists webhook status to harvest_reports', async () => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: updateMock,
      }));
      (mockSupabase as any).functions = {
        invoke: jest.fn().mockResolvedValue({
          data: { webhooksTriggered: 1, errors: [] },
          error: null,
        }),
      };

      await triggerDMFConfirmationWebhook(
        42, '{MOCK-GUID}', {} as any, {} as any, false
      );

      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          webhook_status: 'sent',
          webhook_attempts: 1,
        })
      );
    });
  });

  // ============================================================
  // submitHarvestReport (mock mode)
  // ============================================================
  describe('submitHarvestReport', () => {
    beforeEach(() => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));
    });

    it('routes to mock submission in test mode', async () => {
      jest.useFakeTimers();
      (mockSupabase as any).functions = {
        invoke: jest.fn().mockResolvedValue({
          data: { webhooksTriggered: 1, errors: [] },
          error: null,
        }),
      };

      const input = makeHarvestInput();
      const promise = submitHarvestReport(input);
      await jest.advanceTimersByTimeAsync(2000);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.confirmationNumber).toBeDefined();
      expect(result.objectId).toBeDefined();
      jest.useRealTimers();
    });
  });

  // ============================================================
  // mockSubmitToDMF
  // ============================================================
  describe('mockSubmitToDMF', () => {
    beforeEach(() => {
      const updateMock = jest.fn().mockReturnValue({
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      });
      (mockSupabase.from as jest.Mock).mockImplementation(() => ({
        update: updateMock,
        eq: jest.fn().mockResolvedValue({ data: null, error: null }),
      }));
    });

    it('returns success with confirmation number', async () => {
      jest.useFakeTimers();
      (mockSupabase as any).functions = {
        invoke: jest.fn().mockResolvedValue({
          data: { webhooksTriggered: 1, errors: [] },
          error: null,
        }),
      };

      const input = makeHarvestInput();
      const promise = mockSubmitToDMF(input, { delayMs: 100 });
      await jest.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result.success).toBe(true);
      expect(result.confirmationNumber).toBeDefined();
      expect(result.objectId).toBeGreaterThan(0);
      jest.useRealTimers();
    });

    it('can simulate failure', async () => {
      jest.useFakeTimers();
      const input = makeHarvestInput();
      const promise = mockSubmitToDMF(input, {
        delayMs: 100,
        simulateFailure: true,
        failureMessage: 'Test failure',
      });
      await jest.advanceTimersByTimeAsync(200);
      const result = await promise;

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test failure');
      expect(result.queued).toBe(true);
      jest.useRealTimers();
    });
  });
});
