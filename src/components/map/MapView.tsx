'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

type MarkerInput = {
  id: string;
  position: { lat: number; lng: number };
  label?: string;
  link?: string; // Google Maps URL if available
};

interface MapViewProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MarkerInput[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
  origin?: { lat: number; lng: number }; // show a distinct pin for the searched address
}

function buildInfoHtml(mk: MarkerInput) {
  const title = mk.label ?? '';
  const linkHtml = mk.link
    ? `<a href="${mk.link}" target="_blank" rel="noreferrer">Open in Google Maps</a>`
    : '';
  return `
    <div style="max-width:220px">
      <div style="font-weight:600;margin-bottom:4px">${title}</div>
      ${linkHtml}
    </div>
  `;
}

export default function MapView({
  center,
  zoom = 14,
  markers = [],
  selectedId = null,
  onMarkerClick,
  origin,
}: MapViewProps) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const markerRefs = useRef<Array<{ id: string; marker: google.maps.Marker; data: MarkerInput }>>([]);
  const infoRef = useRef<google.maps.InfoWindow | null>(null);
  const originRef = useRef<google.maps.Marker | null>(null);

  // init map once
  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places'],
    });

    let mounted = true;
    loader.load().then(() => {
      if (!mounted || !mapRef.current) return;
      const m = new google.maps.Map(mapRef.current, {
        center,
        zoom,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
      });
      setMap(m);
      infoRef.current = new google.maps.InfoWindow();
    });
    return () => {
      mounted = false;
    };
  }, []);

  // keep center in sync
  useEffect(() => {
    if (map) map.setCenter(center);
  }, [center, map]);

  // render/update the ORIGIN marker
  useEffect(() => {
    if (!map || !origin) return;
    // remove previous origin marker
    if (originRef.current) originRef.current.setMap(null);

    originRef.current = new google.maps.Marker({
      position: origin,
      map,
      zIndex: 9999,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#1a73e8',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
      },
      title: 'Start',
    });
  }, [map, origin]);

  // (re)render result markers
  useEffect(() => {
    if (!map) return;

    // clear old markers
    markerRefs.current.forEach(({ marker }) => marker.setMap(null));
    markerRefs.current = [];

    markers.forEach((mk) => {
      const marker = new google.maps.Marker({
        position: mk.position,
        map,
        title: mk.label,
      });

      marker.addListener('click', () => {
        if (!infoRef.current) return;
        infoRef.current.setContent(buildInfoHtml(mk));
        infoRef.current.open({ map, anchor: marker });
        onMarkerClick?.(mk.id);
      });

      markerRefs.current.push({ id: mk.id, marker, data: mk });
    });
  }, [markers, map, onMarkerClick]);

  // open info bubble when a list item selects a marker
  useEffect(() => {
    if (!map || !selectedId) return;
    const entry = markerRefs.current.find((m) => m.id === selectedId);
    if (!entry) return;
    const { marker, data } = entry;
    map.panTo(marker.getPosition()!);
    if (infoRef.current) {
      infoRef.current.setContent(buildInfoHtml(data));
      infoRef.current.open({ map, anchor: marker });
    }
  }, [selectedId, map]);

  return <div ref={mapRef} className="w-full rounded-2xl border" style={{ height: '60vh' }} />;
}