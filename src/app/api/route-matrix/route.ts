import { NextRequest, NextResponse } from 'next/server';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY_SERVER;
type TravelMode = 'WALK' | 'BICYCLE' | 'DRIVE';
const DEFAULT_MODES: TravelMode[] = ['DRIVE', 'WALK'];

function parseRouteMatrixBody(text: string): any[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : parsed.elements ?? [];
  }
  return trimmed
    .split('\n')
    .map((ln) => ln.trim())
    .filter((ln) => ln.length > 0)
    .map((ln) => (ln.startsWith('data:') ? ln.slice(5).trim() : ln))
    .map((ln) => JSON.parse(ln));
}

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'Server API key missing' }, { status: 500 });
    }

    const { origin, destinations, travelMode, travelModes } = await req.json();
    if (!origin || !Array.isArray(destinations) || destinations.length === 0) {
      return NextResponse.json({ error: 'origin and destinations required' }, { status: 400 });
    }

    const requested = [
      ...(Array.isArray(travelModes) ? travelModes : []),
      ...(travelMode ? [travelMode] : []),
      ...DEFAULT_MODES,
    ];

    const uniqueModes = Array.from(
      new Set(
        requested
          .map((m) => (typeof m === 'string' ? m.toUpperCase() : ''))
          .filter((m): m is TravelMode => ['DRIVE', 'WALK', 'BICYCLE'].includes(m))
      )
    ) as TravelMode[];

    const modesToFetch = uniqueModes.length > 0 ? uniqueModes : DEFAULT_MODES;

    const baseBody = {
      origins: [
        { waypoint: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } } },
      ],
      destinations: destinations.map((d: any) => ({
        waypoint: { location: { latLng: { latitude: d.lat, longitude: d.lng } } },
      })),
    };

    const allElements: any[] = [];

    for (const mode of modesToFetch) {
      const resp = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': API_KEY,
          'X-Goog-FieldMask':
            'originIndex,destinationIndex,duration,distanceMeters,status,condition',
        },
        body: JSON.stringify({ ...baseBody, travelMode: mode }),
      });

      const text = await resp.text();

      if (!resp.ok) {
        return NextResponse.json(
          { error: `Route Matrix error for ${mode.toLowerCase()}`, details: text },
          { status: resp.status }
        );
      }

      const parsed = parseRouteMatrixBody(text).map((element) => ({
        ...element,
        travelMode: mode,
      }));

      allElements.push(...parsed);
    }

    return NextResponse.json({ elements: allElements });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Server error', details: String(err?.message || err) },
      { status: 500 }
    );
  }
}
