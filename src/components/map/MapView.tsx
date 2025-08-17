'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

type LatLng = google.maps.LatLngLiteral;
type Marker = { id: string; position: LatLng; label?: string; link?: string };

interface MapViewProps {
  center: LatLng;
  radiusMeters?: number;
  markers?: Marker[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
}

export default function MapView({
  center,
  radiusMeters,
  markers = [],
  selectedId,
  onMarkerClick,
}: MapViewProps) {
  const divRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const originRef = useRef<google.maps.Marker | null>(null);
  const markerRefs = useRef<Map<string, google.maps.Marker>>(new Map());
  const [ready, setReady] = useState(false);

  // Single loader (must match AddressInput options exactly)
  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places'],
      id: '__googleMapsScriptId',
    });

    let cancelled = false;
    loader.load().then(() => {
      if (cancelled || !divRef.current) return;

      const map = new google.maps.Map(divRef.current, {
        center,
        zoom: 14,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
      });
      mapRef.current = map;

      // Origin marker (kept simple; high zIndex so it stays visible)
      originRef.current = new google.maps.Marker({
        position: center,
        map,
        title: 'Origin',
        clickable: false,
        zIndex: 9999,
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
        scale: 8,
        fillColor: '#1a73e8',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        }
      });

      // Radius circle
      circleRef.current = new google.maps.Circle({
        map,
        center,
        radius: radiusMeters ?? 0,
        strokeColor: '#2563eb',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        clickable: false,
      });

      setReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep origin + circle synced and ALWAYS fit to radius when it changes
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    mapRef.current.setCenter(center);
    originRef.current?.setPosition(center);

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map: mapRef.current,
        center,
        radius: radiusMeters ?? 0,
        strokeColor: '#2563eb',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        clickable: false,
      });
    } else {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radiusMeters ?? 0);
    }

    // Fit viewport to the circle (padding so the stroke isn’t glued to the edge)
    if (radiusMeters && radiusMeters > 0) {
      const b = circleRef.current.getBounds();
      if (b) mapRef.current.fitBounds(b, 48);
    }
  }, [ready, center, radiusMeters]);

  // POI markers (no style changes)
  useEffect(() => {
    if (!ready || !mapRef.current) return;

    // remove markers no longer present
    for (const [id, mk] of markerRefs.current.entries()) {
      if (!markers.find((m) => m.id === id)) {
        mk.setMap(null);
        markerRefs.current.delete(id);
      }
    }

    // add/update markers
    markers.forEach((m) => {
      let mk = markerRefs.current.get(m.id);
      if (!mk) {
        mk = new google.maps.Marker({
          position: m.position,
          map: mapRef.current!,
          title: m.label,
        });
        if (onMarkerClick) mk.addListener('click', () => onMarkerClick(m.id));
        markerRefs.current.set(m.id, mk);
      } else {
        mk.setPosition(m.position);
        mk.setTitle(m.label ?? '');
      }
    });
  }, [ready, markers, onMarkerClick]);

  // very light “selected” pulse only (no hover, no scroll)
  useEffect(() => {
    if (!ready) return;
    markerRefs.current.forEach((mk) => mk.setAnimation(null));
    if (selectedId) {
      const mk = markerRefs.current.get(selectedId);
      mk?.setAnimation(google.maps.Animation.BOUNCE);
      setTimeout(() => mk?.setAnimation(null), 700);
    }
  }, [ready, selectedId]);

  return <div ref={divRef} className="w-full h-[60vh] rounded-2xl border" />;
}