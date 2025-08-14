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
      origins: [
        { waypoint: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } } },
      ],
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
        'X-Goog-FieldMask': [
          'originIndex',
          'destinationIndex',
          'duration',
          'distanceMeters',
          'condition',
          'status',
        ].join(','),
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: 'Route Matrix error', details: text }, { status: 502 });
    }

    const rows = await resp.json();
    // rows is an array of elements; each has destinationIndex
    const elements = Array.isArray(rows) ? rows : rows.elements || [];

    return NextResponse.json({ elements });
  } catch (err: any) {
    return NextResponse.json({ error: 'Server error', details: String(err?.message || err) }, { status: 500 });
  }
}