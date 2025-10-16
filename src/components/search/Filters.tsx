'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES, type CatKey } from '@/lib/categories';
import { FaShoppingCart, FaUtensils, FaStore, FaStar, FaEllipsisH, FaCog, FaHospital, FaBus, FaHotel, FaUniversity, FaChurch } from 'react-icons/fa';

export type Selection = { parent: CatKey; subKey: string };

const MAIN_CATEGORIES = ['essentials', 'food_drink', 'shopping', 'things_to_do'];
const ICONS: Record<string, any> = {
  essentials: FaShoppingCart,
  food_drink: FaUtensils,
  shopping: FaStore,
  things_to_do: FaStar,
  services: FaCog,
  health: FaHospital,
  transport: FaBus,
  lodging: FaHotel,
  education: FaUniversity,
  government: FaCog,
  worship: FaChurch,
};

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

  const mainCats = CATEGORIES.filter((c) => MAIN_CATEGORIES.includes(c.key));
  const moreCats = CATEGORIES.filter((c) => !MAIN_CATEGORIES.includes(c.key));
  const selectedMore = selections.filter((s) => !MAIN_CATEGORIES.includes(s.parent));

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
    <div className="space-y-2">
      {/* Main category chips */}
      <div className="flex flex-wrap gap-2 items-center">
        {mainCats.map((c) => {
          const Icon = ICONS[c.key] || FaStar;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => handleParentClick(c.key)}
              className={`h-8 px-3 rounded-full border flex items-center gap-2 text-sm transition ${c.key === parent ? 'bg-foreground text-background' : 'bg-background'}`}
            >
              <Icon className="w-4 h-4" />
              {c.label}
            </button>
          );
        })}
        {/* More button */}
        <button
          type="button"
          onClick={() => setShowMore(true)}
          className="h-8 px-3 rounded-full border flex items-center gap-2 text-sm bg-background"
        >
          <FaEllipsisH className="w-4 h-4" /> More
        </button>
        {/* Show summary chips for selected more categories */}
        {selectedMore.length > 0 && (
          <span className="ml-2 flex gap-1">
            {[...new Set(selectedMore.map((s) => s.parent))].map((catKey) => {
              const cat = moreCats.find((c) => c.key === catKey);
              const Icon = ICONS[catKey] || FaStar;
              const count = selectedMore.filter((s) => s.parent === catKey).length;
              return (
                <span key={catKey} className="inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs bg-background">
                  <Icon className="w-3 h-3" /> {cat?.label} ({count})
                </span>
              );
            })}
          </span>
        )}
      </div>

      {/* Sub chips for current parent (only show if parent is selected) */}
      {parent && current && (
        <div className="flex flex-wrap gap-1 mt-1">
          {current.subs.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => toggleSub(current.key, s.key)}
              className={`h-7 px-2 rounded-full border text-xs transition ${isSelected(current.key, s.key) ? 'bg-foreground text-background' : 'bg-background'}`}
            >
              {s.label}
            </button>
          ))}
        </div>
      )}

      {/* Selected tokens */}
      {selectedTokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {selectedTokens.map((t) => (
            <span
              key={`${t.parent}:${t.subKey}`}
              className="inline-flex items-center gap-1 h-7 px-2 rounded-full border bg-background text-xs"
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
            className="ml-2 h-7 px-2 rounded-full border bg-background text-xs"
          >
            Clear all
          </button>
        </div>
      )}

      {/* More modal */}
      {showMore && (
  <div className="fixed inset-0 z-50 flex items-center justify-center" style={{background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)'}}>
          <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[400px] max-w-[600px] w-full">
            <div className="mb-4 font-semibold text-lg flex items-center gap-2"><FaEllipsisH /> More Categories</div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {moreCats.map((c) => {
                const Icon = ICONS[c.key] || FaStar;
                const selected = selections.some((s) => s.parent === c.key);
                return (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => {
                      // Toggle selection for multi-select
                      const already = selections.some((s) => s.parent === c.key);
                      if (already) {
                        onChange(selections.filter((s) => s.parent !== c.key));
                      } else {
                        onChange([...selections, { parent: c.key, subKey: '' }]);
                      }
                    }}
                    className={`h-10 px-4 rounded-full border flex items-center gap-2 text-base transition ${selected ? 'bg-foreground text-background' : 'bg-background'}`}
                  >
                    <Icon className="w-5 h-5" /> {c.label}
                  </button>
                );
              })}
            </div>
            {/* Subcategories for selected more categories (unique parents only) */}
            {[...new Set(selections.filter((s) => moreCats.some((c) => c.key === s.parent)).map((s) => s.parent))].map((parentKey) => {
              const cat = moreCats.find((c) => c.key === parentKey);
              if (!cat) return null;
              return (
                <div key={`subcats-${parentKey}`} className="mb-2">
                  <div className="font-medium text-sm mb-1 flex items-center gap-1">
                    {(ICONS[cat.key] || FaStar)({ className: 'w-4 h-4' })} {cat.label} Subcategories
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {cat.subs.map((sub) => {
                      const isSelected = selections.some((s) => s.parent === cat.key && s.subKey === sub.key);
                      return (
                        <button
                          key={`${cat.key}-${sub.key}`}
                          type="button"
                          onClick={() => {
                            // Toggle subcategory selection
                            const keepOthers = selections.filter((s) => !(s.parent === cat.key && s.subKey === sub.key));
                            if (isSelected) {
                              onChange(keepOthers);
                            } else {
                              onChange([...keepOthers, { parent: cat.key, subKey: sub.key }]);
                            }
                          }}
                          className={`h-7 px-2 rounded-full border text-xs transition ${isSelected ? 'bg-foreground text-background' : 'bg-background'}`}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="px-4 py-2 rounded border text-base" onClick={() => setShowMore(false)}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
