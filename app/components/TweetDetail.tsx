'use client';

import { useEffect } from 'react';
import { Eye, Highlighter, ExternalLink, X, User as UserIcon, Heart } from 'lucide-react';
import { TweetDetailProps } from '@/types';
import { Button } from './ui/button';
import TweetCard from './TweetCard';

export default function TweetDetail({
  tweet,
  onClose,
  onUserClick,
  onHashtagClick,
  onViewInGraph,
  onHighlight,
}: TweetDetailProps) {
  useEffect(() => {
    if (!tweet) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [tweet]);

  if (!tweet) return null;

  const getTweetId = () => {
    let tweetIdStr = '';
    if (tweet.id && typeof tweet.id === 'object' && 'toNumber' in tweet.id) {
      tweetIdStr = (tweet.id as any).toNumber().toString();
    } else {
      tweetIdStr = String(tweet.id);
    }
    return tweetIdStr.replace('tweet-', '');
  };

  const formatDate = (dateObj: any): string => {
    if (!dateObj) return '';
    try {
      if (typeof dateObj === 'object' && dateObj.year) {
        const date = new Date(
          dateObj.year,
          dateObj.month - 1,
          dateObj.day,
          dateObj.hour || 0,
          dateObj.minute || 0,
          dateObj.second || 0
        );
        return date.toLocaleDateString();
      }
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

  const tweetId = getTweetId();
  const twitterUrl = `https://twitter.com/i/status/${tweetId}`;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-card rounded-lg shadow-lg max-w-2xl w-full max-h-[85vh] overflow-y-auto border">
        <div className="sticky top-0 bg-card border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Tweet Details</h2>
          <Button onClick={onClose} variant="ghost" size="icon">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-6 space-y-4">
          <div className="border rounded-md p-4 text-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <p className="font-semibold text-sm truncate">
                    {tweet.name || 'Unknown User'}
                  </p>
                  {tweet.screenName && (
                    <button
                      onClick={() => onUserClick?.(tweet.screenName!)}
                      className="text-xs text-blue-500 hover:text-blue-600 truncate hover:underline"
                    >
                      @{tweet.screenName}
                    </button>
                  )}
                </div>
              </div>
              <button
                onClick={() => window.open(twitterUrl, '_blank', 'noopener,noreferrer')}
                className="p-1.5 text-muted-foreground hover:text-primary transition-colors"
                title="View on Twitter"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>

            <div className="mb-2">
              <TweetCard
                text={tweet.text || tweet.label}
                favoriteCount={tweet.favoriteCount}
                createdAt={tweet.createdAt}
                onUserClick={onUserClick}
                onHashtagClick={onHashtagClick}
                truncateLength={Infinity}
                showMetadata={false}
                username={tweet.name}
                tweetId={tweet.id}
              />
            </div>

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

          <div className="flex gap-2">
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

          <div className="text-xs text-muted-foreground pt-2 border-t">
            Tweet ID: {tweetId}
          </div>
        </div>
      </div>
    </div>
  );
}
