'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  BarChart3, 
  Download, 
  Moon, 
  Sun, 
  ArrowLeft,
  Loader2 
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { AnalysisResults } from '@/types/results';
import { runFullAnalysis } from '@/lib/analysis';
import { MOCK_STUDY, MOCK_SESSIONS } from '@/data/mock-results';
import { SAMPLE_CARDS } from '@/types';
import {
  SimilarityMatrixView,
  DendrogramView,
  CardSummaryView,
  InsightsPanel,
  StatsOverview,
} from '@/components/results';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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

export default function ResultsPage() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState<AnalysisResults | null>(null);

  // Run analysis on mount
  useEffect(() => {
    const analyze = async () => {
      setIsLoading(true);
      // Simulate network delay for realistic feel
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const analysisResults = runFullAnalysis(
        MOCK_STUDY.id,
        MOCK_STUDY.name,
        MOCK_SESSIONS,
        SAMPLE_CARDS
      );
      setResults(analysisResults);
      setIsLoading(false);
    };
    
    analyze();
  }, []);

  // Dark mode toggle
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Export functionality
  const handleExport = () => {
    if (!results) return;
    
    const exportData = {
      version: '1.0',
      exportedAt: Date.now(),
      study: MOCK_STUDY,
      sessions: MOCK_SESSIONS,
      analysis: results,
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `card-sorting-results-${MOCK_STUDY.id}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-lg text-foreground">Analyzing results...</p>
          <p className="text-sm text-muted-foreground">Computing similarity matrix and clusters</p>
        </div>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-foreground">No results available</p>
          <Link href="/">
            <Button className="mt-4">Go to Card Sorting</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Link href="/">
                  <Button variant="ghost" size="icon" aria-label="Back to card sorting">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                </Link>
                <div>
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-primary" aria-hidden="true" />
                    <h1 className="text-xl font-bold text-foreground">Results Dashboard</h1>
                  </div>
                  <p className="text-sm text-muted-foreground">{MOCK_STUDY.name}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Dark mode toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setIsDarkMode(!isDarkMode)}
                      aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
                    >
                      {isDarkMode ? (
                        <Sun className="h-4 w-4" />
                      ) : (
                        <Moon className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {isDarkMode ? 'Light mode' : 'Dark mode'}
                  </TooltipContent>
                </Tooltip>

                {/* Export button */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                      className="gap-2"
                      aria-label="Export results as JSON"
                    >
                      <Download className="h-4 w-4" />
                      <span className="hidden sm:inline">Export</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Download results as JSON</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </header>

        {/* Tab Navigation */}
        <nav className="border-b border-border bg-muted/30">
          <div className="container mx-auto px-4">
            <div 
              className="flex overflow-x-auto"
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
        </nav>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          {/* Overview Tab */}
          <div
            role="tabpanel"
            id="tabpanel-overview"
            aria-labelledby="tab-overview"
            hidden={activeTab !== 'overview'}
          >
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Stats */}
                <section aria-labelledby="stats-heading">
                  <h2 id="stats-heading" className="sr-only">Study Statistics</h2>
                  <StatsOverview results={results} />
                </section>

                {/* Insights */}
                <section aria-labelledby="insights-heading">
                  <h2 id="insights-heading" className="sr-only">Key Insights</h2>
                  <InsightsPanel insights={results.insights} />
                </section>

                {/* Quick access to other sections */}
                <section aria-labelledby="sections-heading">
                  <h2 id="sections-heading" className="text-lg font-semibold text-foreground mb-4">
                    Analysis Sections
                  </h2>
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
                </section>
              </div>
            )}
          </div>

          {/* Similarity Matrix Tab */}
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

          {/* Clusters Tab */}
          <div
            role="tabpanel"
            id="tabpanel-clusters"
            aria-labelledby="tab-clusters"
            hidden={activeTab !== 'clusters'}
          >
            {activeTab === 'clusters' && (
              <DendrogramView data={results.clusterAnalysis} />
            )}
          </div>

          {/* Cards Tab */}
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
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-12">
          <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
            <p>
              Analysis performed on {new Date(results.analyzedAt).toLocaleString()} • 
              {results.participantCount} participants analyzed
            </p>
          </div>
        </footer>
      </div>
    </TooltipProvider>
  );
}
