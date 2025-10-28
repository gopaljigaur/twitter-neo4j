/**
 * @jest-environment node
 */

import { testApiHandler } from 'next-test-api-route-handler';
import * as appHandler from '../route';
import { read } from '@/lib/neo4j';
import { pipeline } from '@xenova/transformers';

jest.mock('@/lib/neo4j');
jest.mock('@xenova/transformers', () => ({
  pipeline: jest.fn(),
}));

describe('/api/search', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (pipeline as jest.Mock).mockResolvedValue(jest.fn());
  });

  it('should search for users and return results', async () => {
    (read as jest.Mock).mockResolvedValue([
      { screenName: 'john_doe', name: 'John Doe', followers: { low: 100 } },
    ]);

    await testApiHandler({
      appHandler,
      url: '/api/search?q=john&type=user&mode=suggestions',
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results).toBeDefined();
        expect(data.results.length).toBeGreaterThan(0);
      },
    });
  });

  it('should handle empty user search results', async () => {
    (read as jest.Mock).mockResolvedValue([]);

    await testApiHandler({
      appHandler,
      url: '/api/search?q=nonexistent&type=user&mode=suggestions',
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results).toEqual([]);
      },
    });
  });

  it('should search for hashtags and return results', async () => {
    (read as jest.Mock).mockResolvedValue([{ name: 'javascript', usage: { low: 150 } }]);

    await testApiHandler({
      appHandler,
      url: '/api/search?q=javascript&type=hashtag&mode=suggestions',
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results).toBeDefined();
        expect(data.results.length).toBeGreaterThan(0);
      },
    });
  });

  it('should perform search on tweets', async () => {
    (read as jest.Mock)
      .mockResolvedValueOnce([{ total: { low: 1 } }])
      .mockResolvedValueOnce([
        { id: '123', text: 'Learning Neo4j today', favoriteCount: { low: 10 }, user: 'learner' },
      ]);

    await testApiHandler({
      appHandler,
      url: '/api/search?q=neo4j%20database&type=tweet&mode=full',
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results).toBeDefined();
        expect(data.results.length).toBeGreaterThan(0);
      },
    });
  });

  it('should return empty results if no tweets found', async () => {
    (read as jest.Mock)
      .mockResolvedValueOnce([{ total: { low: 0 } }])
      .mockResolvedValueOnce([]);

    await testApiHandler({
      appHandler,
      url: '/api/search?q=random%20query&type=tweet&mode=full',
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results).toEqual([]);
      },
    });
  });

  it('should handle missing query parameter', async () => {
    await testApiHandler({
      appHandler,
      url: '/api/search?type=user',
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' });
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.results).toEqual([]);
      },
    });
  });

  it('should handle database errors gracefully', async () => {
    (read as jest.Mock).mockRejectedValue(new Error('Database error'));

    await testApiHandler({
      appHandler,
      url: '/api/search?q=test&type=user&mode=suggestions',
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' });
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBeDefined();
      },
    });
  });

  it('should respect pagination parameters', async () => {
    (read as jest.Mock).mockResolvedValue([]);

    await testApiHandler({
      appHandler,
      url: '/api/search?q=test&type=user&offset=20&limit=10&mode=suggestions',
      test: async ({ fetch }) => {
        const response = await fetch({ method: 'GET' });

        expect(response.status).toBe(200);
        expect(read).toHaveBeenCalled();
      },
    });
  });
});
