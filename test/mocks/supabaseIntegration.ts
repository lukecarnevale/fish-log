import { mockSupabase } from './supabase';

/**
 * Configure mockSupabase to simulate a full integration flow.
 * Call in beforeEach() for integration test files.
 */
export function setupIntegrationMocks() {
  // Species endpoint
  (mockSupabase.from as jest.Mock).mockImplementation((table: string) => {
    const chain = {
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      single: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
    };

    if (table === 'fish_species') {
      chain.select = jest.fn().mockResolvedValue({
        data: [
          { id: 1, common_name: 'Red Drum', scientific_name: 'Sciaenops ocellatus' },
          { id: 2, common_name: 'Flounder', scientific_name: 'Paralichthys dentatus' },
        ],
        error: null,
      });
    }

    return chain;
  });

  // RPC mock
  (mockSupabase as any).rpc = jest.fn().mockImplementation((fn: string, params: any) => {
    if (fn === 'create_report_atomic' || fn === 'create_report_anonymous') {
      return Promise.resolve({ data: { id: 'mock-uuid', ...params }, error: null });
    }
    return Promise.resolve({ data: null, error: null });
  });
}
