'use client';

import {
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  useLayoutEffect,
} from 'react';
import dynamic from 'next/dynamic';
import { Search, RefreshCw, X } from 'lucide-react';
import { useTheme } from 'next-themes';
import { NetworkGraphProps, GraphData, GraphNode } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';

const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
});

export default function NetworkGraph({
  filters,
  onNodeClick,
  highlightedNodeId,
  onClearHighlight,
  focusedNodeId,
  onFilterChange,
}: NetworkGraphProps & { onFilterChange?: (filters: any) => void }) {
  const { theme } = useTheme();
  const [graphData, setGraphData] = useState<GraphData>({
    nodes: [],
    links: [],
  });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isPulsing, setIsPulsing] = useState(false);
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitialZoomedRef = useRef(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 550 });
  const [resizeGeneration, setResizeGeneration] = useState(0);
  const previousWidthRef = useRef(800);

  const fetchNetworkData = useCallback(async () => {
    try {
      setLoading(true);
      hasInitialZoomedRef.current = false; // Reset zoom flag when fetching new data
      const params = new URLSearchParams({
        limit: filters.limit.toString(),
        minFollowers: filters.minFollowers.toString(),
        maxFollowers: filters.maxFollowers.toString(),
        minActivity: filters.minActivity.toString(),
        minHashtagFrequency: filters.minHashtagFrequency.toString(),
      });

      // Add multiple users
      filters.users.forEach(user => {
        if (user) params.append('users', user);
      });

      // Add multiple hashtags
      filters.hashtags.forEach(hashtag => {
        if (hashtag) params.append('hashtags', hashtag);
      });

      // Add multiple keywords
      filters.keywords.forEach(keyword => {
        if (keyword) params.append('keywords', keyword);
      });

      const response = await fetch(`/api/network?${params}`);
      if (!response.ok) throw new Error('Failed to fetch network data');
      const data: GraphData = await response.json();
      setGraphData(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchNetworkData();
  }, [fetchNetworkData]);

  // Smart highlight clearing - only clear if highlighted node doesn't exist in graph
  useEffect(() => {
    if (!highlightedNodeId || graphData.nodes.length === 0) return;

    const nodeExists = graphData.nodes.some(node => node.id === highlightedNodeId);
    if (!nodeExists && onClearHighlight) {
      // Node no longer exists in filtered data, clear highlight
      onClearHighlight();
    }
  }, [graphData.nodes, highlightedNodeId, onClearHighlight]);

  // Trigger pulse animation when focusing or highlighting a node from modal buttons
  useEffect(() => {
    if ((focusedNodeId || highlightedNodeId) && !loading) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [focusedNodeId, highlightedNodeId, loading]);

  // Measure container dimensions
  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });

      // Increment resize generation if width changed significantly (more than 50px)
      if (Math.abs(width - previousWidthRef.current) > 50) {
        previousWidthRef.current = width;
        setResizeGeneration(prev => prev + 1);
      }
    }
  }, []);

  useLayoutEffect(() => {
    if (!containerRef.current) return;

    updateDimensions();

    const resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateDimensions);
    });

    const currentContainer = containerRef.current;
    resizeObserver.observe(currentContainer);

    const handleResize = () => {
      updateDimensions();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [updateDimensions]);

  // Remeasure after data loads to account for layout changes
  useEffect(() => {
    if (!loading && graphData.nodes.length > 0) {
      updateDimensions();
    }
  }, [loading, graphData.nodes.length, updateDimensions]);

  // Initial zoom to fit when graph loads
  useEffect(() => {
    if (
      fgRef.current &&
      graphData.nodes.length > 0 &&
      !hasInitialZoomedRef.current
    ) {
      hasInitialZoomedRef.current = true;
      fgRef.current.zoomToFit(10, 80); // Quick initial zoom
    }
  }, [graphData]);

  // Handle focused node centering
  useEffect(() => {
    if (!fgRef.current || !focusedNodeId || graphData.nodes.length === 0)
      return;

    // Wait for simulation to stabilize before focusing
    const focusNode = () => {
      const node = graphData.nodes.find((n) => n.id === focusedNodeId);
      if (node && node.x !== undefined && node.y !== undefined) {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(3, 1000);
      }
    };

    // Delay focus to ensure simulation has started and node positions are initialized
    const timer = setTimeout(focusNode, 300);
    return () => clearTimeout(timer);
  }, [focusedNodeId, graphData.nodes]);

  // Handle force simulation stabilization - zoom to fit when simulation stops
  const handleEngineStop = useCallback(() => {
    if (fgRef.current && !focusedNodeId) {
      fgRef.current.zoomToFit(1000, 80);
    }
  }, [focusedNodeId]);

  // Calculate highlighted nodes and their connections
  const highlightedNodes = useMemo(() => {
    if (!highlightedNodeId) return new Set<string>();

    const connectedNodeIds = new Set<string>([highlightedNodeId]);

    // Find all directly connected nodes
    graphData.links.forEach((link) => {
      if (link.source === highlightedNodeId) {
        connectedNodeIds.add(
          typeof link.target === 'object'
            ? (link.target as any).id
            : link.target
        );
      }
      if (link.target === highlightedNodeId) {
        connectedNodeIds.add(
          typeof link.source === 'object'
            ? (link.source as any).id
            : link.source
        );
      }
    });

    return connectedNodeIds;
  }, [highlightedNodeId, graphData.links]);

  const isNodeHighlighted = (nodeId: string): boolean => {
    return !highlightedNodeId || highlightedNodes.has(nodeId);
  };

  const getNodeColor = (node: GraphNode): string => {
    switch (node.type) {
      case 'user':
        return '#60A5FA';
      case 'tweet':
        return '#10B981';
      case 'hashtag':
        return '#8B5CF6';
      default:
        return '#6B7280';
    }
  };

  const getNodeSize = (node: GraphNode): number => {
    switch (node.type) {
      case 'user':
        return Math.max(
          4,
          Math.min(12, Math.log((node.followersCount || 0) + 1) * 2)
        );
      case 'tweet':
        return Math.max(
          3,
          Math.min(8, Math.log((node.favoriteCount || 0) + 1) * 1.5)
        );
      case 'hashtag':
        return 6;
      default:
        return 4;
    }
  };

  const handleNodeClick = useCallback(
    (node: GraphNode) => {
      onNodeClick(node);
    },
    [onNodeClick]
  );

  if (loading) {
    return (
      <Card className="h-[650px]">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">
              Loading network graph...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <p className="text-sm text-destructive">
            Error loading graph: {error}
          </p>
          <Button
            onClick={fetchNetworkData}
            variant="outline"
            className="mt-4"
            size="sm"
          >
            <RefreshCw className="w-3 h-3 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (graphData.nodes.length === 0) {
    return (
      <Card className="h-[650px]">
        <CardContent className="h-full flex items-center justify-center">
          <div className="text-center">
            <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm font-medium">No data found</p>
            <p className="text-xs text-muted-foreground mt-1">
              Try adjusting your filters
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Check which filters are active
  const getActiveFilters = () => {
    const active: Array<{ type: string; label: string; value?: string }> = [];

    if (filters.minFollowers > 0) {
      active.push({
        type: 'minFollowers',
        label: `Min Followers: ${filters.minFollowers.toLocaleString()}`,
      });
    }
    if (filters.maxFollowers < 100000) {
      active.push({
        type: 'maxFollowers',
        label: `Max Followers: ${filters.maxFollowers.toLocaleString()}`,
      });
    }
    if (filters.minActivity > 1) {
      active.push({
        type: 'minActivity',
        label: `Min Activity: ${filters.minActivity}`,
      });
    }
    if (filters.minHashtagFrequency > 1) {
      active.push({
        type: 'minHashtagFrequency',
        label: `Min Hashtag Uses: ${filters.minHashtagFrequency}`,
      });
    }
    // Show each user as a separate chip
    filters.users.forEach((user) => {
      if (user) {
        active.push({
          type: 'user',
          label: `@${user}`,
          value: user
        });
      }
    });
    // Show each hashtag as a separate chip
    filters.hashtags.forEach((hashtag) => {
      if (hashtag) {
        active.push({
          type: 'hashtag',
          label: `#${hashtag}`,
          value: hashtag
        });
      }
    });
    // Show each keyword as a separate chip
    filters.keywords.forEach((keyword) => {
      if (keyword) {
        active.push({
          type: 'keyword',
          label: `"${keyword}"`,
          value: keyword
        });
      }
    });
    if (filters.limit !== 100) {
      active.push({ type: 'limit', label: `Limit: ${filters.limit}` });
    }

    return active;
  };

  const handleRemoveFilter = (filterType: string, value?: string) => {
    if (!onFilterChange) return;

    const newFilters = { ...filters };
    switch (filterType) {
      case 'minFollowers':
        newFilters.minFollowers = 0;
        break;
      case 'maxFollowers':
        newFilters.maxFollowers = 100000;
        break;
      case 'minActivity':
        newFilters.minActivity = 1;
        break;
      case 'minHashtagFrequency':
        newFilters.minHashtagFrequency = 1;
        break;
      case 'user':
        // Remove specific user from array
        newFilters.users = newFilters.users.filter(u => u !== value);
        break;
      case 'hashtag':
        // Remove specific hashtag from array
        newFilters.hashtags = newFilters.hashtags.filter(h => h !== value);
        break;
      case 'keyword':
        // Remove specific keyword from array
        newFilters.keywords = newFilters.keywords.filter(k => k !== value);
        break;
      case 'limit':
        newFilters.limit = 100;
        break;
    }

    // Highlight will be cleared automatically by useEffect if node doesn't exist
    onFilterChange(newFilters);
  };

  const activeFilters = getActiveFilters();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span className="text-muted-foreground">Users</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span className="text-muted-foreground">Tweets</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-purple-500"></div>
            <span className="text-muted-foreground">Hashtags</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          {highlightedNodeId && (
            <button
              onClick={onClearHighlight}
              className="inline-flex items-center gap-1 rounded-full bg-muted pl-2.5 pr-1.5 py-0.5 text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              Clear Highlight
              <X className="w-3 h-3 -mr-0.5" />
            </button>
          )}
          {activeFilters.length > 0 && (
            <div className="flex items-center gap-2 max-w-md">
              <span className="text-xs text-muted-foreground font-medium shrink-0">
                Filters:
              </span>
              <div className="flex gap-2 items-center overflow-x-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
                {activeFilters.map((filter, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 dark:bg-blue-900 pl-2.5 pr-1.5 py-0.5 text-xs font-medium text-blue-800 dark:text-blue-200 shrink-0"
                  >
                    {filter.label}
                    <button
                      onClick={() => handleRemoveFilter(filter.type, filter.value)}
                      className="hover:bg-blue-200 dark:hover:bg-blue-800 rounded-full p-0.5 transition-colors -mr-0.5"
                      aria-label={`Remove ${filter.label}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ width: '100%' }}
        className={`force-graph-container border rounded-md overflow-hidden bg-card h-[400px] md:h-[600px] lg:h-[700px] transition-all duration-1000 ease-out ${
          isPulsing ? 'ring-2 ring-primary ring-opacity-50' : ''
        }`}
      >
        <ForceGraph2D
          key={resizeGeneration}
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor={theme === 'light' ? '#fafafa' : '#0a0a0a'}
          graphData={graphData}
          warmupTicks={0}
          cooldownTime={0}
          nodeLabel={(node: any) => `${node.label} (${node.type})`}
          nodeColor={(node: any) => getNodeColor(node as GraphNode)}
          nodeVal={(node: any) => getNodeSize(node as GraphNode)}
          linkColor={(link: any) => {
            if (!highlightedNodeId) {
              return theme === 'dark' ? '#3f3f46' : '#e4e4e7';
            }
            const sourceId =
              typeof link.source === 'object' ? link.source.id : link.source;
            const targetId =
              typeof link.target === 'object' ? link.target.id : link.target;
            const isHighlighted =
              highlightedNodes.has(sourceId) && highlightedNodes.has(targetId);
            return isHighlighted
              ? theme === 'dark'
                ? '#3f3f46'
                : '#e4e4e7'
              : theme === 'dark'
                ? '#27272a'
                : '#f4f4f5';
          }}
          linkWidth={2}
          onNodeClick={(node: any) => handleNodeClick(node as GraphNode)}
          onNodeHover={(node: any) => {
            if (containerRef.current) {
              const canvas = containerRef.current.querySelector('canvas');
              if (canvas) {
                canvas.style.cursor = node ? 'pointer' : 'default';
              }
            }
          }}
          onBackgroundClick={onClearHighlight}
          onEngineStop={handleEngineStop}
          nodeCanvasObject={(
            node: any,
            ctx: CanvasRenderingContext2D,
            globalScale: number
          ) => {
            const graphNode = node as GraphNode;
            const label = graphNode.label;
            const fontSize = 12 / globalScale;
            ctx.font = `${fontSize}px Sans-Serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            const size = getNodeSize(graphNode);
            const highlighted = isNodeHighlighted(graphNode.id);
            const isMainHighlight = graphNode.id === highlightedNodeId;

            // Apply opacity for non-highlighted nodes
            ctx.globalAlpha = highlighted ? 1.0 : 0.3;

            // Draw node circle
            ctx.fillStyle = getNodeColor(graphNode);
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.fill();

            // Add ring around main highlighted node
            if (isMainHighlight) {
              ctx.strokeStyle = getNodeColor(graphNode);
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI, false);
              ctx.stroke();
            }

            // Draw label
            if (globalScale > 1.5) {
              ctx.fillStyle = theme === 'dark' ? '#fafafa' : '#18181b';
              ctx.fillText(label, node.x, node.y + size + fontSize);
            }

            // Reset global alpha
            ctx.globalAlpha = 1.0;
          }}
        />
      </div>

      <div className="mt-4 text-xs text-muted-foreground">
        <p>
          {graphData.nodes.length} nodes, {graphData.links.length} edges • Click
          nodes to view details
        </p>
      </div>
    </div>
  );
}
