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
  className?: string;
  showOrigin?: boolean;
  showRadius?: boolean;
  panOffsetPixels?: { x: number; y: number };
  hoverId?: string | null;
}

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f4f4f4' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4b5563' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  {
    featureType: 'poi.park',
    elementType: 'geometry',
    stylers: [
      { visibility: 'on' },
      { color: '#ccead2' },
    ],
  },
  {
    featureType: 'poi.park',
    elementType: 'labels.text.fill',
    stylers: [{ color: '#4f6f52' }],
  },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#ffffff' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#d3d8e0' }] },
  { featureType: 'road.highway', elementType: 'geometry.fill', stylers: [{ color: '#f1f3f6' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#cde6ff' }] },
];

function setZoomForRadius(
  map: google.maps.Map,
  center: google.maps.LatLngLiteral,
  radiusMeters: number,
  marginRatio = 0.9
) {
  if (!radiusMeters || radiusMeters <= 0) {
    map.setCenter(center);
    return;
  }

  const div = map.getDiv() as HTMLElement;
  const w = div.clientWidth || 800;
  const h = div.clientHeight || 600;
  const sizePx = Math.min(w, h) * marginRatio;

  const mpp = (2 * radiusMeters) / sizePx;
  const latRad = (center.lat * Math.PI) / 180;
  const mppAtZoom0 = 156543.03392 * Math.cos(latRad);
  let z = Math.log2(mppAtZoom0 / mpp);
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
  className,
  showOrigin = true,
  showRadius = true,
  panOffsetPixels,
  hoverId,
}: MapViewProps) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const originRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const markerRefs = useRef<Map<string, google.maps.Marker>>(new Map());
  const [apiReady, setApiReady] = useState(false);

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
        fullscreenControl: true,
        mapTypeControl: false,
        zoomControl: true,
        scaleControl: true,
        styles: MAP_STYLE,
      });

      map.setOptions({
        zoomControlOptions: { position: google.maps.ControlPosition.LEFT_BOTTOM },
        fullscreenControlOptions: { position: google.maps.ControlPosition.RIGHT_BOTTOM },
      });

      mapRef.current = map;

      if (panOffsetPixels) {
        map.panBy(panOffsetPixels.x, panOffsetPixels.y);
      }

      if (showOrigin) {
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
          },
        });
      }

      if (showRadius && radiusMeters > 0) {
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
      }

      setZoomForRadius(map, center, radiusMeters);
      setApiReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!apiReady || !mapRef.current) return;

    if (showOrigin) {
      if (!originRef.current && mapRef.current) {
        originRef.current = new google.maps.Marker({
          position: center,
          map: mapRef.current,
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
          },
        });
      } else {
        originRef.current?.setPosition(center);
      }
    } else if (originRef.current) {
      originRef.current.setMap(null);
      originRef.current = null;
    }

    if (showRadius && radiusMeters > 0) {
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
        circleRef.current.setMap(mapRef.current);
        circleRef.current.setCenter(center);
        circleRef.current.setRadius(radiusMeters);
      }
    } else if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }

    setZoomForRadius(mapRef.current, center, radiusMeters);
    if (panOffsetPixels) {
      mapRef.current.panBy(panOffsetPixels.x, panOffsetPixels.y);
    }
  }, [apiReady, center, radiusMeters, showOrigin, showRadius, panOffsetPixels]);

  useEffect(() => {
    if (!apiReady || !mapRef.current) return;
    const handler = () => setZoomForRadius(mapRef.current!, center, radiusMeters);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, [apiReady, center, radiusMeters]);

  useEffect(() => {
    if (!apiReady || !mapRef.current) return;

    const g = window.google;
    if (!g?.maps) return;

    const makeIcon = (color: string, scale = 1) => {
      const size = 24 * scale;
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}"><path d="M12 2C8.134 2 5 5.134 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.866-3.134-7-7-7zm0 9.5c-1.379 0-2.5-1.121-2.5-2.5S10.621 6.5 12 6.5s2.5 1.121 2.5 2.5S13.379 11.5 12 11.5z"/></svg>`;
      return {
        url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
        scaledSize: new g.maps.Size(size, size),
        anchor: new g.maps.Point(size / 2, size),
      };
    };

    const baseIcon = makeIcon('#f43f5e', 1);
    const hoverIcon = makeIcon('#2563eb', 1.1);
    const selectedIcon = makeIcon('#ef4444', 1.2);

    for (const [id, mk] of markerRefs.current.entries()) {
      if (!markers.find((m) => m.id === id)) {
        mk.setMap(null);
        markerRefs.current.delete(id);
      }
    }

    markers.forEach((marker) => {
      let mk = markerRefs.current.get(marker.id);
      if (!mk) {
        mk = new g.maps.Marker({
          position: marker.position,
          map: mapRef.current!,
          title: marker.label,
          icon: baseIcon,
          zIndex: 10,
        });
        if (onMarkerClick) mk.addListener('click', () => onMarkerClick(marker.id));
        markerRefs.current.set(marker.id, mk);
      } else {
        mk.setPosition(marker.position);
        mk.setTitle(marker.label ?? '');
      }

      let icon = baseIcon;
      let zIndex = 10;
      if (selectedId === marker.id) {
        icon = selectedIcon;
        zIndex = 30;
      } else if (hoverId === marker.id) {
        icon = hoverIcon;
        zIndex = 20;
      }

      mk.setIcon(icon);
      mk.setZIndex(zIndex);
    });
  }, [apiReady, markers, onMarkerClick, hoverId, selectedId]);

  const containerClass = className ?? 'w-full h-[60vh] rounded-2xl border';
  return <div ref={mapDivRef} className={containerClass} />;
}
