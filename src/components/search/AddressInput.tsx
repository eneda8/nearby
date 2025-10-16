'use client';
import { useEffect, useRef } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface AddressInputProps {
  onPlace: (place: google.maps.places.PlaceResult) => void;
  placeholder?: string;
  showBranding?: boolean;
}

export default function AddressInput({ onPlace, placeholder = 'Enter an address', showBranding = true }: AddressInputProps) {
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
    <div className="flex flex-col gap-1.5">
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-gray-400">
          <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path stroke="currentColor" strokeWidth="2" d="M20 20l-3.65-3.65" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          autoComplete="off"
          className="w-full h-8 rounded-lg border border-gray-300 pl-7 pr-2.5 text-[11px] focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 placeholder:text-gray-400"
        />
      </div>
      {showBranding && (
        <div className="text-[10px] opacity-60 select-none">Powered by Google</div>
      )}
    </div>
  );
}
