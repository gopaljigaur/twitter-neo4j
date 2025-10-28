'use client';

import { useEffect, useState } from 'react';
import { Users, MessageSquare, Hash } from 'lucide-react';
import { Stats, StatsPanelProps } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

export default function StatsPanel({
  onUserClick,
  onHashtagClick,
  onFilterByType,
}: StatsPanelProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/stats');
      if (!response.ok) throw new Error('Failed to fetch stats');
      const data: Stats = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-8 bg-muted rounded w-1/3 animate-pulse"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-muted rounded animate-pulse"></div>
            <div className="h-20 bg-muted rounded animate-pulse"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">Error: {error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="rounded-lg border bg-card p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onFilterByType?.('user')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-md">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Users</p>
                <p className="text-2xl font-bold">
                  {stats?.totalUsers?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg border bg-card p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onFilterByType?.('tweet')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-md">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tweets</p>
                <p className="text-2xl font-bold">
                  {stats?.totalTweets?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>

          <div
            className="rounded-lg border bg-card p-4 cursor-pointer hover:bg-muted/50 transition-colors"
            onClick={() => onFilterByType?.('hashtag')}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-md">
                <Hash className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hashtags</p>
                <p className="text-2xl font-bold">
                  {stats?.totalHashtags?.toLocaleString() || 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold mb-3">Top Users</h3>
            <div className="space-y-2">
              {stats?.topUsers?.map((user, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => onUserClick?.(user.screenName)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">#{idx + 1}</span>
                    <span className="font-medium text-blue-500">
                      @{user.screenName}
                    </span>
                  </div>
                  <span className="text-muted-foreground">{user.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-3">Top Hashtags</h3>
            <div className="space-y-2">
              {stats?.topHashtags?.map((hashtag, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => onHashtagClick?.(hashtag.name)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">#{idx + 1}</span>
                    <span className="font-medium text-purple-500">
                      #{hashtag.name}
                    </span>
                  </div>
                  <span className="text-muted-foreground">{hashtag.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
