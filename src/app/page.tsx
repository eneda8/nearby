'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import MapView from '@/components/map/MapView';
import AddressInput from '@/components/search/AddressInput';
import Controls from '@/components/search/Controls';
import ResultsList, { PlaceItem } from '@/components/search/ResultsList';
import Filters, { type Selection } from '@/components/search/Filters';
import Toggle from '@/components/ui/Toggle';
import { CATEGORIES } from '@/lib/categories';
import { FiLink } from 'react-icons/fi';
import { useSearchParams } from 'next/navigation';

const DEV_ORIGIN = process.env.NEXT_PUBLIC_DEV_ORIGIN
  ? process.env.NEXT_PUBLIC_DEV_ORIGIN.split(',').map(Number)
  : null;

const DEFAULT_CENTER: { lat: number; lng: number } = DEV_ORIGIN
  ? { lat: DEV_ORIGIN[0], lng: DEV_ORIGIN[1] }
  : { lat: 40.7128, lng: -74.006 };

type RouteMatrixElement = {
  destinationIndex?: number | string;
  travelMode?: string;
  duration?: string | { seconds?: number | string };
  distanceMeters?: number;
};

const isRouteMatrixElement = (value: unknown): value is RouteMatrixElement => {
  if (typeof value !== 'object' || value === null) return false;
  const candidate = value as Record<string, unknown>;
  const { destinationIndex, travelMode, duration, distanceMeters } = candidate;

  const destinationIndexValid =
    destinationIndex === undefined ||
    typeof destinationIndex === 'number' ||
    typeof destinationIndex === 'string';

  const travelModeValid = travelMode === undefined || typeof travelMode === 'string';
  const distanceValid = distanceMeters === undefined || typeof distanceMeters === 'number';

  const durationValid =
    duration === undefined ||
    typeof duration === 'string' ||
    (typeof duration === 'object' &&
      duration !== null &&
      (typeof (duration as { seconds?: unknown }).seconds === 'number' ||
        typeof (duration as { seconds?: unknown }).seconds === 'string' ||
        (duration as { seconds?: unknown }).seconds === undefined));

  return destinationIndexValid && travelModeValid && distanceValid && durationValid;
};

const safeJsonParse = (value: string): unknown => {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const parseRouteMatrixElements = (payload: string): RouteMatrixElement[] => {
  const trimmed = payload.trim();
  if (!trimmed) return [];

  const raw: unknown =
    trimmed.startsWith('{') || trimmed.startsWith('[')
      ? safeJsonParse(trimmed)
      : trimmed
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => safeJsonParse(line));

  if (Array.isArray(raw)) {
    return raw.filter(isRouteMatrixElement);
  }

  if (
    typeof raw === 'object' &&
    raw !== null &&
    Array.isArray((raw as { elements?: unknown[] }).elements)
  ) {
    return (raw as { elements: unknown[] }).elements.filter(isRouteMatrixElement);
  }

  return [];
};

