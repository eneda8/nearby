'use client';

import { useMemo, useState } from 'react';
import { CATEGORIES, type CatKey } from '@/lib/categories';
import { FaShoppingCart, FaUtensils, FaStore, FaStar, FaCog, FaHospital, FaBus, FaHotel, FaUniversity, FaChurch } from 'react-icons/fa';

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
  onClearAll,
}: {
  selections: Selection[];
  onChange: (next: Selection[]) => void;
  onClearAll?: () => void;
}) {
  const [openDropdown, setOpenDropdown] = useState<CatKey | null>(null);

  const mainCats = useMemo(
    () => CATEGORIES.filter((c) => MAIN_CATEGORIES.includes(c.key)),
    []
  );

  const selectionsByCat = useMemo(() => {
    return new Map<CatKey, string[]>(
      mainCats.map((cat) => [
        cat.key as CatKey,
        selections.filter((sel) => sel.parent === cat.key).map((sel) => sel.subKey),
      ])
    );
  }, [selections, mainCats]);

  function toggleOption(parentKey: CatKey, subKey: string) {
    const existing = selections.some((s) => s.parent === parentKey && s.subKey === subKey);
    if (existing) {
      onChange(selections.filter((s) => !(s.parent === parentKey && s.subKey === subKey)));
    } else {
      onChange([...selections, { parent: parentKey, subKey }]);
    }
  }

  function removeSelection(sel: Selection) {
    onChange(selections.filter((s) => !(s.parent === sel.parent && s.subKey === sel.subKey)));
  }

  function clearAll() {
    onChange([]);
    setOpenDropdown(null);
    onClearAll?.();
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
    <div className="space-y-1.5">
      {/* Dropdown row */}
      <div className="flex flex-wrap gap-1.5">
        {mainCats.map((cat) => {
          const Icon = ICONS[cat.key] || FaStar;
          const selectedForCat = selectionsByCat.get(cat.key as CatKey) ?? [];
          const active = openDropdown === cat.key;
          return (
            <div key={cat.key} className="relative">
              <button
                type="button"
                onClick={() => setOpenDropdown((prev) => (prev === cat.key ? null : cat.key))}
                className={`h-7 px-2.5 rounded-md border flex items-center gap-1 text-xs bg-background transition ${
                  active ? 'ring-1 ring-foreground/40' : ''
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {cat.label}
                <svg
                  className="w-3 h-3 text-gray-500"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 01.02-1.06z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
              {active && (
                <div className="absolute z-30 mt-1 w-56 rounded-md border bg-white shadow-lg p-2 space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-medium text-gray-600 pb-1 border-b">
                    <span>Select {cat.label}</span>
                    <button
                      type="button"
                      className="text-blue-600 hover:underline"
                      onClick={() => {
                        const filtered = selections.filter((s) => s.parent !== cat.key);
                        onChange(filtered);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="max-h-52 overflow-y-auto space-y-1">
                    {cat.subs.map((sub) => {
                      const checked = selectedForCat.includes(sub.key);
                      return (
                        <label
                          key={sub.key}
                          className="flex items-center gap-2 text-[11px] cursor-pointer px-1 py-1 rounded hover:bg-gray-100"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOption(cat.key as CatKey, sub.key)}
                            className="h-3.5 w-3.5 accent-foreground"
                          />
                          <span className="truncate">{sub.label}</span>
                        </label>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(null)}
                    className="mt-2 w-full h-7 rounded-md border text-[11px] bg-background hover:bg-gray-100"
                  >
                    Done
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected tokens */}
      {selectedTokens.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {selectedTokens.map((t) => (
            <span
              key={`${t.parent}:${t.subKey}`}
              className="inline-flex items-center gap-1 h-6 px-1.5 rounded-full border bg-background text-[11px]"
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
            className="ml-2 h-6 px-1.5 rounded-full border bg-background text-[11px]"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}

/*
// Legacy "More" modal for secondary categories (disabled for now).
// Restore by re-introducing supporting state (parent/showMore/toggleSub) and rendering this block.
{showMore && (
  <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(8px)' }}>
    <div className="bg-white rounded-2xl shadow-2xl p-8 min-w-[400px] max-w-[600px] w-full">
      <div className="mb-4 font-semibold text-lg flex items-center gap-2">{<FaEllipsisH />} More Categories</div>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {moreCats.map((c) => {
          const Icon = ICONS[c.key] || FaStar;
          const selected = selections.some((s) => s.parent === c.key);
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => {
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
      <div className="flex justify-end gap-2 mt-4">
        <button type="button" className="px-4 py-2 rounded border text-base" onClick={() => setShowMore(false)}>Done</button>
      </div>
    </div>
  </div>
)}
*/
