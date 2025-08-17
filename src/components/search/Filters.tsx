'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES, type CatKey } from '@/lib/categories';

export type Selection = { parent: CatKey; subKey: string }; // 'all' means the parent's All

const QUICK_PARENTS: CatKey[] = [
  'groceries',
  'restaurants',
  'financial',
  'medical',
  'shopping',
  'nature',
  'lodging',
  'transport',
];

const MAX_SELECTIONS = 3;

export default function Filters({
  selections,
  onChange,
}: {
  selections: Selection[];
  onChange: (next: Selection[]) => void;
}) {
  const [showMore, setShowMore] = useState(false);
  const [activeParent, setActiveParent] = useState<CatKey | null>(null);

  const selectedMap = useMemo(() => {
    const m = new Map<CatKey, string>();
    selections.forEach((s) => m.set(s.parent, s.subKey));
    return m;
  }, [selections]);

  function toggleParentAll(parent: CatKey) {
    const has = selectedMap.has(parent);
    if (has) {
      onChange(selections.filter((s) => s.parent !== parent));
    } else {
      if (selections.length >= MAX_SELECTIONS) return; // cap
      onChange([...selections, { parent, subKey: 'all' }]);
      setActiveParent(parent);
    }
  }

  function setSub(parent: CatKey, subKey: string) {
    // ensure the parent exists; if not, add (respect cap)
    const exists = selections.find((s) => s.parent === parent);
    if (!exists) {
      if (selections.length >= MAX_SELECTIONS) return;
      onChange([...selections, { parent, subKey }]);
      return;
    }
    onChange(
      selections.map((s) => (s.parent === parent ? { parent, subKey } : s))
    );
  }

  function removeSelection(parent: CatKey) {
    onChange(selections.filter((s) => s.parent !== parent));
  }

  // UI helpers
  const activeCategory = activeParent
    ? CATEGORIES.find((c) => c.key === activeParent)
    : null;

  return (
    <div className="space-y-3">
      {/* Selected tokens */}
      <div className="flex flex-wrap gap-2">
        {selections.map((s) => {
          const cat = CATEGORIES.find((c) => c.key === s.parent)!;
          const sub = cat.subs.find((x) => x.key === s.subKey);
          const label = sub ? `${sub.label}` : 'All';
        return (
            <span
              key={`${s.parent}:${s.subKey}`}
              className="inline-flex items-center gap-2 text-sm px-2.5 py-1 rounded-full border"
            >
              {cat.label}: {label}
              <button
                type="button"
                aria-label="Remove"
                className="opacity-70 hover:opacity-100"
                onClick={() => removeSelection(s.parent)}
              >
                ×
              </button>
            </span>
          );
        })}
        {/* Selection cap hint */}
        {selections.length >= MAX_SELECTIONS && (
          <span className="text-xs opacity-70">
            (Max {MAX_SELECTIONS} filters)
          </span>
        )}
      </div>

      {/* Quick parent chips + More */}
      <div className="flex flex-wrap gap-2 items-center">
        {QUICK_PARENTS.map((k) => {
          const cat = CATEGORIES.find((c) => c.key === k)!;
          const isOn = selectedMap.has(k);
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                toggleParentAll(k);
                setActiveParent(k);
              }}
              className={`h-9 px-3 rounded-full border ${
                isOn ? 'bg-foreground text-background' : 'bg-background'
              }`}
            >
              {cat.label}
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="h-9 px-3 rounded-full border bg-background"
        >
          More{selections.length ? ` (${selections.length})` : ''}
        </button>
      </div>

      {/* Subchips – only when a parent is active */}
      {activeCategory && (
        <div className="flex flex-wrap gap-2">
          {activeCategory.subs.map((s) => {
            const isSel = selectedMap.get(activeCategory.key) === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSub(activeCategory.key, s.key)}
                className={`h-8 px-3 rounded-full border ${
                  isSel ? 'bg-foreground text-background' : 'bg-background'
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Drawer (simple overlay panel) */}
      {showMore && (
        <div
          className="fixed inset-0 z-50"
          aria-modal="true"
          role="dialog"
          onClick={() => setShowMore(false)}
        >
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute right-0 top-0 h-full w-[min(420px,90vw)] bg-background shadow-xl p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-medium">Choose categories</h3>
              <button
                className="h-8 w-8 rounded-md border"
                onClick={() => setShowMore(false)}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              {CATEGORIES.map((cat) => {
                const isQuick = QUICK_PARENTS.includes(cat.key);
                return (
                  <div key={cat.key} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{cat.label}</div>
                      <label className="text-sm flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedMap.has(cat.key)}
                          onChange={() => toggleParentAll(cat.key)}
                        />
                        <span>All</span>
                      </label>
                    </div>

                    {/* Show subs only if this parent is selected */}
                    {selectedMap.has(cat.key) && (
                      <div className="flex flex-wrap gap-2">
                        {cat.subs.map((s) => {
                          const on = selectedMap.get(cat.key) === s.key;
                          return (
                            <button
                              key={s.key}
                              type="button"
                              className={`h-8 px-3 rounded-full border ${
                                on
                                  ? 'bg-foreground text-background'
                                  : 'bg-background'
                              }`}
                              onClick={() => setSub(cat.key, s.key)}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-6 text-sm opacity-70">
              You can pick up to {MAX_SELECTIONS} filters. Close to apply.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

