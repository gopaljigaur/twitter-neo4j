'use client';

import { useEffect } from 'react';
import { Eye, Highlighter } from 'lucide-react';
import { TweetDetailProps } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
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
  // Lock body scroll when modal is open
  useEffect(() => {
    if (!tweet) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [tweet]);

  if (!tweet) return null;

  return (
    <Dialog open={!!tweet} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tweet Details</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-4">
            <TweetCard
              text={tweet.text || tweet.label}
              favoriteCount={tweet.favoriteCount}
              createdAt={tweet.createdAt}
              onUserClick={onUserClick}
              onHashtagClick={onHashtagClick}
              truncateLength={Infinity}
              showMetadata={true}
              username={tweet.name}
              tweetId={tweet.id}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={onViewInGraph}
              variant="outline"
              className="flex-1"
            >
              <Eye className="w-4 h-4 mr-2" />
              Show Network
            </Button>
            <Button onClick={onHighlight} variant="outline" className="flex-1">
              <Highlighter className="w-4 h-4 mr-2" />
              Focus in Graph
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            Tweet ID: {(() => {
              let tweetIdStr = '';
              if (tweet.id && typeof tweet.id === 'object' && 'toNumber' in tweet.id) {
                tweetIdStr = (tweet.id as any).toNumber().toString();
              } else {
                tweetIdStr = String(tweet.id);
              }
              return tweetIdStr.replace('tweet-', '');
            })()}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
