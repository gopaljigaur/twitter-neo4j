/**
 * @jest-environment node
 */

import { testApiHandler } from 'next-test-api-route-handler';
import * as appHandler from '../route';
import { getDriver } from '@/lib/neo4j';

jest.mock('@/lib/neo4j');

describe('/api/health', () => {
  let mockSession: any;
  let mockDriver: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
    };

    mockDriver = {
      session: jest.fn(() => mockSession),
    };

    (getDriver as jest.Mock).mockReturnValue(mockDriver);
  });

  it('should return healthy status when database is accessible', async () => {
    mockSession.run
      .mockResolvedValueOnce({}) // RETURN 1
      .mockResolvedValueOnce({
        records: [{ get: () => ({ toNumber: () => 1 }) }],
      }); // embeddings check

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('healthy');
        expect(data.services.api).toBe('up');
        expect(data.services.database).toBe('up');
        expect(data.timestamp).toBeDefined();
        expect(data.responseTime).toBeDefined();
      },
    });
  });

  it('should return unhealthy status when database connection fails', async () => {
    mockSession.run.mockRejectedValue(new Error('Connection refused'));

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' });
        const data = await response.json();

        expect(response.status).toBe(503);
        expect(data.status).toBe('unhealthy');
        expect(data.services.api).toBe('up');
        expect(data.services.database).toBe('down');
        expect(data.error).toBe('Connection refused');
        expect(data.timestamp).toBeDefined();
        expect(data.responseTime).toBeDefined();
      },
    });
  });

  it('should include response time in milliseconds', async () => {
    mockSession.run
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        records: [{ get: () => ({ toNumber: () => 1 }) }],
      });

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' });
        const data = await response.json();

        expect(data.responseTime).toMatch(/^\d+ms$/);
      },
    });
  });

  it('should handle query failures', async () => {
    mockSession.run.mockRejectedValue(new Error('Query failed'));

    await testApiHandler({
      appHandler,
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' });

        expect(response.status).toBe(503);
      },
    });
  });
});
