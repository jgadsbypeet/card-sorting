'use client';

import { CardSortInterface } from '@/components/card-sort';

export default function Home() {
  return (
    <main id="main-content">
      <CardSortInterface initialMode="open" />
    </main>
  );
}
