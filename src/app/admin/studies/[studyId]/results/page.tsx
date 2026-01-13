'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft,
  Download, 
  Loader2,
  AlertCircle,
  RefreshCw 
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  SimilarityMatrixView,
  DendrogramView,
  CardSummaryView,
  InsightsPanel,
  StatsOverview,
} from '@/components/results';

// Import analysis functions for client-side computation
import { computeHierarchicalClustering } from '@/lib/analysis';

type TabId = 'overview' | 'similarity' | 'clusters' | 'cards';

interface Tab {
  id: TabId;
  label: string;
  description: string;
}

const TABS: Tab[] = [
  { id: 'overview', label: 'Overview', description: 'Summary and insights' },
  { id: 'similarity', label: 'Similarity Matrix', description: 'Card pair relationships' },
  { id: 'clusters', label: 'Clusters', description: 'Hierarchical groupings' },
  { id: 'cards', label: 'Card Summary', description: 'Per-card analysis' },
];

interface ResultsData {
  studyId: string;
  studyName: string;
  mode: string;
  analyzedAt: number;
  participantCount: number;
  totalSessions: number;
  completionRate: number;
  averageDuration: number;
  cards: Array<{ id: string; label: string; description?: string }>;
  similarityMatrix: {
    cardIds: string[];
    cardLabels: string[];
    matrix: number[][];
    participantCount: number;
  };
  cardSummaries: Array<{
    cardId: string;
    cardLabel: string;
    placements: Array<{ categoryName: string; count: number; percentage: number }>;
    agreementScore: number;
    primaryCategory: string;
  }>;
  insights: Array<{
    type: string;
    message: string;
    confidence: number;
  }>;
}

export default function StudyResultsPage({ params }: { params: Promise<{ studyId: string }> }) {
  const resolvedParams = use(params);
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ResultsData | null>(null);

  const fetchResults = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/studies/${resolvedParams.studyId}/results`);
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please sign in to view results');
        }
        if (response.status === 404) {
          throw new Error('Study not found');
        }
        throw new Error('Failed to load results');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchResults();
  }, [resolvedParams.studyId]);

  // Export functionality
  const handleExport = () => {
    if (!results) return;
    
    const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `card-sorting-results-${results.studyId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compute cluster analysis on client (if we have similarity matrix)
  const clusterAnalysis = results?.similarityMatrix 
    ? computeHierarchicalClustering(results.similarityMatrix)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-foreground">Analyzing results...</p>
          <p className="text-sm text-muted-foreground">Computing similarity matrix and clusters</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">Unable to load results</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={fetchResults} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  if (!results) {
    return null;
  }

  // Check if we have enough data
  if (results.participantCount === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href={`/admin/studies/${resolvedParams.studyId}`}>
            <Button variant="ghost" size="icon" aria-label="Back to study">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{results.studyName}</h1>
            <p className="text-muted-foreground">Results</p>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-muted-foreground/25 p-12 text-center">
          <AlertCircle className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h2 className="text-xl font-semibold text-foreground mb-2">No responses yet</h2>
          <p className="text-muted-foreground max-w-md">
            Share your study link with participants to start collecting responses. 
            Results will appear here once participants complete the sorting activity.
          </p>
        </div>
      </div>
    );
  }

  // Format results for components
  const analysisResults = {
    studyId: results.studyId,
    studyName: results.studyName,
    analyzedAt: results.analyzedAt,
    participantCount: results.participantCount,
    completionRate: results.completionRate,
    averageDuration: results.averageDuration,
    similarityMatrix: results.similarityMatrix,
    clusterAnalysis: clusterAnalysis!,
    categoryAnalysis: { standardizedCategories: [] },
    cardSummaries: results.cardSummaries,
    insights: results.insights as Array<{
      type: 'strong_cluster' | 'ambiguous_card' | 'category_confusion' | 'consensus';
      message: string;
      relatedCards?: string[];
      confidence: number;
    }>,
  };

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href={`/admin/studies/${resolvedParams.studyId}`}>
              <Button variant="ghost" size="icon" aria-label="Back to study">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{results.studyName}</h1>
              <p className="text-muted-foreground">
                {results.participantCount} completed responses
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={fetchResults} className="gap-2">
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </Button>
              </TooltipTrigger>
              <TooltipContent>Reload results</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="sm" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download as JSON</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-border">
          <div 
            className="flex overflow-x-auto -mb-px"
            role="tablist"
            aria-label="Results sections"
          >
            {TABS.map((tab) => (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                aria-controls={`tabpanel-${tab.id}`}
                id={`tab-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  activeTab === tab.id
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div
          role="tabpanel"
          id="tabpanel-overview"
          aria-labelledby="tab-overview"
          hidden={activeTab !== 'overview'}
        >
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <StatsOverview results={analysisResults} />
              <InsightsPanel insights={analysisResults.insights} />
              
              <div className="grid gap-4 md:grid-cols-3">
                {TABS.filter(t => t.id !== 'overview').map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'rounded-xl border border-border bg-card p-6 text-left transition-all',
                      'hover:border-primary/50 hover:shadow-md',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
                    )}
                  >
                    <h3 className="font-semibold text-foreground mb-1">{tab.label}</h3>
                    <p className="text-sm text-muted-foreground">{tab.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-similarity"
          aria-labelledby="tab-similarity"
          hidden={activeTab !== 'similarity'}
        >
          {activeTab === 'similarity' && (
            <SimilarityMatrixView data={results.similarityMatrix} />
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-clusters"
          aria-labelledby="tab-clusters"
          hidden={activeTab !== 'clusters'}
        >
          {activeTab === 'clusters' && clusterAnalysis && (
            <DendrogramView data={clusterAnalysis} />
          )}
        </div>

        <div
          role="tabpanel"
          id="tabpanel-cards"
          aria-labelledby="tab-cards"
          hidden={activeTab !== 'cards'}
        >
          {activeTab === 'cards' && (
            <CardSummaryView data={results.cardSummaries} />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
