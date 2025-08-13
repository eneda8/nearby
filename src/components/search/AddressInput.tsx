'use client';
import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface AddressInputProps {
  onPlace: (place: google.maps.places.PlaceResult) => void;
}

export default function AddressInput({ onPlace }: AddressInputProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const elementRef = useRef<any | null>(null); // keep a handle to the widget so we don't create two

  useEffect(() => {
    if (elementRef.current) return; // already initialized (prevents Strict Mode dupes)

    let canceled = false;
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places'],
    });

    loader.load().then(async () => {
      if (canceled || !containerRef.current) return;

      // Clear container in case of hot reloads
      containerRef.current.innerHTML = '';

      const placesLib = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;
      // @ts-ignore - runtime-provided element class
      const pac: any = new google.maps.places.PlaceAutocompleteElement({});
      elementRef.current = pac;

      pac.setAttribute('aria-label', 'Enter an address');
      containerRef.current.appendChild(pac);

      pac.addEventListener('gmp-select', async (e: any) => {
        const place = e.placePrediction.toPlace();
        await place.fetchFields({ fields: ['formattedAddress', 'displayName', 'location', 'id'] });

        const result = {
          place_id: place.id,
          formatted_address: place.formattedAddress,
          name: place.displayName,
          geometry: { location: place.location },
        } as unknown as google.maps.places.PlaceResult;

        onPlace(result);
      });
    });

    return () => {
      canceled = true;
    };
  }, [onPlace]);

  return (
    <div className="space-y-1">
      <label className="text-sm font-medium">Enter an address</label>
      <div ref={containerRef} className="relative" />
      <div className="text-xs opacity-60 select-none mt-1">Powered by Google</div>
    </div>
  );
}