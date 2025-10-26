// User types
export interface User {
  screenName: string;
  name: string;
  followersCount: number;
  followingCount: number;
  tweetCount: number;
  profileImageUrl?: string;
  recentTweets?: Tweet[];
  topHashtags?: HashtagCount[];
}

export interface UserSearchResult {
  screenName: string;
  name: string;
  followers: number;
}

// Tweet types
export interface Tweet {
  id: string;
  text: string;
  favoriteCount: number;
  createdAt: string;
  hashtags?: string[];
}

// Hashtag types
export interface HashtagCount {
  name: string;
  count: number;
}

export interface HashtagSearchResult {
  name: string;
  usage: number;
}

// Stats types
export interface Stats {
  totalUsers: number;
  totalTweets: number;
  totalHashtags: number;
  topUsers: TopUser[];
  topHashtags: HashtagCount[];
}

export interface TopUser {
  screenName: string;
  count: number;
}

// Graph/Network types
export interface GraphNode {
  id: string;
  label: string;
  type: 'user' | 'tweet' | 'hashtag';
  followersCount?: number;
  name?: string;
  screenName?: string;
  text?: string;
  favoriteCount?: number;
  createdAt?: string;
  // D3 force simulation properties (added at runtime)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: 'posts' | 'tags' | 'mentions';
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

// Filter types for network graph
export interface Filters {
  minFollowers: number; // Minimum follower count
  maxFollowers: number; // Maximum follower count
  minActivity: number; // Minimum number of tweets
  minHashtagFrequency: number; // Minimum hashtag usage frequency
  users: string[]; // Filter by specific users
  hashtags: string[]; // Filter by tweets with these hashtags
  keywords: string[]; // Search tweet text for these keywords
  limit: number; // Number of tweets to show
}

// Search types
export interface TweetSearchResult {
  id: string;
  text: string;
  favoriteCount: number;
  user: string;
}

export interface SearchResponse {
  results: (UserSearchResult | HashtagSearchResult | TweetSearchResult)[];
  total?: number;
}

// Component prop types
export interface NetworkGraphProps {
  filters: Filters;
  onNodeClick: (node: GraphNode) => void;
  highlightedNodeId?: string | null;
  onClearHighlight?: () => void;
  focusedNodeId?: string | null;
}

export interface SearchFiltersProps {
  onFilterChange: (filters: Filters) => void;
  onUserClick?: (username: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  onTweetClick?: (
    tweetId: string,
    text: string,
    favoriteCount: number,
    user: string
  ) => void;
}

// Hashtag detail types
export interface Hashtag {
  name: string;
  totalTweets: number;
  totalUsers: number;
  recentTweets: Array<{
    id: string;
    text: string;
    favoriteCount: number;
    createdAt: string;
    user: string;
    userName?: string;
  }>;
  relatedHashtags: Array<{
    name: string;
    count: number;
  }>;
}

export interface UserDetailProps {
  screenName: string | null;
  onClose: () => void;
  onUserClick?: (username: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  onViewInGraph?: () => void;
  onHighlight?: () => void;
}

export interface HashtagDetailProps {
  hashtagName: string | null;
  onClose: () => void;
  onUserClick?: (username: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  onViewInGraph?: () => void;
  onHighlight?: () => void;
}

export interface TweetDetailProps {
  tweet: GraphNode | null;
  onClose: () => void;
  onUserClick?: (username: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  onViewInGraph?: () => void;
  onHighlight?: () => void;
}

export interface StatsPanelProps {
  onUserClick?: (username: string) => void;
  onHashtagClick?: (hashtag: string) => void;
}

// API Error types
export interface APIError {
  error: string;
  details?: string;
}
