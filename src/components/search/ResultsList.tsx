'use client';
import { useEffect } from 'react';

export interface PlaceItem {
  id: string;
  name: string;
  address: string;
  location: { lat: number; lng: number };
  primaryType?: string;
  rating?: number | null;
  openNow?: boolean;
  currentOpeningHours?: {
    openNow?: boolean;
    periods?: any[];
    weekdayDescriptions?: string[];
  };
  userRatingCount?: number;
  googleMapsUri?: string;
  directDistanceMeters?: number;
  durationSec?: number;
  distanceMeters?: number;
}

function metersToMiles(m: number) { return m / 1609.344; }
function secondsToMin(s: number) { return Math.round(s / 60); }

export default function ResultsList({
  items,
  selectedId,
  onSelect,
}: {
  items: PlaceItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}) {
  useEffect(() => {
    if (!selectedId) return;
    const el = document.getElementById(`place-${selectedId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedId]);

  if (!items?.length) return null;

  return (
    <div className="mt-4 space-y-2">
      {items.map((p) => {
        const link =
          p.googleMapsUri ||
          `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(p.name + ' ' + p.address)}`;
        const miles =
          p.distanceMeters ? metersToMiles(p.distanceMeters)
          : p.directDistanceMeters ? metersToMiles(p.directDistanceMeters)
          : undefined;
        const minutes = p.durationSec ? secondsToMin(p.durationSec) : undefined;
        const active = selectedId === p.id;

        return (
          <button
            key={p.id}
            id={`place-${p.id}`}
            type="button"
            onClick={() => onSelect?.(p.id)}
            className={`w-full text-left border rounded-md p-3 hover:bg-neutral-50 ${
              active ? 'ring-2 ring-black' : ''
            }`}
          >
            <div className="font-medium flex items-center gap-2">
              {p.name}
              {typeof p.rating === 'number' && (
                <span className="ml-2 text-yellow-600 text-xs font-semibold bg-yellow-100 rounded px-2 py-0.5">
                  ★ {p.rating.toFixed(1)}
                </span>
              )}
              {typeof p.openNow === 'boolean' && (() => {
                // Check if closing within an hour
                let closingSoon = false;
                if (p.openNow && p.currentOpeningHours?.periods?.length) {
                  const now = new Date();
                  const day = now.getDay(); // 0=Sunday, 1=Monday...
                  const minutesNow = now.getHours() * 60 + now.getMinutes();
                  // Find today's closing time
                  const todayPeriod = p.currentOpeningHours.periods.find((per: any) => per.open?.day === day);
                  if (todayPeriod && todayPeriod.close?.hour != null && todayPeriod.close?.minute != null) {
                    const closeMinutes = todayPeriod.close.hour * 60 + todayPeriod.close.minute;
                    if (closeMinutes - minutesNow <= 60 && closeMinutes - minutesNow > 0) {
                      closingSoon = true;
                    }
                  }
                }
                let badgeClass = p.openNow
                  ? closingSoon
                    ? 'bg-orange-100 text-orange-700'
                    : 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700';
                let badgeText = p.openNow
                  ? closingSoon
                    ? 'Closing soon'
                    : 'Open now'
                  : 'Closed';
                return (
                  <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded ${badgeClass}`}>
                    {badgeText}
                  </span>
                );
              })()}
            </div>
            <div className="text-sm opacity-80">{p.address}</div>
            <div className="text-sm mt-1">
              {minutes !== undefined ? `${minutes} min` : ''}
              {minutes !== undefined && miles !== undefined ? ' • ' : ''}
              {miles !== undefined ? `${miles.toFixed(2)} mi` : ''}
            </div>
            <div className="mt-2">
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                className="underline"
                onClick={(e) => e.stopPropagation()}
              >
                Open in Google Maps
              </a>
            </div>
          </button>
        );
      })}
    </div>
  );
}
