'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

interface MapViewProps {
  center: google.maps.LatLngLiteral;
  zoom?: number;
}

export default function MapView({ center, zoom = 14 }: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places'],
    });

    let isMounted = true;
    loader.load().then(() => {
      if (!isMounted || !mapRef.current) return;
      const m = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapId: 'DEMO_MAP_ID', // optional: create a MapID in Cloud Console for custom styles later
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
      });
      setMap(m);
      new google.maps.Marker({ position: center, map: m });
    });

    return () => {
      isMounted = false;
    };
  }, [center, zoom]);

  return <div ref={mapRef} className="w-full h-[60vh] rounded-2xl border" />;
}