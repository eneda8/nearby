'use client';

import { useEffect, useMemo, useState } from 'react';
import MapView from '@/components/map/MapView';
import AddressInput from '@/components/search/AddressInput';
import Controls from '@/components/search/Controls';
import ResultsList, { PlaceItem } from '@/components/search/ResultsList';
import Filters, { type Selection } from '@/components/search/Filters';
import Toggle from '@/components/ui/Toggle';
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

    if (!includedTypes?.length) {
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
  }, [center, radiusMeters, haveOrigin, includedTypes]);

  return (
    <main className="min-h-screen bg-[#f7f5f2] py-5 px-3 sm:px-6 lg:px-9 xl:px-12 text-[13px]">
      <div className="w-full max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Nearby</h1>
          </div>
        </header>

        <div className="text-[11px] text-gray-600 mb-2">
          Select a radius and category to see what's nearby this address.
        </div>

        {/* Search bar */}
        <div className="bg-white rounded-xl shadow border p-2.5 mb-2.5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between lg:gap-3.5">
          <div className="flex-1 min-w-0">
            <AddressInput onPlace={(place) => {
              const loc = place.geometry!.location!;
              setCenter({ lat: loc.lat(), lng: loc.lng() });
              setHaveOrigin(true);
              setSelectedId(null);
            }} />
          </div>
          <div className="flex flex-wrap gap-2.5 items-center lg:justify-end">
            <Controls onRadiusChange={setRadiusMeters} />
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-medium whitespace-nowrap">Open now only</span>
              <Toggle checked={openNowOnly} onChange={setOpenNowOnly} />
            </div>
          </div>
        </div>

        {/* Interactive Filters */}
        <div className="bg-white rounded-xl shadow border p-2.5 mb-2.5">
          <Filters
            selections={selections}
            onChange={setSelections}
            onClearAll={() => {
              setPlaces([]);
              setSelectedId(null);
            }}
          />
        </div>

        {/* Main two-column layout: results and map */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-4">
          {/* Map */}
          <div className="order-2 lg:order-1">
            <div className="bg-white rounded-xl shadow border p-1.5 flex items-center justify-center min-h-[340px] lg:min-h-[420px]">
              <MapView
                center={center}
                radiusMeters={radiusMeters}
                markers={markers}
                selectedId={selectedId}
                onMarkerClick={(id: string) => setSelectedId(id)}
              />
            </div>
          </div>
          {/* Results List */}
          <div className="order-1 lg:order-2">
            <div className="bg-white rounded-xl shadow border p-2.5">
              {/* States */}
              {!haveOrigin && <div className="opacity-70">Enter an address to get started.</div>}
              {loading && <div className="opacity-70">Searching nearby…</div>}
              {error && <div className="text-red-600 break-all">{error}</div>}
              {!loading && haveOrigin && places.length === 0 && !error && (
                <div className="opacity-70">No places match your filters here. Try a larger radius or different categories.</div>)}
              {!loading && haveOrigin && filteredPlaces.length === 0 && places.length > 0 && openNowOnly && (
                <div className="text-sm opacity-70">Everything here is closed right now. Turn off &ldquo;Open now only&rdquo; or try another category.</div>
              )}
              {filteredPlaces.length > 0 && (
                <ResultsList
                  items={filteredPlaces}
                  selectedId={selectedId}
                  onSelect={(id: string) => setSelectedId(id)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
