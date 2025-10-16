'use client';
import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface AddressInputProps {
  onPlace: (place: google.maps.places.PlaceResult) => void;
}

export default function AddressInput({ onPlace }: AddressInputProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);

  useEffect(() => {
    let canceled = false;
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places'],
    });

    loader.load().then(async () => {
      if (canceled || !inputRef.current) return;

      const placesLib = (await google.maps.importLibrary('places')) as google.maps.PlacesLibrary;

      autocompleteRef.current = new placesLib.Autocomplete(inputRef.current, {
        fields: ['place_id', 'formatted_address', 'geometry', 'name'],
        types: ['geocode'],
      });

      listenerRef.current = autocompleteRef.current.addListener('place_changed', () => {
        const place = autocompleteRef.current?.getPlace();
        if (!place || !place.geometry?.location) return;
        onPlace(place as google.maps.places.PlaceResult);
      });
    });

    return () => {
      canceled = true;
      listenerRef.current?.remove();
      listenerRef.current = null;
      autocompleteRef.current = null;
    };
  }, [onPlace]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-400">
          <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path stroke="currentColor" strokeWidth="2" d="M20 20l-3.65-3.65" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder="Enter an address"
          autoComplete="off"
          className="w-full h-11 rounded-lg border border-gray-300 pl-10 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="text-xs opacity-60 select-none">Powered by Google</div>
    </div>
  );
}
