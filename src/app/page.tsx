'use client';

import { useState } from 'react';
import MapView from '@/components/map/MapView';
import AddressInput from '@/components/search/AddressInput';
import Controls from '@/components/search/Controls';

export default function HomePage() {
  const [center, setCenter] = useState<{ lat: number; lng: number }>({
    lat: 40.7128,
    lng: -74.0060,
  });

  return (
    <main className="max-w-6xl mx-auto p-6 space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight">Nearby</h1>
        <p className="text-muted-foreground">
          Find places near any address — map + list, with real travel times.
        </p>
      </header>

      <section className="grid gap-4">
        <AddressInput
          onPlace={(place) => {
            const loc = place.geometry!.location!;
            setCenter({ lat: loc.lat(), lng: loc.lng() });
          }}
        />
        <Controls />
      </section>

      <section>
        <MapView center={center} />
      </section>
    </main>
  );
}
