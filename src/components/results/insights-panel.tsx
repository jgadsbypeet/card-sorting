'use client';

import React from 'react';
import { Lightbulb, TrendingUp, AlertCircle, Users, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalysisResults } from '@/types/results';

interface InsightsPanelProps {
  insights: AnalysisResults['insights'];
}

/**
 * Insights Panel
 * 
 * Displays automatically generated insights from the analysis.
 * Each insight is accessible with proper ARIA labels.
 */
export const InsightsPanel: React.FC<InsightsPanelProps> = ({ insights }) => {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'strong_cluster':
        return <TrendingUp className="h-5 w-5" />;
      case 'ambiguous_card':
        return <AlertCircle className="h-5 w-5" />;
      case 'category_confusion':
        return <Users className="h-5 w-5" />;
      case 'consensus':
        return <CheckCircle className="h-5 w-5" />;
      default:
        return <Lightbulb className="h-5 w-5" />;
    }
  };

  const getInsightStyles = (type: string) => {
    switch (type) {
      case 'strong_cluster':
        return {
          bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
          border: 'border-emerald-500/30',
          icon: 'text-emerald-600 dark:text-emerald-400',
        };
      case 'ambiguous_card':
        return {
          bg: 'bg-amber-500/10 dark:bg-amber-500/20',
          border: 'border-amber-500/30',
          icon: 'text-amber-600 dark:text-amber-400',
        };
      case 'category_confusion':
        return {
          bg: 'bg-rose-500/10 dark:bg-rose-500/20',
          border: 'border-rose-500/30',
          icon: 'text-rose-600 dark:text-rose-400',
        };
      case 'consensus':
        return {
          bg: 'bg-blue-500/10 dark:bg-blue-500/20',
          border: 'border-blue-500/30',
          icon: 'text-blue-600 dark:text-blue-400',
        };
      default:
        return {
          bg: 'bg-muted',
          border: 'border-border',
          icon: 'text-muted-foreground',
        };
    }
  };

  const getInsightLabel = (type: string) => {
    switch (type) {
      case 'strong_cluster':
        return 'Strong Relationship';
      case 'ambiguous_card':
        return 'Needs Review';
      case 'category_confusion':
        return 'Category Issue';
      case 'consensus':
        return 'High Agreement';
      default:
        return 'Insight';
    }
  };

  if (insights.length === 0) {
    return (
      <div className="rounded-lg border border-border p-6 text-center">
        <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground">
          No significant insights generated. This may indicate highly consistent sorting patterns.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Lightbulb className="h-5 w-5 text-primary" aria-hidden="true" />
        <h3 className="text-lg font-semibold text-foreground">Key Insights</h3>
      </div>

      <ul 
        className="space-y-3"
        role="list"
        aria-label="Analysis insights"
      >
        {insights.map((insight, i) => {
          const styles = getInsightStyles(insight.type);
          return (
            <li
              key={i}
              className={cn(
                'rounded-lg border p-4',
                styles.bg,
                styles.border
              )}
              role="listitem"
            >
              <div className="flex gap-3">
                <div className={cn('flex-shrink-0 mt-0.5', styles.icon)} aria-hidden="true">
                  {getInsightIcon(insight.type)}
                </div>
                <div className="flex-grow">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={cn('text-sm font-semibold', styles.icon)}>
                      {getInsightLabel(insight.type)}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {Math.round(insight.confidence * 100)}% confidence
                    </span>
                  </div>
                  <p className="text-sm text-foreground">
                    {insight.message}
                  </p>
                  {insight.relatedCards && insight.relatedCards.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Related cards: {insight.relatedCards.length}
                    </p>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};
