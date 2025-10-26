'use client';

import { useState, useCallback, useEffect } from 'react';
import { Search, X, User, Hash, MessageSquare } from 'lucide-react';
import {
  SearchFiltersProps,
  UserSearchResult,
  HashtagSearchResult,
  TweetSearchResult,
} from '@/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Slider } from './ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

export default function SearchFilters({
  onFilterChange,
  onUserClick,
  onHashtagClick,
  onTweetClick,
}: SearchFiltersProps) {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchType, setSearchType] = useState<
    'all' | 'user' | 'hashtag' | 'tweet'
  >('all');
  const [minFollowers, setMinFollowers] = useState<number>(0);
  const [maxFollowers, setMaxFollowers] = useState<number>(100000);
  const [minActivity, setMinActivity] = useState<number>(1);
  const [keyword, setKeyword] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);
  const [searchResults, setSearchResults] = useState<
    (UserSearchResult | HashtagSearchResult | TweetSearchResult)[]
  >([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);

  // Read hashtag from URL on mount (only once)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hashtagParam = params.get('hashtag');
      if (hashtagParam) {
        setSearchQuery(hashtagParam);
        setSearchType('hashtag');
        // Auto-apply the filter
        setTimeout(() => {
          onFilterChange({
            minFollowers: 0,
            maxFollowers: 100000,
            minActivity: 1,
            minHashtagFrequency: 1,
            users: [],
            hashtags: [hashtagParam],
            keywords: [],
            limit: 100,
          });
        }, 0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&type=${searchType}`
      );
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, searchType]);

  const handleApplyFilters = () => {
    onFilterChange({
      minFollowers,
      maxFollowers,
      minActivity,
      minHashtagFrequency: 1,
      users: searchType === 'user' && searchQuery.trim() ? [searchQuery.trim()] : [],
      hashtags: searchType === 'hashtag' && searchQuery.trim() ? [searchQuery.trim()] : [],
      keywords: keyword.trim() ? [keyword.trim()] : [],
      limit,
    });
  };

  const isUserResult = (
    result: UserSearchResult | HashtagSearchResult | TweetSearchResult
  ): result is UserSearchResult => {
    return 'screenName' in result;
  };

  const isHashtagResult = (
    result: UserSearchResult | HashtagSearchResult | TweetSearchResult
  ): result is HashtagSearchResult => {
    return 'usage' in result && 'name' in result;
  };

  const isTweetResult = (
    result: UserSearchResult | HashtagSearchResult | TweetSearchResult
  ): result is TweetSearchResult => {
    return 'id' in result && 'text' in result;
  };

  const handleResultClick = (
    result: UserSearchResult | HashtagSearchResult | TweetSearchResult
  ) => {
    if (isUserResult(result) && onUserClick) {
      onUserClick(result.screenName);
      setSearchResults([]); // Clear search results after click
    } else if (isHashtagResult(result) && onHashtagClick) {
      onHashtagClick(result.name);
      setSearchResults([]);
    } else if (isTweetResult(result) && onTweetClick) {
      onTweetClick(result.id, result.text, result.favoriteCount, result.user);
      setSearchResults([]);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Search & Filters</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Search Section */}
        <div className="pb-4 border-b">
          <label className="block text-sm font-semibold mb-3">
            Global Search
          </label>
          <div className="flex gap-2">
            <Select
              value={searchType}
              onValueChange={(value) =>
                setSearchType(value as 'all' | 'user' | 'hashtag' | 'tweet')
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="hashtag">Hashtag</SelectItem>
                <SelectItem value="tweet">Tweet</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e: React.KeyboardEvent) =>
                e.key === 'Enter' && handleSearch()
              }
              placeholder={
                searchType === 'all'
                  ? 'Search everything...'
                  : `Search ${searchType}...`
              }
              className="flex-1"
            />
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              size="default"
            >
              <Search className="w-4 h-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Find specific users, hashtags, or tweets by content
          </p>
        </div>

        {searchResults.length > 0 && (
          <div className="max-h-64 overflow-y-auto rounded-md border">
            <div className="divide-y">
              {searchResults.map((result, idx) => (
                <div
                  key={idx}
                  onClick={() => handleResultClick(result)}
                  className="px-3 py-2.5 hover:bg-muted/50 cursor-pointer text-sm transition-colors"
                >
                  {isUserResult(result) ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-blue-500" />
                        <div>
                          <p className="font-medium">@{result.screenName}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.name}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {result.followers?.toLocaleString()} followers
                      </span>
                    </div>
                  ) : isHashtagResult(result) ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Hash className="w-4 h-4 text-purple-500" />
                        <p className="font-medium">#{result.name}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {result.usage} tweets
                      </span>
                    </div>
                  ) : isTweetResult(result) ? (
                    <div className="flex gap-2">
                      <MessageSquare className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground mb-1">
                          @{result.user}
                        </p>
                        <p className="text-sm line-clamp-2">{result.text}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {result.favoriteCount} favorites
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase tracking-wide">
            Advanced Filters
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Keyword Search in Tweets
              </label>
              <Input
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g., AI, blockchain, startup..."
                className="w-full"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Find users discussing specific topics
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Min Followers:{' '}
                  <span className="font-semibold">
                    {minFollowers.toLocaleString()}
                  </span>
                </label>
                <Slider
                  min={0}
                  max={10000}
                  step={100}
                  value={minFollowers}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMinFollowers(parseInt(e.target.value))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum reach
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Max Followers:{' '}
                  <span className="font-semibold">
                    {maxFollowers.toLocaleString()}
                  </span>
                </label>
                <Slider
                  min={1000}
                  max={100000}
                  step={1000}
                  value={maxFollowers}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMaxFollowers(parseInt(e.target.value))
                  }
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Find emerging voices
                </p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Min Activity:{' '}
                <span className="font-semibold">{minActivity} tweets</span>
              </label>
              <Slider
                min={1}
                max={50}
                step={1}
                value={minActivity}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setMinActivity(parseInt(e.target.value))
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>1</span>
                <span>50</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Consistent contributors
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Results: <span className="font-semibold">{limit} tweets</span>
              </label>
              <Slider
                min={10}
                max={500}
                step={10}
                value={limit}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLimit(parseInt(e.target.value))
                }
              />
              <div className="flex justify-between text-xs text-muted-foreground mt-1">
                <span>10</span>
                <span>500</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleApplyFilters} className="flex-1">
            Apply
          </Button>

          <Button
            onClick={() => {
              setSearchQuery('');
              setMinFollowers(0);
              setMaxFollowers(100000);
              setMinActivity(1);
              setKeyword('');
              setLimit(100);
              setSearchResults([]);
              onFilterChange({
                minFollowers: 0,
                maxFollowers: 100000,
                minActivity: 1,
                minHashtagFrequency: 1,
                users: [],
                hashtags: [],
                keywords: [],
                limit: 100,
              });
            }}
            variant="outline"
          >
            Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
