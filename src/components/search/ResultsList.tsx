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
            className={`w-full text-left bg-[#f7f5f2] rounded-lg border p-2 transition hover:shadow focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
              active ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex flex-col gap-1 mb-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
              <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-x-2 gap-y-1">
                <FaMapMarkerAlt className="text-red-400 w-4 h-4" />
                <a
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="font-semibold text-base leading-tight break-words text-gray-900 hover:underline"
                >
                  {p.name}
                </a>
                <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                  {typeof p.rating === 'number' && (
                    <span className="flex items-center gap-1">
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
                    const badgeText = p.openNow ? 'Open' : 'Closed';
                    return (
                      <span className={`text-xs leading-tight px-1.5 py-0.5 rounded ${badgeClass}`}>
                        {badgeText}
                      </span>
                    );
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-2 text-gray-500 text-xs whitespace-nowrap">
                {miles !== undefined && <span>{miles.toFixed(2)} mi</span>}
                {/* Car and walk icons with minutes */}
                {driveMinutes !== undefined && (
                  <span className="flex items-center gap-1"><FaCar className="w-3 h-3" />{driveMinutes} min</span>
                )}
                {walkMinutes !== undefined && (
                  <span className="flex items-center gap-1"><FaWalking className="w-3 h-3" />{walkMinutes} min</span>
                )}
              </div>
            </div>
            {/* Category subtitle under title */}
            {p.primaryType && (
              <div className="text-xs text-gray-500 mb-0.5">{p.primaryType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</div>
            )}
            {/* ...existing code... */}
            <div className="text-xs text-gray-700 mb-0.5">{p.address}</div>
          </div>
        );
      })}
    </div>
  );
}
