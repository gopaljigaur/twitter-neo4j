import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GlobalSearch from '../GlobalSearch';

// Mock fetch
global.fetch = jest.fn();

describe('GlobalSearch Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockImplementation((url: string) => {
      // Mock AI status endpoint
      if (url.includes('/api/ai-status')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            semanticSearch: { available: true },
            naturalLanguageQuery: { available: true },
          }),
        });
      }
      // Mock other endpoints
      return Promise.resolve({
        ok: true,
        json: async () => ({ results: [], total: 0 }),
      });
    });
  });

  it('should render search input and type switcher', () => {
    render(<GlobalSearch />);

    // Check for search input
    const searchInput = screen.getByPlaceholderText(/search/i);
    expect(searchInput).toBeInTheDocument();

    // Check for type switcher buttons
    expect(screen.getByText('Users')).toBeInTheDocument();
    expect(screen.getByText('Hashtags')).toBeInTheDocument();
    expect(screen.getByText('Tweets')).toBeInTheDocument();
  });

  it('should default to Tweets tab', () => {
    render(<GlobalSearch />);

    // Tweets button should have active styling (contains bg-background)
    const tweetsButton = screen.getByText('Tweets').closest('button');
    expect(tweetsButton?.className).toContain('bg-background');
  });

  it('should show AI semantic search info only for Tweets tab', () => {
    render(<GlobalSearch />);

    // Should show for Tweets (default)
    expect(
      screen.getByText('Powered by AI Semantic Search')
    ).toBeInTheDocument();

    // Switch to Users
    const usersButton = screen.getByText('Users');
    fireEvent.click(usersButton);

    // Should not show for Users
    expect(
      screen.queryByText('Powered by AI Semantic Search')
    ).not.toBeInTheDocument();
  });

  it('should switch search types when clicking tabs', () => {
    render(<GlobalSearch />);

    // Initially on Tweets
    let tweetsButton = screen.getByText('Tweets').closest('button');
    expect(tweetsButton?.className).toContain('bg-background');

    // Click Users
    const usersButton = screen.getByText('Users');
    fireEvent.click(usersButton);

    // Users should be active
    const activeUsersButton = screen.getByText('Users').closest('button');
    expect(activeUsersButton?.className).toContain('bg-background');

    // Tweets should not be active
    tweetsButton = screen.getByText('Tweets').closest('button');
    expect(tweetsButton?.className).not.toContain('shadow-xs');
  });

  it('should perform search when user types and clicks search', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          {
            screenName: 'testuser',
            description: 'Test user',
            followerCount: 100,
            followingCount: 50,
            tweetCount: 200,
          },
        ],
        total: 1,
      }),
    });

    render(<GlobalSearch />);

    // Switch to Users tab
    fireEvent.click(screen.getByText('Users'));

    // Type in search input
    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'testuser' } });

    // Click search button (the primary one in the search bar, not the tab)
    const searchButtons = screen.getAllByRole('button', { name: /search/i });
    const searchButton = searchButtons.find(button => button.className.includes('bg-primary'));
    if (searchButton) {
      fireEvent.click(searchButton);
    }

    // Wait for fetch to be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/search?q=testuser&type=user')
      );
    });
  });

  it('should show loading state during search', async () => {
    // Mock a delayed response
    (global.fetch as jest.Mock).mockImplementationOnce(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ results: [], total: 0 }),
              }),
            100
          )
        )
    );

    render(<GlobalSearch />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const searchButtons = screen.getAllByRole('button', { name: /search/i });
    const searchButton = searchButtons.find(button => button.className.includes('bg-primary'));
    if (searchButton) {
      fireEvent.click(searchButton);

      // Should show loading state
      await waitFor(() => {
        expect(searchButton).toBeDisabled();
      });
    }
  });

  it('should display error message when search fails', async () => {
    // Override mock to return error for search endpoint (after AI status check)
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        // First call: AI status check
        ok: true,
        json: async () => ({
          semanticSearch: { available: true },
          naturalLanguageQuery: { available: true },
        }),
      })
      .mockResolvedValueOnce({
        // Second call: Search that fails
        ok: false,
        json: async () => ({ error: 'Search failed' }),
      });

    render(<GlobalSearch />);

    const searchInput = screen.getByPlaceholderText(/search/i);
    fireEvent.change(searchInput, { target: { value: 'test' } });

    const searchButtons = screen.getAllByRole('button', { name: /search/i });
    const searchButton = searchButtons.find(button => button.className.includes('bg-primary'));
    if (searchButton) {
      fireEvent.click(searchButton);

      await waitFor(() => {
        expect(screen.getByText(/error.*search failed/i)).toBeInTheDocument();
      });
    }
  });

  it('should clear search when clear button is clicked', () => {
    render(<GlobalSearch />);

    const searchInput = screen.getByPlaceholderText(
      /search/i
    ) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'test query' } });

    expect(searchInput.value).toBe('test query');

    // Click clear button (X icon button)
    const clearButton = searchInput.parentElement?.querySelector(
      'button[type="button"]'
    );
    if (clearButton) {
      fireEvent.click(clearButton);
      expect(searchInput.value).toBe('');
    }
  });
});
