import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY_SERVER;

// Straight-line distance (meters) for pre-sorting
function haversineMeters(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'Server API key missing' }, { status: 500 });
    }

    const { lat, lng, radiusMeters, includedTypes } = await req.json();

    if (typeof lat !== 'number' || typeof lng !== 'number' || typeof radiusMeters !== 'number') {
      return NextResponse.json({ error: 'lat, lng, radiusMeters required' }, { status: 400 });
    }
    
    if (!Array.isArray(includedTypes) || includedTypes.length === 0) {
      return NextResponse.json({ error: 'includedTypes required' }, { status: 400 });
    }
    const types: string[] =
      Array.isArray(includedTypes) && includedTypes.length ? includedTypes : ['grocery_store'];

    const body = {
      includedTypes: types,
      maxResultCount: 20,
      locationRestriction: {
        circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters },
      },
    };

    console.log('includedTypes sent:', includedTypes);

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
          'places.types',
          'places.rating',
          'places.userRatingCount',
          'places.googleMapsUri',
        ].join(','),
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: 'Places API error', details: text }, { status: resp.status });
    }

    const data = await resp.json();
    const raw: any[] = Array.isArray(data.places) ? data.places : [];

    // Strict post-filter: require primaryType to be one of the selected types
    const typeSet = new Set<string>(types);
    const filtered = raw.filter((p) => {
      const primary: string | undefined = p.primaryType;
      if (!typeSet.size) return true;
      return primary ? typeSet.has(primary) : false;
    });

    const places = filtered.map((p: any) => {
      const ll = p.location?.latLng ?? p.location;
      const position = {
        lat: Number(ll?.latitude ?? ll?.lat ?? 0),
        lng: Number(ll?.longitude ?? ll?.lng ?? 0),
      };
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

    // Pre-rank by straight-line distance and keep top 20
    places.sort((a: any, b: any) => a.directDistanceMeters - b.directDistanceMeters);
    return NextResponse.json({ origin: { lat, lng }, places: places.slice(0, 20) });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Server error', details: String(err?.message || err) },
      { status: 500 }
    );
  }
}