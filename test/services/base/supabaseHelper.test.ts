/**
 * supabaseHelper.test.ts - Supabase query helper utilities
 */
import { withConnection, handleSupabaseError } from '../../../src/services/base/supabaseHelper';

describe('supabaseHelper', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // withConnection
  // ============================================================
  describe('withConnection', () => {
    it('returns data on successful operation', async () => {
      const operation = jest.fn().mockResolvedValue({ data: ['item1', 'item2'], error: null });
      const result = await withConnection(operation, 'test', []);
      expect(result).toEqual(['item1', 'item2']);
    });

    it('returns fallback when data is null and no error', async () => {
      const operation = jest.fn().mockResolvedValue({ data: null, error: null });
      const result = await withConnection(operation, 'test', 'default');
      expect(result).toBe('default');
    });

    it('returns fallback when operation returns an error', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const operation = jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Query failed' },
      });

      const result = await withConnection(operation, 'testContext', []);
      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith('[testContext]', { message: 'Query failed' });
      consoleSpy.mockRestore();
    });

    it('returns fallback when operation throws an exception', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const operation = jest.fn().mockRejectedValue(new Error('Network failure'));

      const result = await withConnection(operation, 'netTest', null);
      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith('[netTest]', expect.any(Error));
      consoleSpy.mockRestore();
    });

    it('returns data when data is a falsy but valid value (0)', async () => {
      const operation = jest.fn().mockResolvedValue({ data: 0, error: null });
      const result = await withConnection(operation, 'test', 99);
      expect(result).toBe(0);
    });

    it('returns fallback for null data with a complex fallback object', async () => {
      const fallback = { items: [], total: 0 };
      const operation = jest.fn().mockResolvedValue({ data: null, error: null });
      const result = await withConnection(operation, 'test', fallback);
      expect(result).toBe(fallback);
    });
  });

  // ============================================================
  // handleSupabaseError
  // ============================================================
  describe('handleSupabaseError', () => {
    it('logs error with message property', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      handleSupabaseError({ message: 'Something went wrong' }, 'fetchData');
      expect(consoleSpy).toHaveBeenCalledWith(
        '[Supabase Error - fetchData]:',
        'Something went wrong'
      );
      consoleSpy.mockRestore();
    });

    it('logs error object when no message property', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const errorObj = { code: 'PGRST116' };
      handleSupabaseError(errorObj, 'lookup');
      expect(consoleSpy).toHaveBeenCalledWith('[Supabase Error - lookup]:', errorObj);
      consoleSpy.mockRestore();
    });

    it('handles null error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      handleSupabaseError(null, 'nullCase');
      expect(consoleSpy).toHaveBeenCalledWith('[Supabase Error - nullCase]:', null);
      consoleSpy.mockRestore();
    });

    it('handles undefined error', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      handleSupabaseError(undefined, 'undefinedCase');
      expect(consoleSpy).toHaveBeenCalledWith('[Supabase Error - undefinedCase]:', undefined);
      consoleSpy.mockRestore();
    });
  });
});