const parseDurationSeconds = (
  value: RouteMatrixElement['duration']
): number | undefined => {
  if (typeof value === 'string') {
    const match = value.match(/^(\d+(?:\.\d+)?)s$/);
    return match ? Number(match[1]) : undefined;
  }
  if (typeof value === 'object' && value !== null) {
    const seconds = (value as { seconds?: number | string }).seconds;
    if (typeof seconds === 'number') return seconds;
    if (typeof seconds === 'string' && seconds.trim().length > 0) {
      const parsed = Number(seconds);
      return Number.isFinite(parsed) ? parsed : undefined;
    }
  }
  return undefined;
};

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  // Map origin/center (set after user picks an address)
  const [center, setCenter] = useState<{ lat: number; lng: number }>(DEFAULT_CENTER);
  const [haveOrigin, setHaveOrigin] = useState<boolean>(!!DEV_ORIGIN);
  const [showLanding, setShowLanding] = useState<boolean>(!DEV_ORIGIN);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<'idle' | 'copied' | 'error'>('idle');
  const searchParams = useSearchParams();

  useEffect(() => {
    const latParam = searchParams.get('lat');
    const lngParam = searchParams.get('lng');
    const addressParam = searchParams.get('address');

    if (latParam && lngParam) {
      const lat = parseFloat(latParam);
      const lng = parseFloat(lngParam);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        setCenter({ lat, lng });
        setHaveOrigin(true);
        setShowLanding(false);
        if (addressParam) setSelectedAddress(addressParam);
      }
    }
  }, [searchParams]);

  // Controls
  const [radiusMeters, setRadiusMeters] = useState(1609.344); // 1 mile

  // Filters (multi-select Option A)
  const [selections, setSelections] = useState<Selection[]>([]);
  const typeGroups = useMemo(() => {
    const map = new Map<string, Set<string>>();
    selections.forEach((sel) => {
      const cat = CATEGORIES.find((c) => c.key === sel.parent);
      const sub = cat?.subs.find((s) => s.key === sel.subKey) ?? cat?.subs[0];
      if (!sub?.types) return;
      const set = map.get(sel.parent) ?? new Set<string>();
      sub.types.forEach((t) => set.add(t));
      map.set(sel.parent, set);
    });
    return Array.from(map.values())
      .map((set) => Array.from(set))
      .filter((arr) => arr.length > 0);
  }, [selections]);

  // Data + selection & hover
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [pinnedPlaces, setPinnedPlaces] = useState<Record<string, PlaceItem>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Open now toggle
  const [openNowOnly, setOpenNowOnly] = useState(true); // default to true
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const selectedTokens = useMemo(() => {
    return selections
      .map((sel) => {
        const cat = CATEGORIES.find((c) => c.key === sel.parent);
        const sub = cat?.subs.find((s) => s.key === sel.subKey);
        if (!sub) return null;
        return { ...sel, label: sub.label };
      })
      .filter(Boolean) as Array<Selection & { label: string }>;
  }, [selections]);

  const removeSelection = useCallback((parent: Selection['parent'], subKey: string) => {
    setSelections((prev) => prev.filter((s) => !(s.parent === parent && s.subKey === subKey)));
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(max-width: 767px)');
    const update = () => setIsMobile(mq.matches);
    update();
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', update);
      return () => mq.removeEventListener('change', update);
    }
    mq.addListener(update);
    return () => mq.removeListener(update);
  }, []);

  // Filtered places based on openNowOnly
  const filteredPlaces = useMemo(
    () => (openNowOnly ? places.filter((p) => p.openNow) : places),
    [places, openNowOnly]
  );

  const pinnedList = useMemo(() => Object.values(pinnedPlaces), [pinnedPlaces]);
  const pinnedIds = useMemo(() => new Set(pinnedList.map((p) => p.id)), [pinnedList]);
  const combinedEntries = useMemo(() => {
    const byId = new Map<string, { place: PlaceItem; isPinned: boolean }>();
    pinnedList.forEach((place) => {
      if (!place?.id) return;
      byId.set(place.id, { place, isPinned: true });
    });
    filteredPlaces.forEach((place) => {
      if (!place?.id) return;
      const existing = byId.get(place.id);
      const mergedPlace = existing ? { ...existing.place, ...place } : place;
      byId.set(place.id, {
        place: mergedPlace,
        isPinned: existing?.isPinned ?? false,
      });
    });
    const order: string[] = [];
    pinnedList.forEach((place) => {
      if (place?.id && !order.includes(place.id)) {
        order.push(place.id);
      }
    });
    filteredPlaces.forEach((place) => {
      if (place?.id && !order.includes(place.id)) {
        order.push(place.id);
      }
    });
    return order
      .map((id) => byId.get(id))
      .filter((entry): entry is { place: PlaceItem; isPinned: boolean } => Boolean(entry));
  }, [pinnedList, filteredPlaces]);
  const displayPlaces = useMemo(() => combinedEntries.map((entry) => entry.place), [combinedEntries]);

  useEffect(() => {
    if (!isMobile) return;
    const original = document.body.style.overflow;
    if (showMobileFilters) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = original;
      };
    }
    document.body.style.overflow = original;
  }, [showMobileFilters, isMobile]);

  useEffect(() => {
    if (hoverId && !filteredPlaces.some((p) => p.id === hoverId)) {
      setHoverId(null);
    }
  }, [hoverId, filteredPlaces]);

  useEffect(() => {
    if (!places.length) return;
    setPinnedPlaces((prev) => {
      let changed = false;
      const next = { ...prev };
      places.forEach((place) => {
        if (next[place.id] && next[place.id] !== place) {
          next[place.id] = place;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [places]);

  const handleCopyLink = async () => {
    if (!haveOrigin) return;
    try {
      const url = new URL(window.location.href);
      url.searchParams.set('lat', center.lat.toString());
      url.searchParams.set('lng', center.lng.toString());
      if (selectedAddress) {
        url.searchParams.set('address', selectedAddress);
      } else {
        url.searchParams.delete('address');
      }
      await navigator.clipboard.writeText(url.toString());
      setCopySuccess('copied');
      setTimeout(() => setCopySuccess('idle'), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
      setCopySuccess('error');
      setTimeout(() => setCopySuccess('idle'), 2000);
    }
  };

  const handleTogglePin = useCallback((place: PlaceItem) => {
    if (!place?.id) return;
    let removed = false;
    setPinnedPlaces((prev) => {
      const next = { ...prev };
      if (next[place.id]) {
        delete next[place.id];
        removed = true;
      } else {
        next[place.id] = place;
      }
      return next;
    });
    if (removed) {
      setSelectedId((prev) => (prev === place.id ? null : prev));
      setHoverId((prev) => (prev === place.id ? null : prev));
    }
  }, []);

  const handleClearPins = useCallback(() => {
    setPinnedPlaces({});
    setSelectedId(null);
    setHoverId(null);
  }, []);

  const handleResetHome = useCallback(() => {
    setShowLanding(true);
    setHaveOrigin(false);
    setSelectedAddress('');
    setSelectedId(null);
    setHoverId(null);
    setCopySuccess('idle');
    setSelections([]);
    setPlaces([]);
    setPinnedPlaces({});
    setCenter(DEFAULT_CENTER);
    setRadiusMeters(1609.344);
    setOpenNowOnly(true);
    setError(null);
    setLoading(false);
    setShowMobileFilters(false);
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      url.searchParams.delete('lat');
      url.searchParams.delete('lng');
      url.searchParams.delete('address');
      window.history.replaceState(null, '', url.toString());
    }
  }, []);

  // Open now toggle
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map markers
  const markers = useMemo(
    () =>
      combinedEntries.map(({ place, isPinned }) => ({
        id: place.id,
        position: place.location,
        name: place.name,
        label: place.name,
        address: place.address,
        googleMapsUri: place.googleMapsUri,
        websiteUri: place.websiteUri,
        openNow: place.openNow,
        weekdayText: place.currentOpeningHours?.weekdayDescriptions ?? [],
        primaryType: place.primaryType,
        isPinned,
      })),
    [combinedEntries]
  );

  useEffect(() => {
    if (!haveOrigin) return;
    const controller = new AbortController();

    if (typeGroups.length === 0) {
      setPlaces([]);
      setSelectedId(null);
      return;
    }
    
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedId(null);

        // 1) Nearby search (Places API New)
        const aggregated = new Map<string, PlaceItem>();
        for (const group of typeGroups) {
          const res = await fetch('/api/places', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              lat: center.lat,
              lng: center.lng,
              radiusMeters,
              includedTypes: group,
            }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const text = await res.text();
            throw new Error(`Places request failed: ${text}`);
          }

          const data = await res.json();
          const batch: PlaceItem[] = data?.places ?? [];
          batch.forEach((place) => {
            if (!aggregated.has(place.id)) {
              aggregated.set(place.id, place);
            }
          });
        }

        const items: PlaceItem[] = Array.from(aggregated.values());

        // 2) Route Matrix for top N (travel time + distance)
        const candidateMap = new Map<string, PlaceItem>();
        items.slice(0, 20).forEach((item) => candidateMap.set(item.id, item));
        items
          .filter((item) => item.openNow)
          .slice(0, 20)
          .forEach((item) => candidateMap.set(item.id, item));

        const targetItems: PlaceItem[] = [];
        const destinations: Array<{ lat: number; lng: number }> = [];
        Array.from(candidateMap.values()).forEach((item) => {
          const loc = item.location;
          if (
            loc &&
            typeof loc.lat === 'number' &&
            Number.isFinite(loc.lat) &&
            typeof loc.lng === 'number' &&
            Number.isFinite(loc.lng)
          ) {
            targetItems.push(item);
            destinations.push({ lat: loc.lat, lng: loc.lng });
          }
        });

        if (destinations.length > 0) {
          const res2 = await fetch('/api/route-matrix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin: center,
              destinations,
            }),
            signal: controller.signal,
          });

          if (res2.ok) {
            // API route may return NDJSON-aggregated array or {elements}
            const bodyText = await res2.text();
            const elements = parseRouteMatrixElements(bodyText);

            elements.forEach((element) => {
              const destinationIndex =
                typeof element.destinationIndex === 'string'
                  ? Number.parseInt(element.destinationIndex, 10)
                  : element.destinationIndex;

              if (
                typeof destinationIndex !== 'number' ||
                !Number.isInteger(destinationIndex) ||
                !targetItems[destinationIndex]
              ) {
                return;
              }

              const mode =
                typeof element.travelMode === 'string'
                  ? element.travelMode.toUpperCase()
                  : undefined;

              const durSec = parseDurationSeconds(element.duration);

              const distanceMeters =
                typeof element.distanceMeters === 'number' ? element.distanceMeters : undefined;

              const target = targetItems[destinationIndex];
              if (mode === 'DRIVE') {
                if (durSec != null) target.driveDurationSec = durSec;
                if (distanceMeters != null) {
                  target.driveDistanceMeters = distanceMeters;
                  target.distanceMeters = distanceMeters;
                }
              } else if (mode === 'WALK') {
                if (durSec != null) target.walkDurationSec = durSec;
                if (distanceMeters != null) {
                  target.walkDistanceMeters = distanceMeters;
                  if (target.distanceMeters == null) {
                    target.distanceMeters = distanceMeters;
                  }
                }
              } else {
                if (durSec != null && target.driveDurationSec == null) {
                  target.driveDurationSec = durSec;
                }
                if (distanceMeters != null && target.distanceMeters == null) {
                  target.distanceMeters = distanceMeters;
                }
              }
            });

          } else {
            // Keep items without minutes; we’ll show distance-only message below
            console.error('Route matrix request failed:', await res2.text());
          }
        }

        // Default sort: distance (asc), then travel time
        items.sort((a, b) => {
          const primaryDistance = (p: PlaceItem) =>
            p.distanceMeters ??
            p.driveDistanceMeters ??
            p.walkDistanceMeters ??
            p.directDistanceMeters ??
            Number.POSITIVE_INFINITY;

          const da = primaryDistance(a);
          const db = primaryDistance(b);
          if (da !== db) return da - db;

          const primaryDuration = (p: PlaceItem) =>
            p.driveDurationSec ?? p.walkDurationSec ?? Number.POSITIVE_INFINITY;
          return primaryDuration(a) - primaryDuration(b);
        });

        setPlaces(items);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        const message = err instanceof Error ? err.message : 'Request failed';
        setError(message);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [center, radiusMeters, haveOrigin, typeGroups]);

  if (showLanding) {
    return (
      <main
        className="relative min-h-screen text-white"
        style={{
          backgroundImage: 'url(/images/landing-map-placeholder.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          backgroundColor: '#0b0f19',
        }}
      >
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center gap-4">
          <div className="flex flex-col items-center">
            <button
              type="button"
              onClick={handleResetHome}
              className="group flex flex-col items-center text-white focus:outline-none cursor-pointer"
              aria-label="Back to Nearby home"
            >
              <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase tracking-[0.3em] text-white/70 transition group-hover:bg-white/20">
                Discover nearby
              </span>
              <div className="mt-4 flex items-center justify-center gap-2">
                <Image
                  src="/images/logo.png"
                  alt="Nearby logo"
                  width={160}
                  height={64}
                  className="h-[2.5em] w-auto shrink-0 p-0 m-0"
                  priority
                />
                <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight">Nearby</h1>
              </div>
            </button>
            <p className="mt-2 max-w-md text-base text-white/80">
              Find great places around any address—restaurants, essentials, and more, all in one view.
            </p>
          </div>
          <div className="w-full max-w-md bg-white/95 text-left rounded-xl shadow-xl p-2 pb-0">
            <AddressInput
              placeholder="Search nearby"
              onPlace={(place) => {
                const loc = place.geometry!.location!;
                setCenter({ lat: loc.lat(), lng: loc.lng() });
                setHaveOrigin(true);
                setShowLanding(false);
                setSelectedAddress(place.formatted_address ?? place.name ?? '');
                setSelectedId(null);
                setPinnedPlaces({});
              }}
              showBranding={false}
            />
            <div className="my-1 text-[10px] text-gray-500 text-center">Powered by Google</div>
          </div>
        </div>
      </main>
    );
  }

  const addressLabel = selectedAddress || (haveOrigin ? 'Current map center' : 'Choose an address to begin');
  const hasSelections = selections.length > 0;
  const resultsCount = filteredPlaces.length;
  const pinnedCount = pinnedList.length;
  let placeCountLabel = '';
  if (resultsCount > 0 && pinnedCount > 0) {
    placeCountLabel = `${resultsCount} ${resultsCount === 1 ? 'match' : 'matches'} • ${pinnedCount} pinned`;
  } else if (resultsCount > 0) {
    placeCountLabel = `${resultsCount} ${resultsCount === 1 ? 'place' : 'places'}`;
  } else if (pinnedCount > 0) {
    placeCountLabel = `${pinnedCount} pinned ${pinnedCount === 1 ? 'place' : 'places'}`;
  } else if (hasSelections) {
    placeCountLabel = 'No matches';
  }

  return (
    <main className="flex h-screen flex-col bg-slate-100 text-slate-900 md:flex-row md:overflow-hidden">
      <div className="flex flex-col md:flex-1 md:overflow-hidden">
        <header className="sticky top-0 z-30 flex items-center gap-2 bg-[#1a73e8] px-3 py-2 text-white shadow-md md:absolute md:left-6 md:top-6 md:w-auto md:rounded-full md:bg-[#1a73e8]/90 md:px-5 md:py-2 md:shadow-lg md:backdrop-blur">
          <button
            type="button"
            onClick={handleResetHome}
            className="flex items-center gap-1 text-sm font-semibold tracking-tight md:text-base focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 rounded-full cursor-pointer"
            aria-label="Back to Nearby home"
          >
            <Image
              src="/images/logo.png"
              alt="Nearby logo"
              width={120}
              height={48}
              className="h-5 w-auto md:h-6"
              priority
            />
            <span>Nearby</span>
          </button>
          <div className="ml-3 flex-1 md:hidden">
            <AddressInput
              placeholder="Search nearby"
              onPlace={(place) => {
                const loc = place.geometry!.location!;
                setCenter({ lat: loc.lat(), lng: loc.lng() });
                setHaveOrigin(true);
                setShowLanding(false);
                setSelectedAddress(place.formatted_address ?? place.name ?? '');
                setSelectedId(null);
                setPinnedPlaces({});
              }}
              showBranding={false}
            />
          </div>
        </header>
        <div className={isMobile ? 'h-[38vh] w-full' : 'relative flex-1'}>
          <div className={isMobile ? 'h-full w-full' : 'absolute inset-0 h-full w-full'}>
            <MapView
              center={center}
              radiusMeters={radiusMeters}
              markers={markers}
              selectedId={selectedId}
              onMarkerClick={(id: string) => setSelectedId(id)}
              onMarkerHover={setHoverId}
              className="h-full w-full"
              showOrigin
              showRadius
              hoverId={hoverId}
            />
            <div className="pointer-events-none absolute inset-0 hidden bg-gradient-to-r from-[#0b0f19]/25 via-transparent to-transparent md:block" />
          </div>
        </div>
        {isMobile && (
          <div className="border-b bg-white px-4 pb-3 pt-2 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="truncate text-sm font-semibold text-slate-900">{addressLabel}</span>
              {haveOrigin && (
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="rounded-full border border-white/30 bg-white/10 p-1.5 text-white transition hover:bg-white/20"
                  title={copySuccess === 'copied' ? 'Copied!' : copySuccess === 'error' ? 'Unable to copy' : 'Copy shareable link'}
                >
                  <FiLink className="h-4 w-4" />
                  <span className="sr-only">Copy link</span>
                </button>
              )}
            </div>
            {pinnedCount > 0 }
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                {placeCountLabel && <span>{placeCountLabel}</span>}
                {pinnedCount > 0 && (
                  <button
                    type="button"
                    onClick={handleClearPins}
                    className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
                  >
                    Clear pins
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowMobileFilters((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
                >
                  <span>Filters{selections.length ? ` (${selections.length})` : ''}</span>
                  <span className={`transform transition ${showMobileFilters ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
                <Controls onRadiusChange={setRadiusMeters} />
              </div>
            </div>
            {selectedTokens.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedTokens.map((token) => (
                  <span
                    key={`${token.parent}:${token.subKey}`}
                    className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] text-slate-700"
                  >
                    {token.label}
                    <button
                      type="button"
                      className="opacity-60 hover:opacity-100"
                      onClick={() => removeSelection(token.parent, token.subKey)}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <button
                  type="button"
                  onClick={() => setSelections([])}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-slate-600 hover:border-slate-300"
                >
                  Clear all
                </button>
              </div>
            )}
          </div>
        )}
      </div>
      <section className="flex-1 overflow-y-auto bg-white md:max-w-xl md:border-l md:border-white/40 md:bg-white/95 md:backdrop-blur-md md:shadow-[0_35px_120px_-40px_rgba(15,23,42,0.75)]">
        <div className="hidden border-b border-black/5 px-6 pt-5 pb-4 md:block">
          <AddressInput
            placeholder="Search nearby"
            onPlace={(place) => {
              const loc = place.geometry!.location!;
              setCenter({ lat: loc.lat(), lng: loc.lng() });
              setHaveOrigin(true);
              setShowLanding(false);
              setSelectedAddress(place.formatted_address ?? place.name ?? '');
              setSelectedId(null);
              setPinnedPlaces({});
            }}
          />
          <div className="mt-3 flex items-center gap-2 text-[11px] text-gray-600 md:hidden">
            <span className="font-medium">Open now</span>
            <Toggle checked={openNowOnly} onChange={setOpenNowOnly} />
          </div>
        </div>
        <header className="hidden border-b border-black/5 px-6 pt-6 pb-4 md:block">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Current address</p>
          <div className="mt-1 flex items-start justify-between gap-3">
            <h2 className="truncate text-lg font-semibold leading-tight text-slate-900">
              {addressLabel}
            </h2>
            {haveOrigin && (
              <button
                type="button"
                onClick={handleCopyLink}
                className="text-[#1a73e8] transition hover:text-[#0f4db8]"
                title={copySuccess === 'copied' ? 'Copied!' : copySuccess === 'error' ? 'Unable to copy' : 'Copy shareable link'}
              >
                <FiLink className="h-4 w-4" />
                <span className="sr-only">Copy link</span>
              </button>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs text-gray-500">
            <div className="flex items-center gap-2">
              {placeCountLabel && <span>{placeCountLabel}</span>}
              {pinnedCount > 0 && (
                <button
                  type="button"
                  onClick={handleClearPins}
                  className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
                >
                  Clear pins
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowMobileFilters((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1 text-[11px] font-medium text-slate-700 shadow-sm"
              >
                <span>Filters{selections.length ? ` (${selections.length})` : ''}</span>
                <span className={`transform transition ${showMobileFilters ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>
              <Controls onRadiusChange={setRadiusMeters} />
              <div className="ml-2 flex items-center gap-2 text-[11px] text-slate-600">
                <span className="font-medium">Open now</span>
                <Toggle checked={openNowOnly} onChange={setOpenNowOnly} />
              </div>
            </div>
          </div>
        </header>
        <div className="hidden border-b border-black/5 px-6 py-3 md:block">
          <Filters
            selections={selections}
            onChange={setSelections}
            onClearAll={() => {
              setPlaces([]);
              setSelectedId(null);
            }}
          />
        </div>

        <div className="space-y-3 px-4 py-4 md:px-6 md:py-5">
          {loading && <div className="opacity-70">Searching nearby…</div>}
          {error && <div className="break-all text-red-600">{error}</div>}
          {!loading && resultsCount === 0 && pinnedCount === 0 && !error && (
            <div className="text-sm opacity-70">
              {hasSelections
                ? 'No places match your filters here. Try a larger radius or different categories.'
                : 'Pick a category or adjust filters to explore nearby places.'}
            </div>
          )}
          {displayPlaces.length > 0 && (
            <ResultsList
              items={displayPlaces}
              selectedId={selectedId}
              onSelect={(id: string) => setSelectedId(id)}
              onHover={setHoverId}
              pinnedIds={pinnedIds}
              onTogglePin={handleTogglePin}
            />
          )}
        </div>
      </section>
      {isMobile && (
        <>
          <div
            className={`fixed inset-0 z-40 bg-slate-900/40 transition-opacity duration-200 ${showMobileFilters ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setShowMobileFilters(false)}
          />
          <div
            className={`fixed inset-x-0 bottom-0 z-50 transform transition-transform duration-300 ${
              showMobileFilters ? 'translate-y-0' : 'translate-y-full'
            }`}
          >
            <div
              className="min-h-[65vh] rounded-t-3xl bg-white px-4 pt-3 pb-5 shadow-xl"
              style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)' }}
            >
              <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-slate-200" />
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">Filters</h3>
                <button
                  type="button"
                  className="text-sm font-medium text-[#1a73e8]"
                  onClick={() => setShowMobileFilters(false)}
                >
                  Done
                </button>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs text-gray-600">
                  <span className="font-medium text-slate-700">Open now</span>
                  <Toggle checked={openNowOnly} onChange={setOpenNowOnly} />
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <Filters
                    selections={selections}
                    onChange={setSelections}
                    onClearAll={() => {
                      setPlaces([]);
                      setSelectedId(null);
                    }}
                  />
                </div>
                <div className="flex justify-between pt-2">
                  <button
                    type="button"
                    className="rounded-full bg-[#1a73e8] px-4 py-2 text-xs font-semibold text-white shadow"
                    onClick={() => setShowMobileFilters(false)}
                  >
                    Apply filters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </main>
  );
}
