import { GET } from '../route';
import { getDriver } from '@/lib/neo4j';

// Mock the neo4j driver
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
    // Mock successful database query
    mockSession.run.mockResolvedValue({});

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.status).toBe('healthy');
    expect(data.services.api).toBe('up');
    expect(data.services.database).toBe('up');
    expect(data.timestamp).toBeDefined();
    expect(data.responseTime).toBeDefined();
    expect(mockSession.run).toHaveBeenCalledWith('RETURN 1 as health');
    expect(mockSession.close).toHaveBeenCalled();
  });

  it('should return unhealthy status when database connection fails', async () => {
    // Mock database connection failure
    const error = new Error('Connection refused');
    mockSession.run.mockRejectedValue(error);

    const response = await GET();
    const data = await response.json();

    expect(response.status).toBe(503);
    expect(data.status).toBe('unhealthy');
    expect(data.services.api).toBe('up');
    expect(data.services.database).toBe('down');
    expect(data.error).toBe('Connection refused');
    expect(data.timestamp).toBeDefined();
    expect(data.responseTime).toBeDefined();
    expect(mockSession.close).toHaveBeenCalled();
  });

  it('should include response time in milliseconds', async () => {
    mockSession.run.mockResolvedValue({});

    const response = await GET();
    const data = await response.json();

    expect(data.responseTime).toMatch(/^\d+ms$/);
  });

  it('should close session even if query fails', async () => {
    mockSession.run.mockRejectedValue(new Error('Query failed'));

    await GET();

    expect(mockSession.close).toHaveBeenCalled();
  });
});
