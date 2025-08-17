import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY_SERVER;
type TravelMode = 'WALK' | 'BICYCLE' | 'DRIVE';

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) return NextResponse.json({ error: 'Server API key missing' }, { status: 500 });

    const { origin, destinations, travelMode } = await req.json();
    if (!origin || !Array.isArray(destinations) || destinations.length === 0) {
      return NextResponse.json({ error: 'origin and destinations required' }, { status: 400 });
    }

    const body = {
      origins: [{ waypoint: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } } }],
      destinations: destinations.map((d: any) => ({
        waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
      })),
      travelMode: (travelMode as TravelMode) || 'DRIVE',
    };

    const resp = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': API_KEY,
        'X-Goog-FieldMask':
          'originIndex,destinationIndex,duration,distanceMeters,status,condition',
      },
      body: JSON.stringify(body),
    });

    const text = await resp.text();

    if (!resp.ok) {
      return NextResponse.json({ error: 'Route Matrix error', details: text }, { status: resp.status });
    }

    let elements: any[] = [];
    const t = text.trim();

    if (t.startsWith('{') || t.startsWith('[')) {
      // plain JSON (object with elements OR array)
      const parsed = JSON.parse(t);
      elements = Array.isArray(parsed) ? parsed : parsed.elements ?? [];
    } else {
      // NDJSON or SSE "data: {...}" lines
      elements = t
        .split('\n')
        .map((ln) => ln.trim())
        .filter((ln) => ln.length > 0)
        .map((ln) => (ln.startsWith('data:') ? ln.slice(5).trim() : ln))
        .map((ln) => JSON.parse(ln));
    }

    return NextResponse.json({ elements });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error', details: String(err?.message || err) }, { status: 500 });
  }
}