'use client';
import { useEffect, KeyboardEvent } from 'react';
import { FaMapMarkerAlt, FaStar, FaCar, FaWalking } from 'react-icons/fa';

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
  driveDurationSec?: number;
  driveDistanceMeters?: number;
  walkDurationSec?: number;
  walkDistanceMeters?: number;
  distanceMeters?: number;
}

function metersToMiles(m: number) { return m / 1609.344; }
function secondsToMin(s: number) { return Math.round(s / 60); }

export default function ResultsList({
  items,
  selectedId,
  onSelect,
  onHover,
}: {
  items: PlaceItem[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onHover?: (id: string | null) => void;
}) {
  useEffect(() => {
    if (!selectedId) return;
    const el = document.getElementById(`place-${selectedId}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [selectedId]);

  if (!items?.length) return null;

  return (
    <div className="mt-1 flex flex-col gap-2">
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

        const handleActivate = () => onSelect?.(p.id);
        const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleActivate();
          }
        };

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
            className={`w-full text-left rounded-xl border transition focus:outline-none focus:ring-2 focus:ring-slate-900/40 cursor-pointer p-4 ${
              active
                ? 'border-slate-900/60 bg-white shadow-lg shadow-slate-900/10'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-md'
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${
                  active ? 'bg-slate-900 text-white' : 'bg-slate-900/5 text-slate-600'
                }`}
              >
                <FaMapMarkerAlt className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <a
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="font-semibold text-sm leading-tight text-slate-900 hover:underline"
                  >
                    {p.name}
                  </a>
                  {typeof p.rating === 'number' && (
                    <span className="flex items-center gap-1 text-[11px] font-medium text-slate-600">
                      <FaStar className="text-yellow-500 w-3 h-3" />
                      <span className="text-yellow-700">{p.rating.toFixed(1)}</span>
                    </span>
                  )}
                  {typeof p.openNow === 'boolean' && (() => {
                    let closingSoon = false;
                    if (p.openNow && p.currentOpeningHours?.periods?.length) {
                      const now = new Date();
                      const day = now.getDay();
                      const minutesNow = now.getHours() * 60 + now.getMinutes();
                      const todayPeriod = p.currentOpeningHours.periods.find((per: any) => per.open?.day === day);
                      if (todayPeriod && todayPeriod.close?.hour != null && todayPeriod.close?.minute != null) {
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
                        className={`text-[11px] leading-tight px-1.5 py-0.5 rounded-full ${badgeClass}`}
                        title={closingSoon ? 'Closing soon (within 1 hour)' : undefined}
                        aria-label={closingSoon ? 'Open but closing within an hour' : badgeText}
                      >
                        {badgeText}
                      </span>
                    );
                  })()}
                </div>
                {p.primaryType && (
                  <div className="text-[11px] text-slate-500">{p.primaryType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</div>
                )}
                <div className="text-[11px] text-slate-600">{p.address}</div>
              </div>
              <div className="flex flex-col items-end gap-1 text-slate-500 text-xs whitespace-nowrap pl-2">
                {miles !== undefined && <span>{miles.toFixed(2)} mi</span>}
                <div className="flex items-center gap-2">
                  {driveMinutes !== undefined && (
                    <span className="flex items-center gap-1"><FaCar className="w-3 h-3" />{driveMinutes} min</span>
                  )}
                  {walkMinutes !== undefined && (
                    <span className="flex items-center gap-1"><FaWalking className="w-3 h-3" />{walkMinutes} min</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
