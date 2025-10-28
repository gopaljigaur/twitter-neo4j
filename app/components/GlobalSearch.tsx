'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  Search,
  User,
  Hash,
  MessageSquare,
  X,
  Loader2,
  Sparkles,
  Code,
  List,
} from 'lucide-react';
import {
  UserSearchResult,
  HashtagSearchResult,
  TweetSearchResult,
} from '@/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from './ui/pagination';

const EXAMPLE_QUERIES = [
  'Find the top 10 users with the most followers',
  'Show me tweets about AI or machine learning',
  'Which users tweet most about Neo4j?',
  'Find the most popular hashtags',
  'Show users who are mentioned together frequently',
  'Find influential users with under 10k followers',
];

interface GlobalSearchProps {
  onUserClick?: (username: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  onTweetClick?: (
    tweetId: string,
    text: string,
    favoriteCount: number,
    user: string
  ) => void;
}

interface AIQueryResult {
  success: boolean;
  query?: string;
  results?: any[];
  resultCount?: number;
  error?: string;
  details?: string;
  generatedQuery?: string;
}

export default function GlobalSearch({
  onUserClick,
  onHashtagClick,
  onTweetClick,
}: GlobalSearchProps) {
  const [searchMode, setSearchMode] = useState<'regular' | 'ai'>('regular');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<'user' | 'hashtag' | 'tweet'>(
    'tweet'
  );
  const [aiAvailable, setAiAvailable] = useState<boolean>(true);
  const [suggestions, setSuggestions] = useState<
    (UserSearchResult | HashtagSearchResult)[]
  >([]);
  const [searchResults, setSearchResults] = useState<
    (UserSearchResult | HashtagSearchResult | TweetSearchResult)[]
  >([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] =
    useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [hasSearched, setHasSearched] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalResults, setTotalResults] = useState<number>(0);
  const [searchError, setSearchError] = useState<string | null>(null);
  const resultsPerPage = 10;

  // AI Query specific state
  const [aiQueryResult, setAIQueryResult] = useState<AIQueryResult | null>(
    null
  );
  const [showCypherQuery, setShowCypherQuery] = useState<boolean>(false);
  const [aiCurrentPage, setAICurrentPage] = useState<number>(1);
  const aiResultsPerPage = 10;

  const debounceTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const skipSuggestionsRef = useRef<boolean>(false);

  // Check AI availability on mount
  useEffect(() => {
    const checkAIStatus = async () => {
      try {
        const response = await fetch('/api/ai-status');
        const data = await response.json();
        setAiAvailable(data.naturalLanguageQuery.available);
      } catch (error) {
        console.error('Failed to check AI status:', error);
        // Assume available on error to not break existing functionality
        setAiAvailable(true);
      }
    };
    checkAIStatus();
  }, []);

  // Fetch autocomplete suggestions
  const fetchSuggestions = useCallback(
    async (query: string) => {
      // Skip if we're switching search types
      if (skipSuggestionsRef.current) {
        skipSuggestionsRef.current = false;
        return;
      }

      // No autocomplete for tweet search (uses semantic search)
      if (searchType === 'tweet') {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      if (query.trim().length < 2) {
        setSuggestions([]);
        setShowSuggestions(false);
        return;
      }

      setIsLoadingSuggestions(true);
      try {
        const response = await fetch(
          `/api/search?q=${encodeURIComponent(query)}&type=${searchType}&mode=suggestions`
        );
        const data = await response.json();
        setSuggestions(data.results || []);
        setShowSuggestions(data.results?.length > 0);
      } catch (error) {
        console.error('Suggestions error:', error);
        setSuggestions([]);
      } finally {
        setIsLoadingSuggestions(false);
      }
    },
    [searchType]
  );

  // Debounced suggestions as user types
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(searchQuery);
    }, 300);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [searchQuery, fetchSuggestions]);

  // Full search with pagination
  const handleSearch = useCallback(
    async (page: number = 1, overrideType?: 'user' | 'hashtag' | 'tweet') => {
      if (!searchQuery.trim()) return;

      setIsSearching(true);
      setHasSearched(true);
      setShowSuggestions(false);
      setSuggestions([]); // Clear suggestions so they don't reappear on focus
      setSearchError(null); // Clear previous errors

      const offset = (page - 1) * resultsPerPage;
      const typeToUse = overrideType || searchType;

      try {
        let response;
        if (typeToUse === 'tweet') {
          // Use semantic search for tweets
          response = await fetch(
            `/api/search/semantic?q=${encodeURIComponent(searchQuery)}&limit=${resultsPerPage * 10}`
          );

          if (!response.ok) {
            const data = await response.json();
            setSearchError(data.error || 'Search failed');
            setSearchResults([]);
            return;
          }

          const data = await response.json();

          // Transform semantic search results to match tweet result format
          const transformedResults = (data.results || [])
            .slice(offset, offset + resultsPerPage)
            .map((result: any) => ({
              id: result.id,
              text: result.text,
              favoriteCount: result.favoriteCount || 0,
              user: result.user || 'Unknown',
              similarity: result.similarity,
            }));
          setSearchResults(transformedResults);
          setTotalResults(data.results?.length || 0);
        } else {
          // Use regular search endpoint for users and hashtags
          response = await fetch(
            `/api/search?q=${encodeURIComponent(searchQuery)}&type=${typeToUse}&mode=full&offset=${offset}&limit=${resultsPerPage}`
          );

          if (!response.ok) {
            const data = await response.json();
            setSearchError(data.error || 'Search failed');
            setSearchResults([]);
            return;
          }

          const data = await response.json();
          setSearchResults(data.results || []);
          setTotalResults(data.total || data.results?.length || 0);
        }
        setCurrentPage(page);
      } catch (error) {
        console.error('Search error:', error);
        setSearchError(error instanceof Error ? error.message : 'Search failed');
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    },
    [searchQuery, searchType]
  );

  // AI Query handler
  const handleAIQuery = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    setAIQueryResult(null);
    setAICurrentPage(1); // Reset pagination on new query

    try {
      const response = await fetch('/api/nl-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery }),
      });

      const data = await response.json();
      setAIQueryResult(data);
    } catch (error: any) {
      setAIQueryResult({
        success: false,
        error: 'Failed to process query',
        details: error.message,
      });
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        searchContainerRef.current &&
        !searchContainerRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isUserResult = (result: any): result is UserSearchResult =>
    'screenName' in result;
  const isHashtagResult = (result: any): result is HashtagSearchResult =>
    'usage' in result && 'name' in result;
  const isTweetResult = (result: any): result is TweetSearchResult =>
    'id' in result && 'text' in result;

  const handleSuggestionClick = (
    result: UserSearchResult | HashtagSearchResult
  ) => {
    if (isUserResult(result) && onUserClick) {
      onUserClick(result.screenName);
    } else if (isHashtagResult(result) && onHashtagClick) {
      onHashtagClick(result.name);
    }
    setShowSuggestions(false);
    setSearchQuery(''); // Clear search after opening modal
  };

  const handleResultClick = (
    result: UserSearchResult | HashtagSearchResult | TweetSearchResult
  ) => {
    if (isUserResult(result) && onUserClick) {
      onUserClick(result.screenName);
    } else if (isHashtagResult(result) && onHashtagClick) {
      onHashtagClick(result.name);
    } else if (isTweetResult(result) && onTweetClick) {
      onTweetClick(result.id, result.text, result.favoriteCount, result.user);
    }
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSuggestions([]);
    setSearchResults([]);
    setShowSuggestions(false);
    setHasSearched(false);
    setCurrentPage(1);
    setTotalResults(0);
    setSearchError(null);
    setAIQueryResult(null);
    setShowCypherQuery(false);
    setAICurrentPage(1);
  };

  const handleModeSwitch = (mode: 'regular' | 'ai') => {
    setSearchMode(mode);
    clearSearch();
  };

  const handleExampleClick = (example: string) => {
    setSearchQuery(example);
    setAIQueryResult(null);
  };

  // Helper function to convert Neo4j Integer objects to regular numbers
  const convertNeo4jInteger = (value: any): any => {
    if (
      value &&
      typeof value === 'object' &&
      'low' in value &&
      'high' in value
    ) {
      // Neo4j Integer object: convert to JavaScript number
      return value.high * 4294967296 + value.low;
    }
    return value;
  };

  // Helper function to detect Neo4j DateTime objects
  const isNeo4jDateTime = (value: any): boolean => {
    return (
      value &&
      typeof value === 'object' &&
      'year' in value &&
      'month' in value &&
      'day' in value
    );
  };

  // Helper function to convert Neo4j DateTime to readable string
  const convertNeo4jDateTime = (value: any): string => {
    if (isNeo4jDateTime(value)) {
      const year = convertNeo4jInteger(value.year);
      const month = String(convertNeo4jInteger(value.month)).padStart(2, '0');
      const day = String(convertNeo4jInteger(value.day)).padStart(2, '0');
      const hour = String(convertNeo4jInteger(value.hour)).padStart(2, '0');
      const minute = String(convertNeo4jInteger(value.minute)).padStart(2, '0');
      const second = String(convertNeo4jInteger(value.second)).padStart(2, '0');
      return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
    }
    return value;
  };

  // Helper function to check if value is a Neo4j node/relationship object
  const isNeo4jNode = (value: any): boolean => {
    return (
      value &&
      typeof value === 'object' &&
      'properties' in value &&
      ('labels' in value || 'type' in value)
    );
  };

  // Helper function to flatten Neo4j node properties
  const flattenNeo4jNode = (value: any): any => {
    if (isNeo4jNode(value)) {
      const props = value.properties || {};
      // Convert all Neo4j special types in properties
      const converted: any = {};
      for (const [key, val] of Object.entries(props)) {
        if (isNeo4jDateTime(val)) {
          converted[key] = convertNeo4jDateTime(val);
        } else {
          converted[key] = convertNeo4jInteger(val);
        }
      }
      return converted;
    }
    return value;
  };

  // Helper function to format column names for display
  const formatColumnName = (columnName: string): string => {
    // Extract the property name (everything after the last dot, or the whole string if no dot)
    const lastDotIndex = columnName.lastIndexOf('.');
    const propertyName =
      lastDotIndex !== -1 ? columnName.substring(lastDotIndex + 1) : columnName;

    // Convert to Title Case and add spaces
    const titleCase = propertyName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    // Return formatted name with original in brackets
    return `${titleCase} (${columnName})`;
  };

  // Helper function to format text with clickable hashtags, mentions, and links
  const formatInteractiveText = (text: string): React.ReactNode => {
    if (!text) return text;

    // Combined regex to match URLs, hashtags, and @mentions
    const pattern = /(https?:\/\/[^\s]+)|#(\w+)|@(\w+)/g;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Capture match values to avoid null issues in closures
      const url = match[1];
      const hashtag = match[2];
      const mention = match[3];
      const matchIndex = match.index;

      // Add interactive element
      if (url) {
        // URL
        parts.push(
          <a
            key={matchIndex}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:text-blue-700 underline"
            onClick={(e) => e.stopPropagation()}
          >
            {url}
          </a>
        );
      } else if (hashtag) {
        // Hashtag
        parts.push(
          <button
            key={matchIndex}
            onClick={(e) => {
              e.stopPropagation();
              onHashtagClick?.(hashtag);
            }}
            className="text-purple-500 hover:text-purple-700 font-medium"
          >
            #{hashtag}
          </button>
        );
      } else if (mention) {
        // @mention
        parts.push(
          <button
            key={matchIndex}
            onClick={(e) => {
              e.stopPropagation();
              onUserClick?.(mention);
            }}
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            @{mention}
          </button>
        );
      }

      lastIndex = pattern.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? <>{parts}</> : text;
  };

  // Helper functions for AI query results
  const detectColumnType = (
    columnName: string
  ): 'user' | 'hashtag' | 'tweet' | 'regular' => {
    const lower = columnName.toLowerCase();

    // Extract property name (after last dot) for pattern matching
    const lastDotIndex = lower.lastIndexOf('.');
    const propertyName =
      lastDotIndex !== -1 ? lower.substring(lastDotIndex + 1) : lower;

    // Check for user-related columns
    if (
      propertyName === 'screen_name' ||
      propertyName === 'username' ||
      propertyName === 'screenname' ||
      propertyName === 'user_name' ||
      propertyName === 'user'
    ) {
      return 'user';
    }

    // Check for hashtag-related columns
    if (lower.includes('hashtag') || propertyName === 'tag') {
      return 'hashtag';
    }

    // Check for hashtag name columns (like h.name, h1.name, hashtag.name)
    if (propertyName === 'name' && lower.includes('h')) {
      return 'hashtag';
    }

    // Check for tweet-related columns
    if (lower.includes('tweet') || propertyName === 'text') {
      return 'tweet';
    }

    return 'regular';
  };

  const handleCellClick = (value: any, columnName: string) => {
    if (!value || typeof value !== 'string') return;

    const columnType = detectColumnType(columnName);
    switch (columnType) {
      case 'user':
        onUserClick?.(value);
        break;
      case 'hashtag':
        const cleanHashtag = value.replace(/^#/, '');
        onHashtagClick?.(cleanHashtag);
        break;
    }
  };

  const totalPages = Math.ceil(totalResults / resultsPerPage);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Mode Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 p-1 bg-muted rounded-lg">
            <button
              onClick={() => handleModeSwitch('regular')}
              className={`px-4 py-2 rounded-md transition-all text-sm font-medium flex items-center ${
                searchMode === 'regular'
                  ? 'bg-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <List className="w-4 h-4 mr-2" />
              Normal
            </button>
            <button
              onClick={() => aiAvailable && handleModeSwitch('ai')}
              disabled={!aiAvailable}
              className={`px-4 py-2 rounded-md transition-all text-sm font-medium flex items-center ${
                searchMode === 'ai'
                  ? 'bg-background shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              } ${!aiAvailable ? 'opacity-50 cursor-not-allowed' : ''}`}
              title={!aiAvailable ? 'AI Query is unavailable' : ''}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              AI Query
              {!aiAvailable && (
                <span className="ml-1 text-xs">(Disabled)</span>
              )}
            </button>
          </div>
        </div>

        {searchMode === 'regular' ? (
          <>
            {/* Regular Search Input */}
            <div className="space-y-3" ref={searchContainerRef}>
              <div className="flex gap-2 items-center">
                <div className="flex-1 relative">
                  <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyUp={(e: React.KeyboardEvent) => {
                      if (e.key === 'Enter') {
                        handleSearch(1);
                        (e.target as HTMLInputElement).blur();
                      }
                    }}
                    onFocus={() =>
                      searchQuery.length >= 2 &&
                      suggestions.length > 0 &&
                      setShowSuggestions(true)
                    }
                    placeholder="Search..."
                    className="pl-10 pr-8"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}

                  {/* Autocomplete Suggestions Dropdown */}
                  {showSuggestions && (
                    <div className="absolute top-full left-0 right-0 mt-2 max-h-80 overflow-y-auto rounded-md border bg-card shadow-lg z-50">
                      <div className="divide-y">
                        {isLoadingSuggestions ? (
                          <div className="px-4 py-3 text-sm text-muted-foreground flex items-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Loading suggestions...
                          </div>
                        ) : suggestions.length > 0 ? (
                          suggestions.map((result, idx) => (
                            <div
                              key={idx}
                              onClick={() => handleSuggestionClick(result)}
                              className="px-4 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              {isUserResult(result) ? (
                                <div className="flex items-center gap-3">
                                  <User className="w-4 h-4 text-blue-500" />
                                  <div className="flex-1">
                                    <p className="text-sm font-medium">
                                      @{result.screenName}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {result.name}
                                    </p>
                                  </div>
                                </div>
                              ) : isHashtagResult(result) ? (
                                <div className="flex items-center gap-3">
                                  <Hash className="w-4 h-4 text-purple-500" />
                                  <p className="text-sm font-medium">
                                    #{result.name}
                                  </p>
                                </div>
                              ) : null}
                            </div>
                          ))
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  onClick={() => handleSearch(1)}
                  disabled={isSearching || !searchQuery.trim()}
                  size="default"
                >
                  {isSearching ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    'Search'
                  )}
                </Button>
              </div>

              {/* Search Type Switcher */}
              <div className="flex items-center gap-1 p-1 bg-muted rounded-lg">
                <button
                  onClick={() => {
                    skipSuggestionsRef.current = true;
                    setSearchType('user');
                    setShowSuggestions(false);
                    setSuggestions([]);
                    setSearchResults([]);
                    if (searchQuery.trim() && hasSearched) {
                      handleSearch(1, 'user');
                    }
                  }}
                  className={`flex-1 px-2 sm:px-4 py-2 rounded-md transition-all text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                    searchType === 'user'
                      ? 'bg-background shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Users</span>
                </button>
                <button
                  onClick={() => {
                    skipSuggestionsRef.current = true;
                    setSearchType('hashtag');
                    setShowSuggestions(false);
                    setSuggestions([]);
                    setSearchResults([]);
                    if (searchQuery.trim() && hasSearched) {
                      handleSearch(1, 'hashtag');
                    }
                  }}
                  className={`flex-1 px-2 sm:px-4 py-2 rounded-md transition-all text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                    searchType === 'hashtag'
                      ? 'bg-background shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <Hash className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Hashtags</span>
                </button>
                <button
                  onClick={() => {
                    skipSuggestionsRef.current = true;
                    setSearchType('tweet');
                    setShowSuggestions(false);
                    setSuggestions([]);
                    setSearchResults([]);
                    if (searchQuery.trim() && hasSearched) {
                      handleSearch(1, 'tweet');
                    }
                  }}
                  className={`flex-1 px-2 sm:px-4 py-2 rounded-md transition-all text-sm font-medium flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                    searchType === 'tweet'
                      ? 'bg-background shadow-xs'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span className="text-xs sm:text-sm">Tweets</span>
                </button>
              </div>

              {/* Info Section - Only for Tweets */}
              {searchType === 'tweet' && (
                <div className="rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <div>
                      <p className="font-medium">
                        Powered by AI Semantic Search
                      </p>
                      <p className="text-muted-foreground text-xs mt-1">
                        Find tweets by meaning, not just exact keywords. Try
                        queries like &ldquo;graph databases&rdquo;,
                        &ldquo;machine learning&rdquo;, or &ldquo;data
                        visualization&rdquo;.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* AI Query Mode */}
            <div className="space-y-3">
              {/* AI Unavailable Message */}
              {!aiAvailable && (
                <Alert>
                  <AlertDescription>
                    AI Query is currently unavailable.
                  </AlertDescription>
                </Alert>
              )}

              {/* Example Queries */}
              {aiAvailable && (
                <div>
                  <p className="text-sm font-medium mb-2">Try these examples:</p>
                  <div className="flex flex-wrap gap-2">
                    {EXAMPLE_QUERIES.map((example, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleExampleClick(example)}
                        className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors"
                      >
                        {example}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Query Input */}
              <Textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Ask a question about the Twitter data... (e.g., 'Show me influential users in the AI community')"
                className="min-h-[100px]"
                disabled={!aiAvailable}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey && aiAvailable) {
                    e.preventDefault();
                    handleAIQuery();
                  }
                }}
              />
              {aiAvailable && (
                <div className="text-xs text-muted-foreground -mt-2 space-y-1">
                  <p>Press Enter to submit, Shift+Enter for new line</p>
                  <p>
                    Note: AI applies a default limit of 100 results. Specify a
                    different number in your query (e.g., &ldquo;top 5&rdquo;,
                    &ldquo;show 500&rdquo;) to override (max 1000).
                  </p>
                </div>
              )}

              <Button
                onClick={handleAIQuery}
                disabled={!aiAvailable || isSearching || !searchQuery.trim()}
                className="w-full"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating Query...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Ask AI
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {/* Results */}
        {hasSearched && searchMode === 'regular' && (
          <div className="space-y-4 pt-4 border-t">
            {/* Error Display */}
            {searchError && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-medium">Error: {searchError}</div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {totalResults > 0 ? (
                  <>
                    Showing {(currentPage - 1) * resultsPerPage + 1}-
                    {Math.min(currentPage * resultsPerPage, totalResults)} of{' '}
                    {totalResults} results
                  </>
                ) : searchResults.length > 0 ? (
                  `${searchResults.length} results`
                ) : (
                  'No results found'
                )}
              </h3>
              <Button onClick={clearSearch} variant="ghost" size="sm">
                Clear Results
              </Button>
            </div>

            {searchResults.length > 0 ? (
              <div className="grid gap-3">
                {searchResults.map((result, idx) => (
                  <div
                    key={idx}
                    onClick={() => handleResultClick(result)}
                    className="p-4 rounded-lg border hover:border-primary/50 hover:bg-muted/30 cursor-pointer transition-all"
                  >
                    {isUserResult(result) ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
                            <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                          </div>
                          <div>
                            <p className="font-medium">@{result.screenName}</p>
                            <p className="text-sm text-muted-foreground">
                              {result.name}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {result.followers?.toLocaleString()} followers
                        </span>
                      </div>
                    ) : isHashtagResult(result) ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center">
                            <Hash className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                          </div>
                          <p className="font-medium text-lg">#{result.name}</p>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {result.usage} tweets
                        </span>
                      </div>
                    ) : isTweetResult(result) ? (
                      <div className="flex gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center shrink-0">
                          <MessageSquare className="w-5 h-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-sm text-muted-foreground">
                              @{result.user}
                            </p>
                            {(result as any).similarity && (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-200">
                                {((result as any).similarity * 100).toFixed(1)}%
                                match
                              </span>
                            )}
                          </div>
                          <p className="text-sm line-clamp-3 mb-2">
                            {result.text}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {result.favoriteCount} favorites
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : isSearching ? null : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No results found for &ldquo;{searchQuery}&rdquo;</p>
                <p className="text-sm mt-1">Try adjusting your search terms</p>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <Pagination className="mt-6">
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() =>
                        currentPage > 1 && handleSearch(currentPage - 1)
                      }
                      className={
                        currentPage === 1
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>

                  {[...Array(totalPages)].map((_, i) => {
                    const page = i + 1;
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => handleSearch(page)}
                            isActive={currentPage === page}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() =>
                        currentPage < totalPages &&
                        handleSearch(currentPage + 1)
                      }
                      className={
                        currentPage === totalPages
                          ? 'pointer-events-none opacity-50'
                          : 'cursor-pointer'
                      }
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            )}
          </div>
        )}

        {/* AI Query Results */}
        {hasSearched && searchMode === 'ai' && aiQueryResult && (
          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {aiQueryResult.success
                  ? `Found ${aiQueryResult.resultCount} result${aiQueryResult.resultCount !== 1 ? 's' : ''}`
                  : 'Query Failed'}
              </h3>
              <Button onClick={clearSearch} variant="ghost" size="sm">
                Clear Results
              </Button>
            </div>

            {/* Error Display */}
            {aiQueryResult.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  <div className="font-medium">{aiQueryResult.error}</div>
                  {aiQueryResult.details && (
                    <div className="text-sm mt-1">{aiQueryResult.details}</div>
                  )}
                  {aiQueryResult.generatedQuery && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">
                        Show generated query
                      </summary>
                      <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
                        {aiQueryResult.generatedQuery}
                      </pre>
                    </details>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Display */}
            {aiQueryResult.success && (
              <>
                {/* Generated Cypher Query */}
                {aiQueryResult.query && (
                  <div>
                    <button
                      onClick={() => setShowCypherQuery(!showCypherQuery)}
                      className="flex items-center gap-2 text-sm font-medium mb-2 hover:text-primary"
                    >
                      <Code className="w-4 h-4" />
                      {showCypherQuery ? 'Hide' : 'Show'} Generated Cypher Query
                    </button>
                    {showCypherQuery && (
                      <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
                        {aiQueryResult.query}
                      </pre>
                    )}
                  </div>
                )}

                {/* Results Display in Card Format */}
                {aiQueryResult.results && aiQueryResult.results.length > 0 ? (
                  <>
                    <div className="grid gap-3">
                      {aiQueryResult.results
                        .slice(
                          (aiCurrentPage - 1) * aiResultsPerPage,
                          aiCurrentPage * aiResultsPerPage
                        )
                        .map((row, idx) => {
                          // Flatten any Neo4j node objects in the row
                          const flattenedRow: any = {};
                          for (const [key, value] of Object.entries(row)) {
                            if (isNeo4jNode(value)) {
                              // If it's a node, extract all its properties
                              const props = flattenNeo4jNode(value);
                              for (const [propKey, propValue] of Object.entries(
                                props
                              )) {
                                // Prefix with original key to avoid conflicts
                                flattenedRow[`${key}.${propKey}`] = propValue;
                              }
                            } else {
                              flattenedRow[key] = value;
                            }
                          }

                          return (
                            <div
                              key={idx}
                              className="p-4 rounded-lg border hover:border-primary/50 transition-all"
                            >
                              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {Object.entries(flattenedRow).map(
                                  ([key, value], cellIdx) => {
                                    const columnType = detectColumnType(key);
                                    const isClickable =
                                      columnType === 'user' ||
                                      columnType === 'hashtag';

                                    // Convert Neo4j special types to regular values
                                    let convertedValue: unknown;
                                    if (isNeo4jDateTime(value)) {
                                      convertedValue =
                                        convertNeo4jDateTime(value);
                                    } else {
                                      convertedValue =
                                        convertNeo4jInteger(value);
                                    }

                                    // Format display value with appropriate prefix
                                    let displayValue =
                                      convertedValue === null ||
                                      convertedValue === undefined
                                        ? null
                                        : typeof convertedValue === 'object'
                                          ? JSON.stringify(convertedValue)
                                          : String(convertedValue);

                                    if (
                                      displayValue &&
                                      columnType === 'user' &&
                                      !displayValue.startsWith('@')
                                    ) {
                                      displayValue = '@' + displayValue;
                                    } else if (
                                      displayValue &&
                                      columnType === 'hashtag' &&
                                      !displayValue.startsWith('#')
                                    ) {
                                      displayValue = '#' + displayValue;
                                    }

                                    // Check if this field likely contains text content (tweets, descriptions, etc.)
                                    const isTextField =
                                      key.toLowerCase().includes('text') ||
                                      key
                                        .toLowerCase()
                                        .includes('description') ||
                                      key.toLowerCase().includes('bio') ||
                                      key.toLowerCase().includes('content');

                                    return (
                                      <div
                                        key={cellIdx}
                                        className="flex flex-col"
                                      >
                                        <span className="text-xs text-muted-foreground mb-1 font-medium">
                                          {formatColumnName(key)}
                                        </span>
                                        {convertedValue === null ||
                                        convertedValue === undefined ? (
                                          <span className="text-sm text-muted-foreground italic">
                                            null
                                          </span>
                                        ) : isClickable ? (
                                          <button
                                            onClick={() =>
                                              handleCellClick(value, key)
                                            }
                                            className="text-sm text-blue-500 hover:text-blue-700 hover:underline font-medium text-left"
                                          >
                                            {displayValue}
                                          </button>
                                        ) : isTextField ? (
                                          <span className="text-sm wrap-break-word">
                                            {formatInteractiveText(
                                              displayValue || ''
                                            )}
                                          </span>
                                        ) : (
                                          <span className="text-sm wrap-break-word">
                                            {displayValue}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          );
                        })}
                    </div>

                    {/* AI Results Pagination */}
                    {aiQueryResult.results && aiQueryResult.results.length > aiResultsPerPage && (
                      <Pagination className="mt-6">
                        <PaginationContent>
                          <PaginationItem>
                            <PaginationPrevious
                              onClick={() =>
                                aiCurrentPage > 1 &&
                                setAICurrentPage(aiCurrentPage - 1)
                              }
                              className={
                                aiCurrentPage === 1
                                  ? 'pointer-events-none opacity-50'
                                  : 'cursor-pointer'
                              }
                            />
                          </PaginationItem>

                          {[
                            ...Array(
                              Math.ceil(
                                (aiQueryResult.results?.length || 0) / aiResultsPerPage
                              )
                            ),
                          ].map((_, i) => {
                            const page = i + 1;
                            const totalPages = Math.ceil(
                              (aiQueryResult.results?.length || 0) / aiResultsPerPage
                            );
                            // Show first page, last page, current page, and pages around current
                            if (
                              page === 1 ||
                              page === totalPages ||
                              (page >= aiCurrentPage - 1 &&
                                page <= aiCurrentPage + 1)
                            ) {
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    onClick={() => setAICurrentPage(page)}
                                    isActive={aiCurrentPage === page}
                                    className="cursor-pointer"
                                  >
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            } else if (
                              page === aiCurrentPage - 2 ||
                              page === aiCurrentPage + 2
                            ) {
                              return (
                                <PaginationItem key={page}>
                                  <PaginationEllipsis />
                                </PaginationItem>
                              );
                            }
                            return null;
                          })}

                          <PaginationItem>
                            <PaginationNext
                              onClick={() => {
                                const totalPages = Math.ceil(
                                  (aiQueryResult.results?.length || 0) /
                                    aiResultsPerPage
                                );
                                if (aiCurrentPage < totalPages)
                                  setAICurrentPage(aiCurrentPage + 1);
                              }}
                              className={
                                aiCurrentPage ===
                                Math.ceil(
                                  (aiQueryResult.results?.length || 0) /
                                    aiResultsPerPage
                                )
                                  ? 'pointer-events-none opacity-50'
                                  : 'cursor-pointer'
                              }
                            />
                          </PaginationItem>
                        </PaginationContent>
                      </Pagination>
                    )}
                  </>
                ) : aiQueryResult.results &&
                  aiQueryResult.results.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No results found for this query
                  </div>
                ) : null}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
