'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
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

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <HomePageContent />
    </Suspense>
  );
}

function HomePageContent() {
  // Map origin/center (set after user picks an address)
  const [center, setCenter] = useState<{lat:number;lng:number}>(
  DEV_ORIGIN ? { lat: DEV_ORIGIN[0], lng: DEV_ORIGIN[1] } : { lat: 40.7128, lng: -74.006 }
  );
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
  const includedTypes = useMemo(() => {
    if (!selections.length) return [];   // let server default kick in
    const all = selections.flatMap((sel) => {
      const cat = CATEGORIES.find((c) => c.key === sel.parent);
      const sub = cat?.subs.find((s) => s.key === sel.subKey) ?? cat?.subs[0];
      return sub?.types ?? [];
    });
    return Array.from(new Set(all));
  }, [selections]);

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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Open now toggle
  const [openNowOnly, setOpenNowOnly] = useState(true); // default to true

  // Filtered places based on openNowOnly
  const filteredPlaces = useMemo(
    () => (openNowOnly ? places.filter((p) => p.openNow) : places),
    [places, openNowOnly]
  );

  useEffect(() => {
    if (hoverId && !filteredPlaces.some((p) => p.id === hoverId)) {
      setHoverId(null);
    }
  }, [hoverId, filteredPlaces]);

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

  // Open now toggle
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map markers
  const markers = useMemo(
    () =>
      filteredPlaces.map((p) => ({
        id: p.id,
        position: p.location,
        label: p.name,
        link: p.googleMapsUri,
      })),
    [filteredPlaces]
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

        let items: PlaceItem[] = Array.from(aggregated.values());

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
            const elements =
              bodyText.trim().startsWith('{') || bodyText.trim().startsWith('[')
                ? (JSON.parse(bodyText).elements ?? JSON.parse(bodyText))
                : bodyText
                    .split('\n')
                    .filter(Boolean)
                    .map((ln) => JSON.parse(ln));

            elements?.forEach((el: any) => {
              const idx = Number(el.destinationIndex);
              if (!Number.isInteger(idx) || !targetItems[idx]) return;

              const mode = typeof el.travelMode === 'string' ? el.travelMode.toUpperCase() : undefined;

              // duration can be "523s" or { seconds: 523 }
              let durSec: number | undefined;
              if (typeof el.duration === 'string') {
                const m = el.duration.match(/^(\d+(?:\.\d+)?)s$/);
                if (m) durSec = Number(m[1]);
              } else if (el.duration?.seconds != null) {
                durSec = Number(el.duration.seconds);
              }

              const distanceMeters = typeof el.distanceMeters === 'number' ? el.distanceMeters : undefined;

              const target = targetItems[idx];
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
            // eslint-disable-next-line no-console
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
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message || 'Request failed');
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [center, radiusMeters, haveOrigin, typeGroups]);

  if (showLanding) {
    return (
      <main className="relative min-h-screen bg-[#0b0f19] text-white">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <MapView
              center={center}
              radiusMeters={0}
              markers={[]}
              className="w-full h-full"
              showOrigin={false}
              showRadius={false}
            />
          </div>
          <div className="absolute inset-0 bg-black/55 backdrop-blur-sm" />
        </div>
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 text-center gap-4">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] uppercase tracking-[0.3em] text-white/70">
              Discover nearby
            </span>
            <h1 className="mt-4 text-4xl sm:text-5xl font-semibold tracking-tight">Nearby</h1>
            <p className="mt-2 max-w-md text-base text-white/80">
              Find great places around any address—restaurants, essentials, and more, all in one view.
            </p>
          </div>
          <div className="w-full max-w-md bg-white/95 text-left rounded-xl shadow-xl p-4">
            <AddressInput
              placeholder="Search nearby"
              onPlace={(place) => {
                const loc = place.geometry!.location!;
                setCenter({ lat: loc.lat(), lng: loc.lng() });
                setHaveOrigin(true);
                setShowLanding(false);
                setSelectedAddress(place.formatted_address ?? place.name ?? '');
                setSelectedId(null);
              }}
              showBranding={false}
            />
            <div className="mt-2 text-[10px] text-gray-500 text-center">Powered by Google</div>
          </div>
        </div>
      </main>
    );
  }

  const miles = radiusMeters / 1609.344;
  const radiusLabel = `${Math.abs(miles - Math.round(miles)) < 1e-3 ? Math.round(miles) : miles.toFixed(1)} mi radius`;

  return (
    <main className="relative h-screen overflow-hidden text-slate-900">
      <div className="absolute inset-0">
        <MapView
          center={center}
          radiusMeters={radiusMeters}
          markers={markers}
          selectedId={selectedId}
          onMarkerClick={(id: string) => setSelectedId(id)}
          className="w-full h-full"
          showOrigin
          showRadius
          panOffsetPixels={{ x: 300, y: 0 }}
          hoverId={hoverId}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0b0f19]/25 via-transparent to-transparent pointer-events-none" />
      </div>
      <div className="relative z-10 flex h-full w-full justify-end pointer-events-none">
        <section className="pointer-events-auto w-full max-w-xl bg-white/95 backdrop-blur-md shadow-[0_35px_120px_-40px_rgba(15,23,42,0.75)] flex flex-col border-l border-white/40">
          <header className="px-6 pt-6 pb-4 border-b border-black/5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Current address</p>
            <div className="mt-1 flex items-start justify-between gap-3">
              <h2 className="text-lg font-semibold text-slate-900 leading-tight truncate">
                {selectedAddress || 'Choose an address to begin'}
              </h2>
              {haveOrigin && (
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-900 transition"
                  title={copySuccess === 'copied' ? 'Copied!' : copySuccess === 'error' ? 'Unable to copy' : 'Copy shareable link'}
                >
                  <FiLink className="w-4 h-4" />
                  <span>
                    {copySuccess === 'copied'
                      ? 'Copied'
                      : copySuccess === 'error'
                      ? 'Try again'
                      : 'Copy link'}
                  </span>
                </button>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-gray-500">
              {filteredPlaces.length > 0
                ? `${filteredPlaces.length} ${filteredPlaces.length === 1 ? 'place' : 'places'} • ${radiusLabel}`
                : radiusLabel}
            </p>
          </header>

          <div className="px-6 pt-5 pb-4 border-b border-black/5 space-y-3">
            <AddressInput
              placeholder="Search nearby"
              onPlace={(place) => {
                const loc = place.geometry!.location!;
                setCenter({ lat: loc.lat(), lng: loc.lng() });
                setHaveOrigin(true);
                setShowLanding(false);
                setSelectedAddress(place.formatted_address ?? place.name ?? '');
                setSelectedId(null);
              }}
            />
            <div className="flex flex-wrap items-center justify-between gap-3 text-[11px] text-gray-600">
              <Controls onRadiusChange={setRadiusMeters} />
              <div className="flex items-center gap-2">
                <span className="font-medium">Open now</span>
                <Toggle checked={openNowOnly} onChange={setOpenNowOnly} />
              </div>
            </div>
          </div>

          <div className="px-6 py-3 border-b border-black/5">
            <Filters
              selections={selections}
              onChange={setSelections}
              onClearAll={() => {
                setPlaces([]);
                setSelectedId(null);
              }}
            />
          </div>

          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-3">
            {loading && <div className="opacity-70">Searching nearby…</div>}
            {error && <div className="text-red-600 break-all">{error}</div>}
            {!loading && filteredPlaces.length === 0 && !error && (
              <div className="text-sm opacity-70">
                {places.length === 0
                  ? 'No places match your filters here. Try a larger radius or different categories.'
                  : 'Everything here is closed right now. Turn off “Open now” or adjust filters.'}
              </div>
            )}
            {filteredPlaces.length > 0 && (
              <ResultsList
                items={filteredPlaces}
                selectedId={selectedId}
                onSelect={(id: string) => setSelectedId(id)}
                onHover={setHoverId}
              />
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
