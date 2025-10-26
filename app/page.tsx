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
import { Filters, GraphNode, NavigationStackItem } from '@/types';

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
  const [navigationStack, setNavigationStack] = useState<NavigationStackItem[]>([]);

  const scrollToGraph = () => {
    graphRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // Navigation stack helpers
  const pushToNavigationStack = (type: 'user' | 'hashtag' | 'tweet', data: any) => {
    // Save current state to stack before navigating
    if (selectedUser) {
      setNavigationStack(prev => [...prev, { type: 'user', data: selectedUser }]);
    } else if (selectedHashtag) {
      setNavigationStack(prev => [...prev, { type: 'hashtag', data: selectedHashtag }]);
    } else if (selectedTweet) {
      setNavigationStack(prev => [...prev, { type: 'tweet', data: selectedTweet }]);
    }

    // Navigate to new modal
    navigateToModal(type, data);
  };

  const navigateToModal = (type: 'user' | 'hashtag' | 'tweet', data: any) => {
    if (type === 'user') {
      setSelectedUser(data);
      setSelectedHashtag(null);
      setSelectedTweet(null);
    } else if (type === 'hashtag') {
      setSelectedHashtag(data);
      setSelectedUser(null);
      setSelectedTweet(null);
    } else if (type === 'tweet') {
      setSelectedTweet(data);
      setSelectedUser(null);
      setSelectedHashtag(null);
    }
  };

  const handleBackNavigation = () => {
    if (navigationStack.length === 0) return;

    const newStack = [...navigationStack];
    const previousItem = newStack.pop()!;
    setNavigationStack(newStack);

    navigateToModal(previousItem.type, previousItem.data);
  };

  const closeAllModals = () => {
    setSelectedUser(null);
    setSelectedHashtag(null);
    setSelectedTweet(null);
    setNavigationStack([]);
  };

  const handleFilterChange = (newFilters: Filters) => {
    setFilters(newFilters);
  };

  const handleNodeClick = (node: GraphNode) => {
    // When clicking from graph, don't push to stack (start fresh navigation)
    if (node.type === 'user') {
      navigateToModal('user', node.label);
    } else if (node.type === 'tweet') {
      navigateToModal('tweet', node);
    } else if (node.type === 'hashtag') {
      const hashtagName = node.label.replace('#', '');
      navigateToModal('hashtag', hashtagName);
    }
  };

  const handleUserClick = (username: string) => {
    // When clicking from within a modal, push current state to stack
    pushToNavigationStack('user', username);
  };

  const handleHashtagClick = (hashtag: string) => {
    // When clicking from within a modal, push current state to stack
    pushToNavigationStack('hashtag', hashtag);
  };

  const handleTweetClick = (tweet: any) => {
    // Convert tweet data to GraphNode format
    const tweetNode: GraphNode = {
      id: tweet.id.startsWith('tweet-') ? tweet.id : `tweet-${tweet.id}`,
      label: tweet.text?.substring(0, 30) + '...' || 'Tweet',
      type: 'tweet',
      text: tweet.text,
      favoriteCount: tweet.favoriteCount,
      createdAt: tweet.createdAt,
      name: tweet.name,
      screenName: tweet.screenName,
    };
    // When clicking from within a modal, push current state to stack
    pushToNavigationStack('tweet', tweetNode);
  };

  const handleViewUserInGraph = (username: string) => {
    // Close all modals and clear navigation stack
    closeAllModals();
    setFocusedNodeId(`user-${username}`);
    setHighlightedNodeId(`user-${username}`);
    setFilters((prev) => ({
      ...prev,
      users: [username],
      hashtags: [],
      keywords: [],
    }));
    scrollToGraph();
  };

  const handleViewHashtagInGraph = (hashtag: string) => {
    // Close all modals and clear navigation stack
    closeAllModals();
    setFocusedNodeId(`hashtag-${hashtag}`);
    setHighlightedNodeId(`hashtag-${hashtag}`);
    setFilters((prev) => ({
      ...prev,
      users: [],
      hashtags: [hashtag],
      keywords: [],
    }));
    scrollToGraph();
  };

  const handleViewTweetInGraph = (tweet: GraphNode) => {
    // Close all modals and clear navigation stack
    closeAllModals();
    const nodeId = tweet.id.startsWith('tweet-') ? tweet.id : `tweet-${tweet.id}`;
    setFocusedNodeId(nodeId);
    setHighlightedNodeId(nodeId);
    if (tweet.screenName) {
      setFilters((prev) => ({
        ...prev,
        users: [tweet.screenName!],
        hashtags: [],
        keywords: [],
      }));
    }
    scrollToGraph();
  };

  const handleHighlightUser = (username: string) => {
    // Close all modals and clear navigation stack
    closeAllModals();
    const nodeId = `user-${username}`;
    setHighlightedNodeId(nodeId);
    setFocusedNodeId(nodeId);
    scrollToGraph();
  };

  const handleHighlightHashtag = (hashtag: string) => {
    // Close all modals and clear navigation stack
    closeAllModals();
    const nodeId = `hashtag-${hashtag}`;
    setHighlightedNodeId(nodeId);
    setFocusedNodeId(nodeId);
    scrollToGraph();
  };

  const handleHighlightTweet = (tweetId: string) => {
    // Close all modals and clear navigation stack
    closeAllModals();
    const nodeId = tweetId.startsWith('tweet-') ? tweetId : `tweet-${tweetId}`;
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

      {/* Persistent backdrop for all modals */}
      {(selectedUser || selectedHashtag || selectedTweet) && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-xs z-50 animate-fadeIn"
          onClick={closeAllModals}
        />
      )}

      {selectedUser && (
        <UserDetail
          screenName={selectedUser}
          onClose={closeAllModals}
          onBack={handleBackNavigation}
          showBack={navigationStack.length > 0}
          onUserClick={handleUserClick}
          onHashtagClick={handleHashtagClick}
          onTweetClick={handleTweetClick}
          onViewInGraph={() => handleViewUserInGraph(selectedUser)}
          onHighlight={() => handleHighlightUser(selectedUser)}
        />
      )}

      {selectedHashtag && (
        <HashtagDetail
          hashtagName={selectedHashtag}
          onClose={closeAllModals}
          onBack={handleBackNavigation}
          showBack={navigationStack.length > 0}
          onUserClick={handleUserClick}
          onHashtagClick={handleHashtagClick}
          onTweetClick={handleTweetClick}
          onViewInGraph={() => handleViewHashtagInGraph(selectedHashtag)}
          onHighlight={() => handleHighlightHashtag(selectedHashtag)}
        />
      )}

      {selectedTweet && (
        <TweetDetail
          tweet={selectedTweet}
          onClose={closeAllModals}
          onBack={handleBackNavigation}
          showBack={navigationStack.length > 0}
          onUserClick={handleUserClick}
          onHashtagClick={handleHashtagClick}
          onViewInGraph={() => handleViewTweetInGraph(selectedTweet)}
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
