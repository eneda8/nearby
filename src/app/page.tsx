'use client';

import { useEffect, useMemo, useState } from 'react';
import MapView from '@/components/map/MapView';
import AddressInput from '@/components/search/AddressInput';
import Controls, { TravelMode } from '@/components/search/Controls';
import ResultsList, { PlaceItem } from '@/components/search/ResultsList';
import Filters, { type Selection } from '@/components/search/Filters';
import { CATEGORIES, POPULAR_TYPES } from '@/lib/categories';

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
  const [mode, setMode] = useState<TravelMode>('DRIVE');

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
            includedTypes, // derived from Filters (or POPULAR_TYPES)
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
              travelMode: mode,
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
              const idx = el.destinationIndex;
              if (typeof idx !== 'number' || !top[idx]) return;

              // duration can be "523s" or { seconds: 523 }
              let durSec: number | undefined;
              if (typeof el.duration === 'string') {
                const m = el.duration.match(/^(\d+(?:\.\d+)?)s$/);
                if (m) durSec = Number(m[1]);
              } else if (el.duration?.seconds != null) {
                durSec = Number(el.duration.seconds);
              }

              top[idx].durationSec = durSec;
              if (typeof el.distanceMeters === 'number') {
                top[idx].distanceMeters = el.distanceMeters;
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

        // Default sort: travel time (asc), then straight-line distance
        items.sort((a, b) => {
          const ta = a.durationSec ?? Number.POSITIVE_INFINITY;
          const tb = b.durationSec ?? Number.POSITIVE_INFINITY;
          if (ta !== tb) return ta - tb;
          const da = a.directDistanceMeters ?? Number.POSITIVE_INFINITY;
          const db = b.directDistanceMeters ?? Number.POSITIVE_INFINITY;
          return da - db;
        });

        setPlaces(items);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message || 'Request failed');
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [center, radiusMeters, mode, haveOrigin, includedTypes]);

  const hasAnyDuration = useMemo(() => places.some((p) => typeof p.durationSec === 'number'), [places]);

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Nearby</h1>
        <p className="text-muted-foreground">Find places near any address — map + list, with real travel times.</p>
      </header>

      <section className="grid gap-4">
        <AddressInput
          onPlace={(place) => {
            const loc = place.geometry!.location!;
            setCenter({ lat: loc.lat(), lng: loc.lng() });
            setHaveOrigin(true);
            setSelectedId(null);
          }}
        />

        {/* Clean filters (chips + More drawer + tokens) */}
        <Filters selections={selections} onChange={setSelections} />

        <Controls onRadiusChange={setRadiusMeters} onModeChange={setMode} />
      </section>

      <section>
        <MapView
          center={center}
          radiusMeters={radiusMeters}
          markers={markers}
          selectedId={selectedId}
          onMarkerClick={(id: string) => setSelectedId(id)}
        />
      </section>

      {/* States */}
      {!haveOrigin && <div className="opacity-70">Enter an address to get started.</div>}
      {loading && <div className="opacity-70">Searching nearby…</div>}
      {error && <div className="text-red-600 break-all">{error}</div>}
      {!loading && haveOrigin && !hasAnyDuration && places.length > 0 && (
        <div className="text-sm opacity-70">Showing distance only (enable Routes API on the server key to see minutes).</div>
      )}
      {!loading && haveOrigin && places.length === 0 && !error && (
        <div className="opacity-70">No places match your filters here. Try a larger radius or different categories.</div>
      )}

      <ResultsList
        items={places}
        selectedId={selectedId}
        onSelect={(id: string) => setSelectedId(id)}
      />
    </main>
  );
}