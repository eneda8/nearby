'use client';
import { useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

type Marker = {
  id: string;
  position: google.maps.LatLngLiteral;
  label?: string;
  link?: string;
};

interface MapViewProps {
  center: google.maps.LatLngLiteral;
  radiusMeters?: number;
  markers?: Marker[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
}

/** Compute a zoom level so that a circle of `radiusMeters`
 * fits inside the smaller map dimension with some margin.
 */
function setZoomForRadius(
  map: google.maps.Map,
  center: google.maps.LatLngLiteral,
  radiusMeters: number,
  marginRatio = 0.9 // 90% of the smaller dimension (tweak if you want tighter/looser)
) {
  if (!radiusMeters || radiusMeters <= 0) {
    map.setCenter(center);
    return;
  }
  const div = map.getDiv() as HTMLElement;
  const w = div.clientWidth || 800;
  const h = div.clientHeight || 600;
  const sizePx = Math.min(w, h) * marginRatio; // pixels available for the DIAMETER

  // meters per pixel we want
  const mpp = (2 * radiusMeters) / sizePx;

  // meters/pixel at zoom 0 at this latitude
  const latRad = (center.lat * Math.PI) / 180;
  const mppAtZoom0 = 156543.03392 * Math.cos(latRad);

  let z = Math.log2(mppAtZoom0 / mpp);
  // clamp to sane Google zooms
  z = Math.max(2, Math.min(21, z));

  map.setCenter(center);
  map.setZoom(z);
}

export default function MapView({
  center,
  radiusMeters = 0,
  markers = [],
  selectedId,
  onMarkerClick,
}: MapViewProps) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const originRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const markerRefs = useRef<Map<string, google.maps.Marker>>(new Map());
  const [apiReady, setApiReady] = useState(false);

  // Single loader; must match AddressInput options
  useEffect(() => {
    const loader = new Loader({
      apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY!,
      version: 'weekly',
      libraries: ['places'],
      id: '__googleMapsScriptId',
    });

    let cancelled = false;
    loader.load().then(() => {
      if (cancelled || !mapDivRef.current) return;

      const map = new google.maps.Map(mapDivRef.current, {
        center,
        zoom: 14,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        zoomControl: true,
      });
      mapRef.current = map;

      // origin pin (default red pin—you already differentiated elsewhere if needed)
      originRef.current = new google.maps.Marker({
        position: center,
        map,
      });

      // radius circle
      circleRef.current = new google.maps.Circle({
        map,
        strokeColor: '#2563eb',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        center,
        radius: radiusMeters,
        clickable: false,
      });

      // initial zoom to radius
      setZoomForRadius(map, center, radiusMeters);

      setApiReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Keep origin, circle, and zoom synced
  useEffect(() => {
    if (!apiReady || !mapRef.current) return;

    originRef.current?.setPosition(center);

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        map: mapRef.current,
        strokeColor: '#2563eb',
        strokeOpacity: 0.7,
        strokeWeight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.12,
        center,
        radius: radiusMeters,
        clickable: false,
      });
    } else {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radiusMeters);
    }

    setZoomForRadius(mapRef.current, center, radiusMeters);
  }, [apiReady, center, radiusMeters]);

  // Recompute zoom on window resize so the circle stays snug
  useEffect(() => {
    if (!apiReady || !mapRef.current) return;
    const handler = () => setZoomForRadius(mapRef.current!, center, radiusMeters);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [apiReady, center, radiusMeters]);

  // Render/update/remove POI markers
  useEffect(() => {
    if (!apiReady || !mapRef.current) return;

    // remove stale markers
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
  }, [apiReady, markers, onMarkerClick]);

  return <div ref={mapDivRef} className="w-full h-[60vh] rounded-2xl border" />;
}