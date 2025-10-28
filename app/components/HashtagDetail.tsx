'use client';

import { useEffect, useState } from 'react';
import {
  X,
  Hash,
  MessageSquare,
  Eye,
  Highlighter,
  Heart,
  User as UserIcon,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import { HashtagDetailProps, Hashtag } from '@/types';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import TweetCard from './TweetCard';

export default function HashtagDetail({
  hashtagName,
  onClose,
  onBack,
  showBack,
  onUserClick,
  onHashtagClick,
  onTweetClick,
  onViewInGraph,
  onHighlight,
}: HashtagDetailProps) {
  const [hashtag, setHashtag] = useState<Hashtag | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [visibleTweets, setVisibleTweets] = useState<number>(5);

  const formatDate = (dateObj: any): string => {
    if (!dateObj) return '';
    try {
      // Handle Neo4j DateTime object format
      if (typeof dateObj === 'object' && dateObj.year) {
        const date = new Date(
          dateObj.year,
          dateObj.month - 1, // JS months are 0-indexed
          dateObj.day,
          dateObj.hour || 0,
          dateObj.minute || 0,
          dateObj.second || 0
        );
        return date.toLocaleDateString();
      }
      // Handle string format as fallback
      if (typeof dateObj === 'string') {
        const date = new Date(dateObj);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString();
        }
      }
      return '';
    } catch {
      return '';
    }
  };

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  useEffect(() => {
    if (!hashtagName) return;

    const fetchHashtag = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/hashtag/${hashtagName}`);

        if (!response.ok) {
          throw new Error('Hashtag not found');
        }

        const data: Hashtag = await response.json();
        setHashtag(data);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchHashtag();
  }, [hashtagName]);

  if (!hashtagName) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[51]">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto border animate-fadeIn" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {showBack && onBack && (
              <Button onClick={onBack} variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <h2 className="text-lg font-semibold">Hashtag Details</h2>
          </div>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mb-4"></div>
              <p className="text-sm text-muted-foreground">Loading...</p>
            </div>
          )}

          {error && (
            <div className="border-destructive border rounded-md p-4">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {hashtag && !loading && (
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <Hash className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-2xl font-semibold">#{hashtag.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Trending hashtag
                    </p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 flex-shrink-0">
                  <Button
                    onClick={onViewInGraph}
                    variant="outline"
                    size="sm"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Network
                  </Button>
                  <Button
                    onClick={onHighlight}
                    variant="outline"
                    size="sm"
                  >
                    <Highlighter className="w-4 h-4 mr-1" />
                    Focus
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border p-4 text-center">
                  <p className="text-lg sm:text-2xl font-bold">
                    {hashtag.totalTweets.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Total Tweets
                  </p>
                </div>
                <div className="rounded-md border p-4 text-center">
                  <p className="text-lg sm:text-2xl font-bold">
                    {hashtag.totalUsers.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Unique Users
                  </p>
                </div>
              </div>

              {hashtag.relatedHashtags &&
                hashtag.relatedHashtags.length > 0 &&
                hashtag.relatedHashtags[0].name && (
                  <div>
                    <h4 className="font-semibold mb-2 text-sm">
                      Related Hashtags
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {hashtag.relatedHashtags
                        .filter((h) => h.name)
                        .map((related, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="cursor-pointer hover:bg-muted transition-colors"
                            onClick={() => onHashtagClick?.(related.name)}
                          >
                            #{related.name} ({related.count})
                          </Badge>
                        ))}
                    </div>
                  </div>
                )}

              <div>
                <h4 className="font-semibold mb-2 text-sm">
                  Recent Tweets
                </h4>
                {hashtag.recentTweets &&
                hashtag.recentTweets.length > 0 &&
                hashtag.recentTweets[0].text ? (
                  <>
                    <div className="space-y-3">
                      {hashtag.recentTweets
                        .filter((t) => t.text)
                        .slice(0, visibleTweets)
                        .map((tweet, idx) => (
                          <div
                            key={idx}
                            className="border rounded-md p-4 text-sm cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              onTweetClick?.({
                                id: tweet.id,
                                text: tweet.text,
                                favoriteCount: tweet.favoriteCount,
                                createdAt: tweet.createdAt,
                                name: tweet.userName || tweet.user,
                                screenName: tweet.user,
                              });
                            }}
                          >
                            {/* User info header */}
                            <div className="flex items-center gap-2 mb-2">
                              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                                <UserIcon className="w-5 h-5 text-muted-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <p className="font-semibold text-sm truncate">
                                    {tweet.userName || tweet.user}
                                  </p>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onUserClick?.(tweet.user);
                                    }}
                                    className="text-xs text-blue-500 hover:text-blue-600 truncate hover:underline"
                                  >
                                    @{tweet.user}
                                  </button>
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // Handle Neo4j Integer or regular string/number
                                  let tweetIdStr: string;
                                  if (tweet.id && typeof tweet.id === 'object' && 'toNumber' in tweet.id) {
                                    tweetIdStr = (tweet.id as any).toNumber().toString();
                                  } else {
                                    tweetIdStr = String(tweet.id);
                                  }
                                  const cleanId = tweetIdStr.replace('tweet-', '');
                                  const tweetUrl = `https://twitter.com/${tweet.user}/status/${cleanId}`;
                                  window.open(tweetUrl, '_blank', 'noopener,noreferrer');
                                }}
                                className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                                title="View on Twitter"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Tweet content */}
                            <div className="mb-2">
                              <TweetCard
                                text={tweet.text}
                                favoriteCount={tweet.favoriteCount}
                                createdAt={tweet.createdAt}
                                onUserClick={onUserClick}
                                onHashtagClick={onHashtagClick}
                                truncateLength={280}
                                showMetadata={false}
                                username={tweet.user}
                                tweetId={tweet.id}
                              />
                            </div>

                            {/* Tweet metadata */}
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <Heart className="w-3 h-3" />
                                <span>{(tweet.favoriteCount || 0).toLocaleString()}</span>
                              </div>
                              {formatDate(tweet.createdAt) && (
                                <span>{formatDate(tweet.createdAt)}</span>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Load More button */}
                    {hashtag.recentTweets.filter((t) => t.text).length > visibleTweets && (
                      <div className="mt-3 text-center">
                        <Button
                          onClick={() => setVisibleTweets(prev => prev + 5)}
                          variant="outline"
                          size="sm"
                        >
                          Load More Tweets
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="border rounded-md p-8 text-center">
                    <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No recent tweets available
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
