'use client';

import { useState } from 'react';
import { Heart, Calendar, ExternalLink } from 'lucide-react';
import ClickableText from './ClickableText';

interface TweetCardProps {
  text: string;
  favoriteCount?: number;
  createdAt?: string;
  hashtags?: string[];
  onUserClick?: (username: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  truncateLength?: number;
  showMetadata?: boolean;
  tweetUrl?: string;
  username?: string;
  tweetId?: string;
}

export default function TweetCard({
  text,
  favoriteCount,
  createdAt,
  hashtags,
  onUserClick,
  onHashtagClick,
  truncateLength = 200,
  showMetadata = true,
  tweetUrl,
  username,
  tweetId,
}: TweetCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const isLongTweet = text.length > truncateLength;
  const displayText =
    isLongTweet && !isExpanded
      ? text.substring(0, truncateLength) + '...'
      : text;

  // Construct Twitter URL if we have username and tweetId
  const constructedTweetUrl = tweetUrl || (username && tweetId ? (() => {
    // Handle Neo4j Integer or regular string/number
    let tweetIdStr = '';
    if (tweetId && typeof tweetId === 'object' && 'toNumber' in (tweetId as any)) {
      tweetIdStr = (tweetId as any).toNumber().toString();
    } else {
      tweetIdStr = String(tweetId);
    }
    const cleanId = tweetIdStr.replace('tweet-', '');
    return `https://twitter.com/${username}/status/${cleanId}`;
  })() : null);

  const formatDate = (dateString?: string): string => {
    if (!dateString || dateString.trim() === '') return 'Date unavailable';
    try {
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      }
    } catch {
      return 'Invalid date';
    }
    return 'Invalid date';
  };

  return (
    <div className="space-y-2">
      <ClickableText
        text={displayText}
        onUserClick={onUserClick}
        onHashtagClick={onHashtagClick}
        className="text-base leading-relaxed whitespace-pre-wrap block"
      />

      {isLongTweet && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-500 hover:text-blue-600 font-medium"
        >
          {isExpanded ? 'Show less' : 'Show more'}
        </button>
      )}

      {showMetadata && (
        <div className="flex items-center justify-between text-sm text-muted-foreground pt-2">
          <div className="flex items-center gap-1.5">
            <Heart className="w-4 h-4" />
            <span>{(favoriteCount || 0).toLocaleString()}</span>
          </div>

          {createdAt && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(createdAt)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
