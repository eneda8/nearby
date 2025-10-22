'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Loader } from '@googlemaps/js-api-loader';

type Marker = {
  id: string;
  position: google.maps.LatLngLiteral;
  label?: string;
  link?: string;
  name?: string;
  address?: string;
  googleMapsUri?: string;
  websiteUri?: string;
  openNow?: boolean;
  weekdayText?: string[];
  primaryType?: string;
  isPinned?: boolean;
};

interface MapViewProps {
  center: google.maps.LatLngLiteral;
  radiusMeters?: number;
  markers?: Marker[];
  selectedId?: string | null;
  onMarkerClick?: (id: string) => void;
  onMarkerHover?: (id: string | null) => void;
  className?: string;
  showOrigin?: boolean;
  showRadius?: boolean;
  hoverId?: string | null;
}

const MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: 'geometry', stylers: [{ color: '#f4f4f4' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4b5563' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#ffffff' }] },
  { featureType: 'administrative', elementType: 'geometry', stylers: [{ visibility: 'on' }] },
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

const escapeHtml = (value?: string | null) =>
  value
    ? value.replace(/[&<>"']/g, (chr) => {
        switch (chr) {
          case '&':
            return '&amp;';
          case '<':
            return '&lt;';
          case '>':
            return '&gt;';
          case '"':
            return '&quot;';
          case "'":
            return '&#39;';
          default:
            return chr;
        }
      })
    : '';

