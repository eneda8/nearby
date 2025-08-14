'use client';

import { useEffect, useMemo, useState } from 'react';
import MapView from '@/components/map/MapView';
import AddressInput from '@/components/search/AddressInput';
import Controls, { TravelMode } from '@/components/search/Controls';
import ResultsList, { PlaceItem } from '@/components/search/ResultsList';
import CategoryFilters, { CATEGORY_TYPES, CategoryKey } from '@/components/search/CategoryFilters';

export default function HomePage() {
  const [center, setCenter] = useState<{ lat: number; lng: number }>({ lat: 40.7128, lng: -74.006 });
  const [haveOrigin, setHaveOrigin] = useState(false);

  const [radiusMeters, setRadiusMeters] = useState(1609.344);
  const [mode, setMode] = useState<TravelMode>('DRIVE');
  const [category, setCategory] = useState<CategoryKey>('groceries');

  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const markers = useMemo(
    () => places.map((p) => ({ id: p.id, position: p.location, label: p.name, link: p.googleMapsUri })),
    [places]
  );

  useEffect(() => {
    if (!haveOrigin) return;
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedId(null);

        const res = await fetch('/api/places', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: center.lat,
            lng: center.lng,
            radiusMeters,
            includedTypes: CATEGORY_TYPES[category],
          }),
          signal: controller.signal,
        });
        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Places request failed: ${text}`);
        }
        let items: PlaceItem[] = (await res.json()).places || [];

        const top = items.slice(0, 15);
        if (top.length) {
          const res2 = await fetch('/api/route-matrix', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              origin: center,
              destinations: top.map((p) => p.location),
              travelMode: mode,
            }),
            signal: controller.signal,
          });
          if (res2.ok) {
            const { elements } = await res2.json();
            elements?.forEach((el: any) => {
              const idx = el.destinationIndex;
                if (typeof idx !== 'number' || !top[idx]) return;

                // duration can be "523s" OR { seconds: 523, nanos: 0 }
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
          }
          items = [...top, ...items.slice(15)];
        }

        setPlaces(items);
      } catch (e: any) {
        if (e.name !== 'AbortError') setError(e.message || 'Request failed');
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [center, radiusMeters, mode, category, haveOrigin]);

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
        <CategoryFilters value={category} onChange={setCategory} />
        <Controls onRadiusChange={setRadiusMeters} onModeChange={setMode} />
      </section>

      <section>
        <MapView
          center={center}
          origin={center}
          markers={markers}
          selectedId={selectedId}
          onMarkerClick={(id) => setSelectedId(id)}
        />
      </section>

      {loading && <div className="opacity-70">Loading…</div>}
      {error && <div className="text-red-600">{error}</div>}

      <ResultsList items={places} selectedId={selectedId} onSelect={(id) => setSelectedId(id)} />
    </main>
  );
}
