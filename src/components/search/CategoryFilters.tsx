'use client';

import { useState } from 'react';
import { CATEGORIES, type CatKey } from '@/lib/categories';

const VISIBLE_PARENTS = 8;

export default function CategoryFilters({
  parent,
  sub,
  onParent,
  onSub,
}: {
  parent: CatKey;
  sub: string;
  onParent: (k: CatKey) => void;
  onSub: (subKey: string) => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const current = CATEGORIES.find((c) => c.key === parent) ?? CATEGORIES[0];

  const parents = showMore ? CATEGORIES : CATEGORIES.slice(0, VISIBLE_PARENTS);

  return (
    <div className="space-y-2">
      {/* parent row */}
      <div className="flex flex-wrap gap-2 items-center">
        {parents.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => onParent(c.key)}
            className={`h-9 px-3 rounded-full border ${c.key === parent ? 'bg-foreground text-background' : 'bg-background'}`}
          >
            {c.label}
          </button>
        ))}
        {CATEGORIES.length > VISIBLE_PARENTS && (
          <button
            type="button"
            className="h-9 px-3 rounded-full border bg-background"
            onClick={() => setShowMore((s) => !s)}
          >
            {showMore ? 'Less' : 'More'}
          </button>
        )}
      </div>

      {/* sub row */}
      <div className="flex flex-wrap gap-2">
        {current.subs.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onSub(s.key)}
            className={`h-8 px-3 rounded-full border ${s.key === sub ? 'bg-foreground text-background' : 'bg-background'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}