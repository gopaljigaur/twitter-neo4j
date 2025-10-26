'use client';

import { useState, useEffect } from 'react';
import { Filters } from '@/types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Slider } from './ui/slider';
import { X, HelpCircle } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

interface GraphFiltersProps {
  onFilterChange: (filters: Filters) => void;
  currentFilters?: Filters;
}

export default function GraphFilters({
  onFilterChange,
  currentFilters,
}: GraphFiltersProps) {
  const [minFollowers, setMinFollowers] = useState<number>(0);
  const [maxFollowers, setMaxFollowers] = useState<number>(100000);
  const [minActivity, setMinActivity] = useState<number>(1);
  const [minHashtagFrequency, setMinHashtagFrequency] = useState<number>(1);
  const [users, setUsers] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [userInput, setUserInput] = useState<string>('');
  const [hashtagInput, setHashtagInput] = useState<string>('');
  const [keywordInput, setKeywordInput] = useState<string>('');
  const [limit, setLimit] = useState<number>(100);

  // Sync local state with parent filters when they change externally
  useEffect(() => {
    if (currentFilters) {
      setMinFollowers(currentFilters.minFollowers);
      setMaxFollowers(currentFilters.maxFollowers);
      setMinActivity(currentFilters.minActivity);
      setMinHashtagFrequency(currentFilters.minHashtagFrequency);
      setUsers(currentFilters.users);
      setHashtags(currentFilters.hashtags);
      setKeywords(currentFilters.keywords);
      setLimit(currentFilters.limit);
    }
  }, [currentFilters]);

  // Read hashtag from URL on mount (only once)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const hashtagParam = params.get('hashtag');
      if (hashtagParam) {
        setHashtags([hashtagParam]);
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

  const handleApplyFilters = () => {
    onFilterChange({
      minFollowers,
      maxFollowers,
      minActivity,
      minHashtagFrequency,
      users,
      hashtags,
      keywords,
      limit,
    });
  };

  const addUser = () => {
    const trimmed = userInput.trim().replace(/^@/, ''); // Remove @ if user typed it
    if (trimmed && !users.includes(trimmed)) {
      setUsers([...users, trimmed]);
      setUserInput('');
    }
  };

  const removeUser = (user: string) => {
    setUsers(users.filter(u => u !== user));
  };

  const addHashtag = () => {
    const trimmed = hashtagInput.trim().replace(/^#/, ''); // Remove # if user typed it
    if (trimmed && !hashtags.includes(trimmed)) {
      setHashtags([...hashtags, trimmed]);
      setHashtagInput('');
    }
  };

  const removeHashtag = (hashtag: string) => {
    setHashtags(hashtags.filter(h => h !== hashtag));
  };

  const addKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  return (
    <TooltipProvider delayDuration={0}>
      <Card className="h-full flex flex-col">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 flex-1">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="text-sm font-medium">Users</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Show tweets from or mentioning these users</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addUser();
                  }
                }}
                placeholder="e.g., neo4j"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addUser}
                variant="outline"
                size="sm"
              >
                Add
              </Button>
            </div>
            {users.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {users.map((user, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-green-100 dark:bg-green-900 pl-2.5 pr-1.5 py-0.5 text-xs font-medium text-green-800 dark:text-green-200"
                  >
                    @{user}
                    <button
                      onClick={() => removeUser(user)}
                      className="hover:bg-green-200 dark:hover:bg-green-800 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="text-sm font-medium">Hashtags</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Show tweets with these hashtags</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={hashtagInput}
                onChange={(e) => setHashtagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addHashtag();
                  }
                }}
                placeholder="e.g., graphdb"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addHashtag}
                variant="outline"
                size="sm"
              >
                Add
              </Button>
            </div>
            {hashtags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {hashtags.map((hashtag, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-purple-100 dark:bg-purple-900 pl-2.5 pr-1.5 py-0.5 text-xs font-medium text-purple-800 dark:text-purple-200"
                  >
                    #{hashtag}
                    <button
                      onClick={() => removeHashtag(hashtag)}
                      className="hover:bg-purple-200 dark:hover:bg-purple-800 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <label className="text-sm font-medium">Keywords</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Search tweet text for these words</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex gap-2">
              <Input
                type="text"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addKeyword();
                  }
                }}
                placeholder="e.g., database"
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addKeyword}
                variant="outline"
                size="sm"
              >
                Add
              </Button>
            </div>
            {keywords.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {keywords.map((keyword, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900 pl-2.5 pr-1.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200"
                  >
                    {keyword}
                    <button
                      onClick={() => removeKeyword(keyword)}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium">Min Followers</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter users by minimum follower count for minimum reach</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
              {minFollowers.toLocaleString()}
            </span>
          </div>
          <Slider
            min={0}
            max={10000}
            step={100}
            value={minFollowers}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMinFollowers(parseInt(e.target.value))
            }
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium">Max Followers</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Filter users by maximum follower count to find emerging voices</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
              {maxFollowers.toLocaleString()}
            </span>
          </div>
          <Slider
            min={1000}
            max={100000}
            step={1000}
            value={maxFollowers}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMaxFollowers(parseInt(e.target.value))
            }
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium">Min Activity</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Minimum number of tweets per user to find consistent contributors</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
              {minActivity} tweets
            </span>
          </div>
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
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium">Min Hashtag Frequency</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Hide hashtags from the graph that are used less than this many times. Higher values show only the most popular hashtags.</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
              {minHashtagFrequency} uses
            </span>
          </div>
          <Slider
            min={1}
            max={20}
            step={1}
            value={minHashtagFrequency}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setMinHashtagFrequency(parseInt(e.target.value))
            }
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1</span>
            <span>20</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <label className="text-sm font-medium">Results</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="w-3 h-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Maximum number of tweets to display</p>
                </TooltipContent>
              </Tooltip>
            </div>
            <span className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
              {limit} tweets
            </span>
          </div>
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

        <div className="flex gap-2 pt-2">
          <Button onClick={handleApplyFilters} className="flex-1">
            Apply Filters
          </Button>

          <Button
            onClick={() => {
              setUsers([]);
              setHashtags([]);
              setKeywords([]);
              setMinFollowers(0);
              setMaxFollowers(100000);
              setMinActivity(1);
              setMinHashtagFrequency(1);
              setLimit(100);
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
    </TooltipProvider>
  );
}
