'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES, type CatKey } from '@/lib/categories';

export type Selection = { parent: CatKey; subKey: string };

const VISIBLE_PARENTS = 4;

export default function Filters({
  selections,
  onChange,
}: {
  selections: Selection[];
  onChange: (next: Selection[]) => void;
}) {
  // No parent selected by default
  const [parent, setParent] = useState<CatKey | null>(null);
  const [showMore, setShowMore] = useState(false);

  const current = useMemo(
    () => (parent ? CATEGORIES.find((c) => c.key === parent) : null),
    [parent]
  );

  const parentList = showMore ? CATEGORIES : CATEGORIES.slice(0, VISIBLE_PARENTS);

  const isSelected = (p: CatKey, subKey: string) =>
    selections.some((s) => s.parent === p && s.subKey === subKey);

  // When changing parent: keep only that parent's selections.
  // If none exist yet, do not auto-select any subcategory.
  function handleParentClick(next: CatKey) {
    if (parent === next) {
      setParent(null);
      onChange([]);
      return;
    }
    setParent(next);
    const forNext = selections.filter((s) => s.parent === next);
    if (forNext.length > 0) {
      if (forNext.length !== selections.length) onChange(forNext);
      return;
    }
    // Do not auto-select any subcategory
    onChange([]);
  }

  function toggleSub(parentKey: CatKey, subKey: string) {
    const keepOthers = selections.filter((s) => s.parent !== parentKey);
    const currentForParent = selections.filter((s) => s.parent === parentKey);

    const already = currentForParent.some((s) => s.subKey === subKey);
    const nextForParent = already
      ? currentForParent.filter((s) => s.subKey !== subKey)
      : [...currentForParent, { parent: parentKey, subKey }];

    onChange([...keepOthers, ...nextForParent]);
  }

  function removeSelection(sel: Selection) {
    onChange(selections.filter((s) => !(s.parent === sel.parent && s.subKey === sel.subKey)));
  }

  function clearAll() {
    onChange([]);
    setParent(null);
  }

  const selectedTokens = useMemo(() => {
    return selections
      .map((s) => {
        const cat = CATEGORIES.find((c) => c.key === s.parent);
        if (!cat) return null;
        const sub = cat.subs.find((x) => x.key === s.subKey);
        const label = sub?.label ?? s.subKey;
        return { ...s, label };
      })
      .filter(Boolean) as Array<Selection & { label: string }>;
  }, [selections]);

  return (
    <div className="space-y-3">
      {/* Parent chips */}
      <div className="flex flex-wrap gap-2 items-center">
        {parentList.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => handleParentClick(c.key)}
            className={`h-10 px-4 rounded-full border transition ${
              c.key === parent ? 'bg-foreground text-background' : 'bg-background'
            }`}
          >
            {c.label}
          </button>
        ))}
        {CATEGORIES.length > VISIBLE_PARENTS && (
          <button
            type="button"
            onClick={() => setShowMore((s) => !s)}
            className="h-10 px-4 rounded-full border bg-background"
          >
            {showMore ? 'Less' : 'More'}
          </button>
        )}
      </div>

      {/* Sub chips for current parent (only show if parent is selected) */}
      {parent && current && (
        <div className="flex flex-wrap gap-2">
          {current.subs.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleSub(current.key, s.key)}
              className={`h-10 px-4 rounded-full border transition ${
                isSelected(current.key, s.key) ? 'bg-foreground text-background' : 'bg-background'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Selected tokens */}
      {selectedTokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm opacity-60 mr-1">SELECTED</span>
          {selectedTokens.map((t) => (
            <span
              key={`${t.parent}:${t.subKey}`}
              className="inline-flex items-center gap-2 h-9 px-3 rounded-full border bg-background"
            >
              {t.label}
              <button
                type="button"
                className="opacity-70 hover:opacity-100"
                onClick={() => removeSelection(t)}
                aria-label={`Remove ${t.label}`}
              >
                ×
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAll}
            className="ml-2 h-9 px-3 rounded-full border bg-background"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Message if nothing is selected */}
      {(!parent || selectedTokens.length === 0) && (
        <div className="text-sm opacity-70 mt-2">
          Select a radius and category to see what's nearby this address.
        </div>
      )}
    </div>
  );
}