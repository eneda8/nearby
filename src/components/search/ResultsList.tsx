'use client';
import { useEffect, KeyboardEvent, MouseEvent } from 'react';
import { FaMapMarkerAlt, FaStar, FaCar, FaWalking, FaThumbtack } from 'react-icons/fa';
import type { PlaceResponseItem } from '@/app/api/places/types/apiTypes';

export type PlaceItem = PlaceResponseItem & {
  driveDurationSec?: number;
  driveDistanceMeters?: number;
  walkDurationSec?: number;
  walkDistanceMeters?: number;
  distanceMeters?: number;
};

function metersToMiles(m: number) { return m / 1609.344; }
function secondsToMin(s: number) { return Math.round(s / 60); }

export default function ResultsList({
  items,
  selectedId,
  onSelect,
  onHover,
  pinnedIds,
  onTogglePin,
}: {
  items: PlaceItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
  pinnedIds?: ReadonlySet<string>;
  onTogglePin?: (place: PlaceItem) => void;
}) {
  useEffect(() => {
    if (!selectedId) return;
    const el = document.getElementById(`place-${selectedId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedId]);

  if (!items?.length) return null;

  return (
    <div className="mt-1 flex flex-col gap-3">
      {items.map((p) => {
        const link =
          p.googleMapsUri ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.address)}`;
        const miles =
          p.distanceMeters ? metersToMiles(p.distanceMeters)
          : p.directDistanceMeters ? metersToMiles(p.directDistanceMeters)
          : undefined;
        const driveMinutes = p.driveDurationSec ? secondsToMin(p.driveDurationSec) : undefined;
        const walkMinutes = p.walkDurationSec ? secondsToMin(p.walkDurationSec) : undefined;
        const active = selectedId === p.id;
        const isPinned = pinnedIds ? pinnedIds.has(p.id) : false;

        const handleActivate = () => onSelect?.(p.id);
        const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleActivate();
          }
        };
        const handlePinToggle = (e: MouseEvent<HTMLButtonElement>) => {
          e.stopPropagation();
          onTogglePin?.(p);
        };
        const pinButtonLabel = isPinned ? 'Unpin place' : 'Pin place';

        return (
          <div
            key={p.id}
            id={`place-${p.id}`}
            role="button"
            tabIndex={0}
            onClick={handleActivate}
            onKeyDown={handleKeyDown}
            onMouseEnter={() => onHover?.(p.id)}
            onMouseLeave={() => onHover?.(null)}
            className={`w-full text-left rounded-2xl border transition focus:outline-none focus:ring-2 focus:ring-slate-900/40 cursor-pointer px-3 py-3 ${
              active
                ? 'border-slate-900/60 bg-white shadow-lg shadow-slate-900/10'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-red-500 text-white">
                <FaMapMarkerAlt className="h-3 w-3" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-start gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <a
                      href={link}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="truncate text-sm font-semibold text-slate-900 hover:underline"
                    >
                      {p.name}
                    </a>
                    {isPinned && (
                      <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700">
                        Pinned
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {miles !== undefined && (
                      <span className="whitespace-nowrap text-xs text-slate-500">{miles.toFixed(2)} mi</span>
                    )}
                    {onTogglePin && (
                      <button
                        type="button"
                        onClick={handlePinToggle}
                        className={`rounded-full border px-1.5 py-1 transition ${
                          isPinned
                            ? 'border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100'
                            : 'border-transparent text-slate-400 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-600'
                        }`}
                        aria-pressed={isPinned}
                        title={pinButtonLabel}
                      >
                        <FaThumbtack className={`h-3.5 w-3.5 ${isPinned ? 'rotate-12' : ''}`} />
                        <span className="sr-only">{pinButtonLabel}</span>
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 text-[11px]">
                  {typeof p.rating === 'number' && (
                    <span className="flex items-center gap-1 font-medium text-slate-600">
                      <FaStar className="h-3 w-3 text-yellow-500" />
                      <span className="text-yellow-700">
                        {p.rating.toFixed(1)}
                        {typeof p.userRatingCount === 'number' && (
                          <span className="text-slate-500 font-normal"> ({p.userRatingCount.toLocaleString()})</span>
                        )}
                      </span>
                    </span>
                  )}
                  {typeof p.openNow === 'boolean' && (() => {
                    let closingSoon = false;
                    if (p.openNow && p.currentOpeningHours?.periods?.length) {
                      const now = new Date();
                      const day = now.getDay();
                      const minutesNow = now.getHours() * 60 + now.getMinutes();
                      const periods = p.currentOpeningHours.periods ?? [];
                      const todayPeriod = periods.find((period) => period.open?.day === day);
                      if (
                        todayPeriod?.close?.hour != null &&
                        todayPeriod.close.minute != null
                      ) {
                        const closeMinutes = todayPeriod.close.hour * 60 + todayPeriod.close.minute;
                        if (closeMinutes - minutesNow <= 60 && closeMinutes - minutesNow > 0) {
                          closingSoon = true;
                        }
                      }
                    }
                    const badgeClass = p.openNow
                      ? closingSoon
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700';
                    const badgeText = p.openNow
                      ? closingSoon
                        ? 'Closing soon'
                        : 'Open'
                      : 'Closed';
                    return (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] ${badgeClass}`}
                        title={closingSoon ? 'Closing soon (within 1 hour)' : undefined}
                        aria-label={closingSoon ? 'Open but closing within an hour' : badgeText}
                      >
                        {badgeText}
                      </span>
                    );
                  })()}
                  <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                    {driveMinutes !== undefined && (
                      <span className="flex items-center gap-1">
                        <FaCar className="h-3 w-3" />
                        {driveMinutes} min
                      </span>
                    )}
                    {walkMinutes !== undefined && (
                      <span className="flex items-center gap-1">
                        <FaWalking className="h-3 w-3" />
                        {walkMinutes} min
                      </span>
                    )}
                  </div>
                </div>
                {p.primaryType && (
                  <div className="truncate text-[11px] text-slate-500">
                    {p.primaryType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                  </div>
                )}
                <div className="truncate text-[11px] text-slate-600">{p.address}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
