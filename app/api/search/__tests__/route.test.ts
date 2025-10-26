import { POST } from '../route';
import { getDriver } from '@/lib/neo4j';
import { pipeline } from '@xenova/transformers';

// Mock dependencies
jest.mock('@/lib/neo4j');
jest.mock('@xenova/transformers');

describe('/api/search', () => {
  let mockSession: any;
  let mockDriver: any;
  let mockExtractor: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockSession = {
      run: jest.fn(),
      close: jest.fn(),
    };

    mockDriver = {
      session: jest.fn(() => mockSession),
    };

    mockExtractor = jest.fn();

    (getDriver as jest.Mock).mockReturnValue(mockDriver);
    (pipeline as jest.Mock).mockResolvedValue(mockExtractor);
  });

  describe('User Search', () => {
    it('should search for users and return results', async () => {
      const mockUsers = [
        {
          user: {
            properties: { screenName: 'john_doe', description: 'Developer' },
          },
          followerCount: { low: 100 },
          followingCount: { low: 50 },
          tweetCount: { low: 200 },
        },
      ];

      mockSession.run.mockResolvedValue({ records: mockUsers });

      const request = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'john', type: 'user', page: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should handle empty user search results', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      const request = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'nonexistent', type: 'user', page: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toEqual([]);
      expect(data.total).toBe(0);
    });
  });

  describe('Hashtag Search', () => {
    it('should search for hashtags and return results', async () => {
      const mockHashtags = [
        {
          hashtag: { properties: { text: 'javascript' } },
          tweetCount: { low: 150 },
        },
      ];

      mockSession.run.mockResolvedValue({ records: mockHashtags });

      const request = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'javascript', type: 'hashtag', page: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('Semantic Tweet Search', () => {
    it('should perform semantic search on tweets using embeddings', async () => {
      const mockEmbedding = Array(384).fill(0.1);
      mockExtractor.mockResolvedValue({
        data: mockEmbedding,
      });

      const mockTweets = [
        {
          tweet: { properties: { text: 'Learning Neo4j today' } },
          user: { properties: { screenName: 'learner' } },
          favoriteCount: { low: 10 },
          similarity: 0.95,
        },
      ];

      mockSession.run.mockResolvedValue({ records: mockTweets });

      const request = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({
          query: 'neo4j database',
          type: 'tweet',
          page: 1,
        }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toBeDefined();
      expect(pipeline).toHaveBeenCalledWith(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2'
      );
      expect(mockExtractor).toHaveBeenCalledWith('neo4j database', {
        pooling: 'mean',
        normalize: true,
      });
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should return empty results if no similar tweets found', async () => {
      const mockEmbedding = Array(384).fill(0.1);
      mockExtractor.mockResolvedValue({
        data: mockEmbedding,
      });

      mockSession.run.mockResolvedValue({ records: [] });

      const request = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'random query', type: 'tweet', page: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.results).toEqual([]);
      expect(data.total).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing query parameter', async () => {
      const request = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({ type: 'user', page: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
    });

    it('should handle database errors gracefully', async () => {
      mockSession.run.mockRejectedValue(new Error('Database error'));

      const request = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'test', type: 'user', page: 1 }),
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.error).toBeDefined();
      expect(mockSession.close).toHaveBeenCalled();
    });

    it('should close session even if search fails', async () => {
      mockSession.run.mockRejectedValue(new Error('Query failed'));

      const request = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'test', type: 'user', page: 1 }),
      });

      await POST(request);

      expect(mockSession.close).toHaveBeenCalled();
    });
  });

  describe('Pagination', () => {
    it('should respect pagination parameters', async () => {
      mockSession.run.mockResolvedValue({ records: [] });

      const request = new Request('http://localhost:3000/api/search', {
        method: 'POST',
        body: JSON.stringify({ query: 'test', type: 'user', page: 2 }),
      });

      const response = await POST(request);

      expect(response.status).toBe(200);
      expect(mockSession.run).toHaveBeenCalled();

      // Check that SKIP was calculated correctly (page 2 = SKIP 10)
      const query = mockSession.run.mock.calls[0][0];
      expect(query).toContain('SKIP');
    });
  });
});