const escapeAttr = (value?: string | null) =>
  escapeHtml(value)?.replace(/`/g, '&#96;');

const getTodayHours = (weekdayText?: string[]) => {
  if (!weekdayText?.length) return undefined;
  const day = new Date().getDay(); // 0 = Sunday
  if (weekdayText.length === 7) {
    const idx = day === 0 ? 6 : day - 1;
    return weekdayText[idx] ?? weekdayText[0];
  }
  return weekdayText[0];
};

const buildInfoContent = (data: Marker) => {
  const name = escapeHtml(data.name ?? 'Unknown');
  const address = escapeHtml(data.address ?? '');
  const status =
    typeof data.openNow === 'boolean'
      ? data.openNow
        ? 'Open now'
        : 'Closed'
      : '';
  const statusColor = data.openNow ? '#15803d' : '#dc2626';
  const hours = getTodayHours(data.weekdayText);
  const links: string[] = [];
  if (data.websiteUri) {
    links.push(
      `<a href="${escapeAttr(data.websiteUri)}" target="_blank" rel="noopener" style="color:#1d4ed8;font-weight:500;text-decoration:none;">Website</a>`
    );
  }
  if (data.googleMapsUri) {
    links.push(
      `<a href="${escapeAttr(data.googleMapsUri)}" target="_blank" rel="noopener" style="color:#1d4ed8;font-weight:500;text-decoration:none;">Google Maps</a>`
    );
  }
  const linksHtml = links.length
    ? `<div style="display:flex;gap:12px;flex-wrap:wrap;">${links.join('')}</div>`
    : '';

  return `

      <div style="font-weight:600;font-size:14px;margin-bottom:4px;">${name}</div>
      ${address ? `<div style="color:#475569;margin-bottom:6px;">${address}</div>` : ''}
      ${status ? `<div style="margin-bottom:6px;"><span style="display:inline-block;padding:2px 8px;border-radius:9999px;background:${
        data.openNow ? '#dcfce7' : '#fee2e2'
      };color:${statusColor};font-weight:600;font-size:11px;">${status}</span></div>` : ''}
      ${hours ? `<div style="color:#475569;margin-bottom:6px;">${escapeHtml(hours)}</div>` : ''}
      ${linksHtml}
   
  `;
};

function setZoomForRadius(
  map: google.maps.Map,
  center: google.maps.LatLngLiteral,
  radiusMeters: number,
  marginRatio = 0.9
) {
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
  onMarkerHover,
  className,
  showOrigin = true,
  showRadius = true,
  hoverId,
}: MapViewProps) {
  const mapDivRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const originRef = useRef<google.maps.Marker | null>(null);
  const circleRef = useRef<google.maps.Circle | null>(null);
  const markerRefs = useRef<Map<string, { marker: google.maps.Marker; data: Marker; listenersAttached?: boolean }>>(new Map());
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const [apiReady, setApiReady] = useState(false);
  const previousViewRef = useRef<{ center: google.maps.LatLngLiteral; radius: number } | null>(null);
  const openInfoWindow = useCallback(
    (id: string) => {
      if (!mapRef.current) return;
      const meta = markerRefs.current.get(id);
      if (!meta) return;
      if (!infoWindowRef.current) {
        infoWindowRef.current = new google.maps.InfoWindow();
      }
      infoWindowRef.current.setContent(buildInfoContent(meta.data));
      infoWindowRef.current.open({
        map: mapRef.current,
        anchor: meta.marker,
        shouldFocus: false,
      });
    },
    []
  );

  useEffect(() => {
    if (mapRef.current) return;
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
  }, [center, radiusMeters, showOrigin, showRadius]);

  useEffect(() => {
    if (!apiReady || !mapRef.current) return;

    const map = mapRef.current;
    const g = window.google;
    const previous = previousViewRef.current;
    const centerChanged =
      !previous ||
      previous.center.lat !== center.lat ||
      previous.center.lng !== center.lng;
    const radiusChanged = !previous || previous.radius !== radiusMeters;

    if (radiusChanged || !previous) {
      setZoomForRadius(map, center, radiusMeters);
    }

    if (centerChanged || !previous) {
      if (g?.maps) {
        map.panTo(center);
      } else {
        map.setCenter(center);
      }
    }

    previousViewRef.current = { center, radius: radiusMeters };

    if (showOrigin) {
      if (!originRef.current) {
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
      } else {
        originRef.current.setMap(map);
        originRef.current.setPosition(center);
      }
    } else if (originRef.current) {
      originRef.current.setMap(null);
      originRef.current = null;
    }

    if (showRadius && radiusMeters > 0) {
      if (!circleRef.current) {
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
      } else {
        circleRef.current.setMap(map);
        circleRef.current.setCenter(center);
        circleRef.current.setRadius(radiusMeters);
      }
    } else if (circleRef.current) {
      circleRef.current.setMap(null);
      circleRef.current = null;
    }
  }, [apiReady, center, radiusMeters, showOrigin, showRadius]);

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

    const baseIcon = makeIcon('#f43f5e', 1.5);
    const hoverIcon = makeIcon('#2563eb', 1.7);
    const selectedIcon = makeIcon('#ef4444', 1.8);
    const pinnedIcon = makeIcon('#f97316', 1.6);
    const pinnedHoverIcon = makeIcon('#fb923c', 1.75);
    const pinnedSelectedIcon = makeIcon('#ea580c', 1.9);

    for (const [id, meta] of markerRefs.current.entries()) {
      if (!markers.find((m) => m.id === id)) {
        meta.marker.setMap(null);
        markerRefs.current.delete(id);
      }
    }

    markers.forEach((marker) => {
      let meta = markerRefs.current.get(marker.id);
      if (!meta) {
        const mk = new g.maps.Marker({
          position: marker.position,
          map: mapRef.current!,
          title: marker.label,
          icon: baseIcon,
          zIndex: 10,
        });
        mk.addListener('click', () => {
          openInfoWindow(marker.id);
          onMarkerClick?.(marker.id);
        });
        mk.addListener('mouseover', () => {
          onMarkerHover?.(marker.id);
        });
        mk.addListener('mouseout', () => {
          onMarkerHover?.(null);
        });
        meta = { marker: mk, data: marker, listenersAttached: true };
        markerRefs.current.set(marker.id, meta);
      } else {
        meta.marker.setPosition(marker.position);
        meta.marker.setTitle(marker.label ?? '');
        meta.data = marker;
        if (!meta.listenersAttached) {
          meta.marker.addListener('mouseover', () => onMarkerHover?.(marker.id));
          meta.marker.addListener('mouseout', () => onMarkerHover?.(null));
          meta.listenersAttached = true;
        }
      }

      let icon = marker.isPinned ? pinnedIcon : baseIcon;
      let zIndex = marker.isPinned ? 20 : 10;

      if (selectedId === marker.id) {
        icon = marker.isPinned ? pinnedSelectedIcon : selectedIcon;
        zIndex = 35;
      } else if (hoverId === marker.id) {
        icon = marker.isPinned ? pinnedHoverIcon : hoverIcon;
        zIndex = marker.isPinned ? 30 : 20;
      }

      meta.marker.setIcon(icon);
      meta.marker.setZIndex(zIndex);
    });

    if (selectedId && !markerRefs.current.has(selectedId)) {
      infoWindowRef.current?.close();
    }
  }, [apiReady, markers, onMarkerClick, onMarkerHover, hoverId, selectedId, openInfoWindow]);

  useEffect(() => {
    if (!apiReady) return;
    if (selectedId) {
      openInfoWindow(selectedId);
    } else {
      infoWindowRef.current?.close();
    }
  }, [apiReady, selectedId, openInfoWindow]);

  const containerClass = className ?? 'w-full h-[60vh] rounded-2xl border';
  return <div ref={mapDivRef} className={containerClass} />;
}
