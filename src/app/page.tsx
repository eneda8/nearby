'use client';

import { useEffect, useMemo, useState } from 'react';
import MapView from '@/components/map/MapView';
import AddressInput from '@/components/search/AddressInput';
import Controls from '@/components/search/Controls';
import ResultsList, { PlaceItem } from '@/components/search/ResultsList';
import Filters, { type Selection } from '@/components/search/Filters';
import { CATEGORIES } from '@/lib/categories';

const DEV_ORIGIN = process.env.NEXT_PUBLIC_DEV_ORIGIN
  ? process.env.NEXT_PUBLIC_DEV_ORIGIN.split(',').map(Number)
  : null;

export default function HomePage() {
  // Map origin/center (set after user picks an address)
  const [center, setCenter] = useState<{lat:number;lng:number}>(
  DEV_ORIGIN ? { lat: DEV_ORIGIN[0], lng: DEV_ORIGIN[1] } : { lat: 40.7128, lng: -74.006 }
  );
  const [haveOrigin, setHaveOrigin] = useState<boolean>(!!DEV_ORIGIN);

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

  // Open now toggle
  const [hoverId, setHoverId] = useState<string | null>(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Map markers
  const markers = useMemo(
    () => places.map((p) => ({ id: p.id, position: p.location, label: p.name, link: p.googleMapsUri })),
    [places]
  );

  useEffect(() => {
    if (!haveOrigin) return;
    const controller = new AbortController();

    if(!includedTypes?.length) return;
    
    (async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedId(null);

        // 1) Nearby search (Places API New)
        const res = await fetch('/api/places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: center.lat,
            lng: center.lng,
            radiusMeters,
            includedTypes, // derived from Filters
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Places request failed: ${text}`);
        }

        let items: PlaceItem[] = (await res.json()).places || [];

        // 2) Route Matrix for top N (travel time + distance)
        const top = items.slice(0, 15);
        const destinations = top
          .map((p) => p.location)
          .filter(
            (loc) =>
              loc &&
              typeof loc.lat === 'number' &&
              Number.isFinite(loc.lat) &&
              typeof loc.lng === 'number' &&
              Number.isFinite(loc.lng)
          );

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
              if (!Number.isInteger(idx) || !top[idx]) return;

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

              if (mode === 'DRIVE') {
                if (durSec != null) top[idx].driveDurationSec = durSec;
                if (distanceMeters != null) {
                  top[idx].driveDistanceMeters = distanceMeters;
                  top[idx].distanceMeters = distanceMeters;
                }
              } else if (mode === 'WALK') {
                if (durSec != null) top[idx].walkDurationSec = durSec;
                if (distanceMeters != null) {
                  top[idx].walkDistanceMeters = distanceMeters;
                  if (top[idx].distanceMeters == null) {
                    top[idx].distanceMeters = distanceMeters;
                  }
                }
              } else {
                if (durSec != null && top[idx].driveDurationSec == null) {
                  top[idx].driveDurationSec = durSec;
                }
                if (distanceMeters != null && top[idx].distanceMeters == null) {
                  top[idx].distanceMeters = distanceMeters;
                }
              }
            });

            // Merge back
            items = [...top, ...items.slice(15)];
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
  }, [center, radiusMeters, haveOrigin, includedTypes]);

  const hasAnyDuration = useMemo(
    () => places.some((p) => typeof p.driveDurationSec === 'number' || typeof p.walkDurationSec === 'number'),
    [places]
  );

  return (
    <main className="min-h-screen bg-[#f7f5f2] py-6 px-4 sm:px-6 lg:px-10 xl:px-14">
      <div className="w-full max-w-7xl mx-auto">
        <header className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nearby</h1>
          </div>
        </header>

        <div className="text-sm text-gray-600 mb-3">
          Select a radius and category to see what's nearby this address.
        </div>

        {/* Search bar */}
        <div className="bg-white rounded-xl shadow border p-4 mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
          <div className="flex-1 min-w-0">
            <AddressInput onPlace={(place) => {
              const loc = place.geometry!.location!;
              setCenter({ lat: loc.lat(), lng: loc.lng() });
              setHaveOrigin(true);
              setSelectedId(null);
            }} />
          </div>
          <div className="flex flex-wrap gap-4 items-center lg:justify-end">
            <Controls onRadiusChange={setRadiusMeters} />
            <div className="flex items-center gap-2">
              <span className="text-sm whitespace-nowrap">Open now only</span>
              <button
                type="button"
                aria-pressed={openNowOnly}
                onClick={() => setOpenNowOnly((v) => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors duration-200 ${openNowOnly ? 'bg-green-500' : 'bg-gray-300'}`}
                style={{ minWidth: 40 }}
              >
                <span
                  className={`absolute left-0 top-0 w-6 h-6 bg-white rounded-full shadow transition-transform duration-200 ${openNowOnly ? 'translate-x-4' : ''}`}
                  style={{ transform: openNowOnly ? 'translateX(16px)' : 'none' }}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Interactive Filters */}
        <div className="bg-white rounded-xl shadow border p-4 mb-4">
          <Filters selections={selections} onChange={setSelections} />
        </div>

        {/* Main two-column layout: results and map */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1.45fr)] gap-6">
          {/* Results List */}
          <div>
            <div className="bg-white rounded-xl shadow border p-4">
              {/* States */}
              {!haveOrigin && <div className="opacity-70">Enter an address to get started.</div>}
              {loading && <div className="opacity-70">Searching nearby…</div>}
              {error && <div className="text-red-600 break-all">{error}</div>}
              {!loading && haveOrigin && !hasAnyDuration && places.length > 0 && (
                <div className="text-sm opacity-70">Showing distance only (enable Routes API on the server key to see minutes).</div>)}
              {!loading && haveOrigin && places.length === 0 && !error && (
                <div className="opacity-70">No places match your filters here. Try a larger radius or different categories.</div>)}

              <ResultsList
                items={filteredPlaces}
                selectedId={selectedId}
                onSelect={(id: string) => setSelectedId(id)}
              />
            </div>
          </div>
          {/* Map */}
          <div>
            <div className="bg-white rounded-xl shadow border p-2 flex items-center justify-center min-h-[400px] lg:min-h-[500px]">
              <MapView
                center={center}
                radiusMeters={radiusMeters}
                markers={markers}
                selectedId={selectedId}
                onMarkerClick={(id: string) => setSelectedId(id)}
              />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
