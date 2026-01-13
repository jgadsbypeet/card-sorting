'use client';

import React, { useEffect, useRef } from 'react';
import { useCardSortStore } from '@/store/card-sort-store';

/**
 * AccessibilityAnnouncer
 * 
 * This component creates an ARIA live region that announces changes
 * to screen reader users. It's essential for accessibility because
 * screen readers cannot "see" visual changes like drag operations.
 */
export const AccessibilityAnnouncer: React.FC = () => {
  const { lastAnnouncement } = useCardSortStore();
  const announcerRef = useRef<HTMLDivElement>(null);
  const previousAnnouncement = useRef<string>('');

  useEffect(() => {
    // Only announce if there's a new announcement
    if (lastAnnouncement && lastAnnouncement !== previousAnnouncement.current) {
      previousAnnouncement.current = lastAnnouncement;
      
      // Force the announcement by clearing and re-adding
      if (announcerRef.current) {
        announcerRef.current.textContent = '';
        // Small delay to ensure screen readers pick up the change
        requestAnimationFrame(() => {
          if (announcerRef.current) {
            announcerRef.current.textContent = lastAnnouncement;
          }
        });
      }
    }
  }, [lastAnnouncement]);

  return (
    <>
      {/* Polite announcements for general updates */}
      <div
        ref={announcerRef}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
      
      {/* Assertive announcements for critical updates */}
      <div
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        className="sr-only"
        id="card-sort-alert"
      />
    </>
  );
};
