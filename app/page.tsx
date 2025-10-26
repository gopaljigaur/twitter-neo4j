'use client';

import { useState, useRef } from 'react';
import StatsPanel from './components/StatsPanel';
import NetworkGraph from './components/NetworkGraph';
import GlobalSearch from './components/GlobalSearch';
import GraphFilters from './components/GraphFilters';
import UserDetail from './components/UserDetail';
import HashtagDetail from './components/HashtagDetail';
import TweetDetail from './components/TweetDetail';
import { ThemeToggle } from './components/theme-toggle';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Filters, GraphNode } from '@/types';

export default function Home() {
  const graphRef = useRef<HTMLDivElement>(null);
  const [filters, setFilters] = useState<Filters>({
    minFollowers: 0,
    maxFollowers: 100000,
    minActivity: 1,
    minHashtagFrequency: 1,
    users: [],
    hashtags: [],
    keywords: [],
    limit: 100,
  });
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedHashtag, setSelectedHashtag] = useState<string | null>(null);
  const [selectedTweet, setSelectedTweet] = useState<GraphNode | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
    null
  );
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  const scrollToGraph = () => {
    graphRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleNodeClick = (node: GraphNode) => {
    if (node.type === 'user') {
      setSelectedUser(node.label);
      setSelectedHashtag(null);
      setSelectedTweet(null);
    } else if (node.type === 'tweet') {
      setSelectedTweet(node);
      setSelectedUser(null);
      setSelectedHashtag(null);
    } else if (node.type === 'hashtag') {
      const hashtagName = node.label.replace('#', '');
      setSelectedHashtag(hashtagName);
      setSelectedUser(null);
      setSelectedTweet(null);
    }
  };

  const handleUserClick = (username: string) => {
    setSelectedUser(username);
    setSelectedHashtag(null);
    setSelectedTweet(null);
  };

  const handleHashtagClick = (hashtag: string) => {
    setSelectedHashtag(hashtag);
    setSelectedUser(null);
    setSelectedTweet(null);
  };

  const handleViewUserInGraph = (username: string) => {
    // Close modal and update graph to show user's network
    setSelectedUser(null);
    setSelectedHashtag(null);
    setSelectedTweet(null);
    setFocusedNodeId(`user-${username}`);
    setHighlightedNodeId(`user-${username}`);
    setFilters((prev) => ({
      ...prev,
      users: [username], // Filter by this user
      hashtags: [],
      keywords: [],
    }));
    scrollToGraph();
  };

  const handleViewHashtagInGraph = (hashtag: string) => {
    // Close modal and update graph to show hashtag's network
    setSelectedUser(null);
    setSelectedHashtag(null);
    setSelectedTweet(null);
    setFocusedNodeId(`hashtag-${hashtag}`);
    setHighlightedNodeId(`hashtag-${hashtag}`);
    setFilters((prev) => ({
      ...prev,
      users: [],
      hashtags: [hashtag], // Filter by this hashtag
      keywords: [],
    }));
    scrollToGraph();
  };

  const handleViewTweetInGraph = (tweetId: string) => {
    // Close modal and focus on the tweet
    setSelectedUser(null);
    setSelectedHashtag(null);
    setSelectedTweet(null);
    setFocusedNodeId(`tweet-${tweetId}`);
    setHighlightedNodeId(`tweet-${tweetId}`);
    scrollToGraph();
  };

  const handleHighlightUser = (username: string) => {
    // Close modal, highlight and focus on the user
    setSelectedUser(null);
    const nodeId = `user-${username}`;
    setHighlightedNodeId(nodeId);
    setFocusedNodeId(nodeId);
    scrollToGraph();
  };

  const handleHighlightHashtag = (hashtag: string) => {
    // Close modal, highlight and focus on the hashtag
    setSelectedHashtag(null);
    const nodeId = `hashtag-${hashtag}`;
    setHighlightedNodeId(nodeId);
    setFocusedNodeId(nodeId);
    scrollToGraph();
  };

  const handleHighlightTweet = (tweetId: string) => {
    // Close modal, highlight and focus on the tweet
    setSelectedTweet(null);
    const nodeId = `tweet-${tweetId}`;
    setHighlightedNodeId(nodeId);
    setFocusedNodeId(nodeId);
    scrollToGraph();
  };

  const handleSearchTweetClick = (
    tweetId: string,
    text: string,
    favoriteCount: number,
    user: string
  ) => {
    // Open tweet modal from search results
    const tweetNode: GraphNode = {
      id: `tweet-${tweetId}`,
      label: text.substring(0, 50),
      type: 'tweet',
      text,
      favoriteCount,
      name: user,
    };
    setSelectedTweet(tweetNode);
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Neo4j Twitter Network Dashboard
              </h1>
              <p className="text-muted-foreground mt-2">
                Visualize and explore Twitter network relationships using graph
                database technology
              </p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <StatsPanel
            onUserClick={handleUserClick}
            onHashtagClick={handleHashtagClick}
          />

          <GlobalSearch
            onUserClick={handleUserClick}
            onHashtagClick={handleHashtagClick}
            onTweetClick={handleSearchTweetClick}
          />

          <Card ref={graphRef}>
            <CardHeader>
              <CardTitle>Network Graph</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">
                <div className="lg:col-span-1 flex flex-col">
                  <GraphFilters
                    onFilterChange={handleFilterChange}
                    currentFilters={filters}
                  />
                </div>

                <div className="lg:col-span-2 flex flex-col">
                  <NetworkGraph
                    filters={filters}
                    onNodeClick={handleNodeClick}
                    highlightedNodeId={highlightedNodeId}
                    onClearHighlight={() => {
                      setHighlightedNodeId(null);
                      setFocusedNodeId(null);
                    }}
                    focusedNodeId={focusedNodeId}
                    onFilterChange={handleFilterChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {selectedUser && (
        <UserDetail
          screenName={selectedUser}
          onClose={() => setSelectedUser(null)}
          onUserClick={handleUserClick}
          onHashtagClick={handleHashtagClick}
          onViewInGraph={() => handleViewUserInGraph(selectedUser)}
          onHighlight={() => handleHighlightUser(selectedUser)}
        />
      )}

      {selectedHashtag && (
        <HashtagDetail
          hashtagName={selectedHashtag}
          onClose={() => setSelectedHashtag(null)}
          onUserClick={handleUserClick}
          onHashtagClick={handleHashtagClick}
          onViewInGraph={() => handleViewHashtagInGraph(selectedHashtag)}
          onHighlight={() => handleHighlightHashtag(selectedHashtag)}
        />
      )}

      {selectedTweet && (
        <TweetDetail
          tweet={selectedTweet}
          onClose={() => setSelectedTweet(null)}
          onUserClick={handleUserClick}
          onHashtagClick={handleHashtagClick}
          onViewInGraph={() => handleViewTweetInGraph(selectedTweet.id)}
          onHighlight={() => handleHighlightTweet(selectedTweet.id)}
        />
      )}

      <footer className="border-t mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-sm text-muted-foreground">
            Built by{' '}
            <a
              href="https://gopalji.me"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Gopalji Gaur
            </a>{' '}
            |{' '}
            <a
              href="https://github.com/neo4j-graph-examples/twitter-v2"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground transition-colors"
            >
              Twitter v2 Dataset
            </a>
          </p>
        </div>
      </footer>
    </main>
  );
}
