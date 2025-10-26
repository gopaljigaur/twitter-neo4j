'use client';

import { useState } from 'react';
import {
  Sparkles,
  Code,
  Loader2,
  AlertCircle,
  Eye,
  ExternalLink,
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription } from './ui/alert';
import { Filters } from '@/types';

const EXAMPLE_QUERIES = [
  'Find the top 10 users with the most followers',
  'Show me tweets about AI or machine learning',
  'Which users tweet most about Neo4j?',
  'Find the most popular hashtags',
  'Show users who are mentioned together frequently',
  'Find influential users with under 10k followers',
];

interface QueryResult {
  success: boolean;
  query?: string;
  results?: any[];
  resultCount?: number;
  error?: string;
  details?: string;
  generatedQuery?: string;
}

interface NaturalLanguageQueryProps {
  onUserClick?: (username: string) => void;
  onHashtagClick?: (hashtag: string) => void;
  onViewInGraph?: (filters: Partial<Filters>) => void;
}

type ColumnType = 'user' | 'hashtag' | 'tweet' | 'regular';

export default function NaturalLanguageQuery({
  onUserClick,
  onHashtagClick,
  onViewInGraph,
}: NaturalLanguageQueryProps) {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<QueryResult | null>(null);
  const [showCypher, setShowCypher] = useState(false);

  const handleSubmit = async () => {
    if (!query.trim()) return;

    setIsLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/nl-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await response.json();
      setResult(data);
      if (data.query) {
        setShowCypher(true);
      }
    } catch (error: any) {
      setResult({
        success: false,
        error: 'Failed to process query',
        details: error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (example: string) => {
    setQuery(example);
    setResult(null);
  };

  // Detect column type based on column name
  const detectColumnType = (columnName: string): ColumnType => {
    const lower = columnName.toLowerCase();
    if (
      lower.includes('screen_name') ||
      lower.includes('username') ||
      lower === 'user'
    ) {
      return 'user';
    }
    if (lower.includes('hashtag') || lower.includes('tag')) {
      return 'hashtag';
    }
    if (lower.includes('tweet') || lower.includes('text')) {
      return 'tweet';
    }
    return 'regular';
  };

  // Handle cell click based on type
  const handleCellClick = (value: any, columnType: ColumnType) => {
    if (!value || typeof value !== 'string') return;

    switch (columnType) {
      case 'user':
        onUserClick?.(value);
        break;
      case 'hashtag':
        // Remove # if present
        const cleanHashtag = value.replace(/^#/, '');
        onHashtagClick?.(cleanHashtag);
        break;
    }
  };

  // Render cell value with appropriate styling and click handler
  const renderCell = (value: any, columnType: ColumnType) => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }

    const stringValue =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    const isClickable = columnType === 'user' || columnType === 'hashtag';

    if (isClickable) {
      return (
        <button
          onClick={() => handleCellClick(value, columnType)}
          className="text-blue-500 hover:text-blue-700 hover:underline font-medium text-left"
        >
          {stringValue}
        </button>
      );
    }

    return <span>{stringValue}</span>;
  };

  // Extract row data for "View in Graph" functionality
  const getViewInGraphFilters = (row: any): Partial<Filters> => {
    const filters: Partial<Filters> = {};

    // Check for user-related columns
    const userColumn = Object.keys(row).find(
      (key) =>
        key.toLowerCase().includes('screen_name') ||
        key.toLowerCase().includes('username') ||
        key.toLowerCase() === 'user'
    );

    if (userColumn && row[userColumn]) {
      filters.users = [String(row[userColumn])];
    }

    // Check for hashtag-related columns
    const hashtagColumn = Object.keys(row).find(
      (key) =>
        key.toLowerCase().includes('hashtag') ||
        key.toLowerCase().includes('tag')
    );

    if (hashtagColumn && row[hashtagColumn]) {
      const hashtag = String(row[hashtagColumn]).replace(/^#/, '');
      filters.hashtags = [hashtag];
    }

    return filters;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-500" />
          AI Natural Language Query
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          Ask questions in plain English and get insights from the graph
          database
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Example Queries */}
        <div>
          <p className="text-sm font-medium mb-2">Try these examples:</p>
          <div className="flex flex-wrap gap-2">
            {EXAMPLE_QUERIES.map((example, idx) => (
              <button
                key={idx}
                onClick={() => handleExampleClick(example)}
                className="text-xs px-3 py-1.5 rounded-full border hover:bg-muted transition-colors"
              >
                {example}
              </button>
            ))}
          </div>
        </div>

        {/* Query Input */}
        <div>
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about the Twitter data... (e.g., 'Show me influential users in the AI community')"
            className="min-h-[100px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                handleSubmit();
              }
            }}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Press Ctrl+Enter or Cmd+Enter to submit
          </p>
        </div>

        <Button
          onClick={handleSubmit}
          disabled={isLoading || !query.trim()}
          className="w-full"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generating Query...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Ask AI
            </>
          )}
        </Button>

        {/* Results */}
        {result && (
          <div className="space-y-3 pt-4 border-t">
            {/* Error Display */}
            {result.error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="font-medium">{result.error}</div>
                  {result.details && (
                    <div className="text-sm mt-1">{result.details}</div>
                  )}
                  {result.generatedQuery && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm">
                        Show generated query
                      </summary>
                      <pre className="mt-2 p-2 bg-background rounded text-xs overflow-x-auto">
                        {result.generatedQuery}
                      </pre>
                    </details>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {/* Success Display */}
            {result.success && (
              <>
                {/* Generated Cypher Query */}
                {result.query && (
                  <div>
                    <button
                      onClick={() => setShowCypher(!showCypher)}
                      className="flex items-center gap-2 text-sm font-medium mb-2 hover:text-primary"
                    >
                      <Code className="w-4 h-4" />
                      {showCypher ? 'Hide' : 'Show'} Generated Cypher Query
                    </button>
                    {showCypher && (
                      <pre className="p-3 bg-muted rounded text-xs overflow-x-auto">
                        {result.query}
                      </pre>
                    )}
                  </div>
                )}

                {/* Results Count */}
                <div className="text-sm font-medium">
                  Found {result.resultCount} result
                  {result.resultCount !== 1 ? 's' : ''}
                </div>

                {/* Results Table */}
                {result.results && result.results.length > 0 && (
                  <div className="border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted sticky top-0">
                          <tr>
                            {Object.keys(result.results[0]).map((key) => (
                              <th
                                key={key}
                                className="px-4 py-2 text-left font-medium"
                              >
                                {key}
                              </th>
                            ))}
                            {onViewInGraph && (
                              <th className="px-4 py-2 text-left font-medium sticky top-0 bg-muted">
                                Actions
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {result.results.map((row, idx) => {
                            const columnTypes =
                              Object.keys(row).map(detectColumnType);
                            const viewFilters = getViewInGraphFilters(row);
                            const hasViewableData =
                              Object.keys(viewFilters).length > 0;

                            return (
                              <tr key={idx} className="hover:bg-muted/50">
                                {Object.entries(row).map(
                                  ([key, value], cellIdx) => (
                                    <td key={cellIdx} className="px-4 py-2">
                                      {renderCell(value, columnTypes[cellIdx])}
                                    </td>
                                  )
                                )}
                                {onViewInGraph && (
                                  <td className="px-4 py-2">
                                    {hasViewableData && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          onViewInGraph(viewFilters)
                                        }
                                        className="h-7 gap-1"
                                      >
                                        <Eye className="w-3 h-3" />
                                        View
                                      </Button>
                                    )}
                                  </td>
                                )}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {result.results && result.results.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No results found for this query
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
