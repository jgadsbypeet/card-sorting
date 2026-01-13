'use client';

import React from 'react';
import { Users, Clock, CheckCircle, BarChart3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AnalysisResults } from '@/types/results';

interface StatsOverviewProps {
  results: AnalysisResults;
}

/**
 * Stats Overview Cards
 * 
 * Displays key metrics from the card sorting study.
 */
export const StatsOverview: React.FC<StatsOverviewProps> = ({ results }) => {
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    if (minutes === 0) return `${seconds}s`;
    return `${minutes}m ${seconds}s`;
  };

  const stats = [
    {
      label: 'Participants',
      value: results.participantCount,
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-500/10',
    },
    {
      label: 'Completion Rate',
      value: `${Math.round(results.completionRate * 100)}%`,
      icon: CheckCircle,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgColor: 'bg-emerald-500/10',
    },
    {
      label: 'Avg. Duration',
      value: formatDuration(results.averageDuration),
      icon: Clock,
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-500/10',
    },
    {
      label: 'Cards Analyzed',
      value: results.similarityMatrix.cardIds.length,
      icon: BarChart3,
      color: 'text-purple-600 dark:text-purple-400',
      bgColor: 'bg-purple-500/10',
    },
  ];

  return (
    <div 
      className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      role="list"
      aria-label="Study statistics"
    >
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="rounded-xl border border-border bg-card p-4"
          role="listitem"
        >
          <div className="flex items-center gap-3">
            <div className={cn('rounded-lg p-2', stat.bgColor)}>
              <stat.icon className={cn('h-5 w-5', stat.color)} aria-hidden="true" />
            </div>
            <div>
              <p className="text-2xl font-bold text-foreground" aria-label={`${stat.label}: ${stat.value}`}>
                {stat.value}
              </p>
              <p className="text-sm text-muted-foreground">
                {stat.label}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
