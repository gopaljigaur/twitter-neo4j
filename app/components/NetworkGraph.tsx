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
import { Search, RefreshCw, X, Maximize2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { NetworkGraphProps, GraphData, GraphNode } from '@/types';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from './ui/tooltip';

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
  const fgRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hasInitialZoomedRef = useRef(false);
  const [hasUserMoved, setHasUserMoved] = useState<boolean>(false);
  const [dimensions, setDimensions] = useState({ width: 800, height: 550 });
  const [resizeGeneration, setResizeGeneration] = useState(0);
  const previousWidthRef = useRef(800);

  const fetchNetworkData = useCallback(async () => {
    try {
      setLoading(true);
      hasInitialZoomedRef.current = false;
      setHasUserMoved(false);
      const params = new URLSearchParams({
        limit: filters.limit.toString(),
        minFollowers: filters.minFollowers.toString(),
        maxFollowers: filters.maxFollowers.toString(),
        minActivity: filters.minActivity.toString(),
        minHashtagFrequency: filters.minHashtagFrequency.toString(),
      });

      filters.users.forEach(user => {
        if (user) params.append('users', user);
      });

      filters.hashtags.forEach(hashtag => {
        if (hashtag) params.append('hashtags', hashtag);
      });

      filters.keywords.forEach(keyword => {
        if (keyword) params.append('keywords', keyword);
      });

      const response = await fetch(`/api/network?${params}`);
      // @ts-ignore - Intentionally throwing error to be caught by catch block
      if (!response.ok) throw new Error('Failed to fetch network data');
      let data: GraphData = await response.json();

      if (filters.nodeTypes && filters.nodeTypes.length > 0) {
        const allowedNodeIds = new Set(
          data.nodes
            .filter(node => filters.nodeTypes!.includes(node.type))
            .map(node => node.id)
        );

        data = {
          nodes: data.nodes.filter(node => allowedNodeIds.has(node.id)),
          links: data.links.filter(link =>
            allowedNodeIds.has(link.source) &&
            allowedNodeIds.has(link.target)
          ),
        };
      }

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

  useEffect(() => {
    if (!highlightedNodeId || graphData.nodes.length === 0) return;

    const nodeExists = graphData.nodes.some(node => node.id === highlightedNodeId);
    if (!nodeExists && onClearHighlight) {
      onClearHighlight();
    }
  }, [graphData.nodes, highlightedNodeId, onClearHighlight]);

  const updateDimensions = useCallback(() => {
    if (containerRef.current) {
      const { width, height } = containerRef.current.getBoundingClientRect();
      setDimensions({ width, height });

      if (!loading && Math.abs(width - previousWidthRef.current) > 50) {
        previousWidthRef.current = width;
        setResizeGeneration(prev => prev + 1);
      }
    }
  }, [loading]);

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

  useEffect(() => {
    if (
      fgRef.current &&
      graphData.nodes.length > 0 &&
      !hasInitialZoomedRef.current
    ) {
      hasInitialZoomedRef.current = true;
      setTimeout(() => {
        if (fgRef.current) {
          fgRef.current.zoomToFit(1000, 50);
        }
      }, 50);
    }
  }, [graphData]);

  useEffect(() => {
    if (graphData.nodes.length > 0) {
      updateDimensions();
    }
  }, [graphData.nodes.length, updateDimensions]);

  useEffect(() => {
    if (!fgRef.current || !focusedNodeId || graphData.nodes.length === 0)
      return;

    const focusNode = () => {
      const node = graphData.nodes.find((n) => n.id === focusedNodeId);
      if (node && node.x !== undefined && node.y !== undefined) {
        fgRef.current.centerAt(node.x, node.y, 1000);
        fgRef.current.zoom(3, 1000);
      }
    };

    const timer = setTimeout(focusNode, 300);
    return () => clearTimeout(timer);
  }, [focusedNodeId, graphData.nodes]);

  const handleEngineStop = useCallback(() => {
    if (fgRef.current && !focusedNodeId && !hasUserMoved) {
      fgRef.current.zoomToFit(1000, 50);
    }
  }, [focusedNodeId, hasUserMoved]);

  const highlightedNodes = useMemo(() => {
    if (!highlightedNodeId) return new Set<string>();

    const connectedNodeIds = new Set<string>([highlightedNodeId]);
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

  const getNodeLabelColor = (node: GraphNode): string => {
    if (theme === 'dark') {
      switch (node.type) {
        case 'user':
          return '#93C5FD';
        case 'tweet':
          return '#34D399';
        case 'hashtag':
          return '#A78BFA';
        default:
          return '#9CA3AF';
      }
    } else {
      switch (node.type) {
        case 'user':
          return '#2563EB';
        case 'tweet':
          return '#059669';
        case 'hashtag':
          return '#7C3AED';
        default:
          return '#4B5563';
      }
    }
  };

  const getNodeSize = (node: GraphNode): number => {
    switch (node.type) {
      case 'user':
        return Math.max(
          4,
          Math.min(8, Math.log((node.followersCount || 0) + 1) * 1.5)
        );
      case 'tweet':
        return Math.max(
          3,
          Math.min(9, Math.log((node.favoriteCount || 0) + 1) * 2.5)
        );
      case 'hashtag':
        const connections = graphData.links.filter(
          (link: any) =>
            (typeof link.source === 'object' ? link.source.id : link.source) === node.id ||
            (typeof link.target === 'object' ? link.target.id : link.target) === node.id
        ).length;
        return Math.max(3, Math.min(10, Math.log(connections + 1) * 3));
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

    if (filters.nodeTypes && filters.nodeTypes.length > 0) {
      const nodeTypeLabels: Record<string, string> = {
        user: 'Users only',
        hashtag: 'Hashtags only',
        tweet: 'Tweets only',
      };
      active.push({
        type: 'nodeTypes',
        label: nodeTypeLabels[filters.nodeTypes[0]],
      });
    }
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
    filters.users.forEach((user) => {
      if (user) {
        active.push({
          type: 'user',
          label: `@${user}`,
          value: user
        });
      }
    });
    filters.hashtags.forEach((hashtag) => {
      if (hashtag) {
        active.push({
          type: 'hashtag',
          label: `#${hashtag}`,
          value: hashtag
        });
      }
    });
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
      case 'nodeTypes':
        newFilters.nodeTypes = undefined;
        break;
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
        newFilters.users = newFilters.users.filter(u => u !== value);
        break;
      case 'hashtag':
        newFilters.hashtags = newFilters.hashtags.filter(h => h !== value);
        break;
      case 'keyword':
        newFilters.keywords = newFilters.keywords.filter(k => k !== value);
        break;
      case 'limit':
        newFilters.limit = 100;
        break;
    }

    onFilterChange(newFilters);
  };

  const handleRecenter = () => {
    if (fgRef.current) {
      fgRef.current.zoomToFit(1000, 50);
      setHasUserMoved(false);
    }
  };

  const activeFilters = getActiveFilters();

  const getFilterPillClasses = (type: string) => {
    switch (type) {
      case 'nodeTypes':
        return {
          pill: 'bg-orange-100 dark:bg-orange-900 text-orange-800 dark:text-orange-200',
          button: 'hover:bg-orange-200 dark:hover:bg-orange-800'
        };
      case 'user':
        return {
          pill: 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
          button: 'hover:bg-green-200 dark:hover:bg-green-800'
        };
      case 'hashtag':
        return {
          pill: 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200',
          button: 'hover:bg-purple-200 dark:hover:bg-purple-800'
        };
      case 'keyword':
        return {
          pill: 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200',
          button: 'hover:bg-blue-200 dark:hover:bg-blue-800'
        };
      default:
        return {
          pill: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
          button: 'hover:bg-gray-200 dark:hover:bg-gray-700'
        };
    }
  };

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
                {activeFilters.map((filter, index) => {
                  const colors = getFilterPillClasses(filter.type);
                  return (
                    <span
                      key={index}
                      className={`inline-flex items-center gap-1 rounded-full pl-2.5 pr-1.5 py-0.5 text-xs font-medium shrink-0 ${colors.pill}`}
                    >
                      {filter.label}
                      <button
                        onClick={() => handleRemoveFilter(filter.type, filter.value)}
                        className={`rounded-full p-0.5 transition-colors -mr-0.5 ${colors.button}`}
                        aria-label={`Remove ${filter.label}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      <div
        ref={containerRef}
        style={{ width: '100%' }}
        className="relative force-graph-container border rounded-md overflow-hidden bg-card h-[400px] md:h-[600px] lg:h-[700px]"
      >
        <ForceGraph2D
          key={resizeGeneration}
          ref={fgRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor={theme === 'light' ? '#fafafa' : '#0a0a0a'}
          graphData={graphData}
          warmupTicks={100}
          cooldownTime={1000}
          d3AlphaDecay={0.005}
          d3VelocityDecay={0.7}
          enableNodeDrag={true}
          enableZoomInteraction={true}
          enablePanInteraction={true}
          enablePointerInteraction={true}
          onNodeDrag={() => {
            setHasUserMoved(true);
          }}
          onZoom={() => {
            setHasUserMoved(true);
          }}
          nodeLabel={(node: any) => `${node.label} (${node.type})`}
          nodeColor={(node: any) => getNodeColor(node as GraphNode)}
          nodeVal={(node: any) => getNodeSize(node as GraphNode)}
          linkColor={(link: any) => {
            if (!highlightedNodeId) {
              return theme === 'dark' ? '#52525b' : '#e4e4e7';
            }
            const sourceId =
              typeof link.source === 'object' ? link.source.id : link.source;
            const targetId =
              typeof link.target === 'object' ? link.target.id : link.target;
            const isHighlighted =
              highlightedNodes.has(sourceId) && highlightedNodes.has(targetId);
            return isHighlighted
              ? theme === 'dark'
                ? '#52525b'
                : '#e4e4e7'
              : theme === 'dark'
                ? '#3f3f46'
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

            ctx.globalAlpha = highlighted ? 1.0 : 0.3;

            ctx.fillStyle = getNodeColor(graphNode);
            ctx.beginPath();
            ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false);
            ctx.fill();

            if (isMainHighlight) {
              ctx.strokeStyle = getNodeColor(graphNode);
              ctx.lineWidth = 2;
              ctx.beginPath();
              ctx.arc(node.x, node.y, size + 3, 0, 2 * Math.PI, false);
              ctx.stroke();
            }

            if (globalScale > 1.5) {
              ctx.strokeStyle = theme === 'dark' ? 'rgba(10, 10, 10, 0.9)' : 'rgba(250, 250, 250, 0.9)';
              ctx.lineWidth = 2;
              ctx.lineJoin = 'round';
              ctx.miterLimit = 2;
              ctx.strokeText(label, node.x, node.y + size + fontSize);

              ctx.fillStyle = getNodeLabelColor(graphNode);
              ctx.fillText(label, node.x, node.y + size + fontSize);
            }

            ctx.globalAlpha = 1.0;
          }}
        />

        {/* Recenter button */}
        {hasUserMoved && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleRecenter}
                  className="absolute bottom-4 right-4 p-2.5 rounded-lg bg-background/60 hover:bg-background border shadow-md transition-all duration-200"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Recenter and fit graph to view</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
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
