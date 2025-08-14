import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY_SERVER;

// Haversine to pre-rank by straight-line distance (meters)
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000; // meters
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) return NextResponse.json({ error: 'Server API key missing' }, { status: 500 });

    const { lat, lng, radiusMeters, includedTypes } = await req.json();
    if (typeof lat !== 'number' || typeof lng !== 'number' || typeof radiusMeters !== 'number') {
      return NextResponse.json({ error: 'lat, lng, radiusMeters required' }, { status: 400 });
    }

    const types: string[] = Array.isArray(includedTypes) && includedTypes.length
      ? includedTypes
      : ['grocery_store']; // default for now

    const body = {
      includedTypes: types,
      maxResultCount: 20, //must be <= 20
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
      },
    };

    const resp = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask': [
          'places.id',
          'places.displayName',
          'places.formattedAddress',
          'places.location',
          'places.primaryType',
          'places.rating',
          'places.userRatingCount',
          'places.googleMapsUri',
        ].join(','),
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: 'Places API error', details: text }, { status: 502 });
    }

    const data = await resp.json();
    const places = (data.places || []).map((p: any) => {
      const loc = p.location ?? p.location?.latLng; // defensive for schema variations
      const latitude = loc?.latitude ?? loc?.lat ?? 0;
      const longitude = loc?.longitude ?? loc?.lng ?? 0;
      const position = { lat: latitude, lng: longitude };
      return {
        id: p.id as string,
        name: p.displayName?.text ?? p.displayName ?? 'Unknown',
        address: p.formattedAddress ?? '',
        primaryType: p.primaryType ?? '',
        rating: p.rating ?? null,
        userRatingCount: p.userRatingCount ?? 0,
        googleMapsUri: p.googleMapsUri ?? '',
        location: position,
        directDistanceMeters: haversineMeters({ lat, lng }, position),
      };
    });

    // pre-rank by straight-line distance; keep top 20
    places.sort((a: any, b: any) => a.directDistanceMeters - b.directDistanceMeters);
    const top = places.slice(0, 20);

    return NextResponse.json({ origin: { lat, lng }, places: top });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error', details: String(err?.message || err) }, { status: 500 });
  }
}
