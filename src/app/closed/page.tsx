'use client';

import { CardSortInterface } from '@/components/card-sort';
import { SAMPLE_CLOSED_CATEGORIES } from '@/types';

export default function ClosedSortPage() {
  return (
    <main id="main-content">
      <CardSortInterface 
        initialMode="closed" 
        initialCategories={SAMPLE_CLOSED_CATEGORIES}
      />
    </main>
  );
}
