import { NextRequest, NextResponse } from 'next/server';
import https from 'node:https';
import { URL } from 'node:url';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY_SERVER;
export const runtime = 'nodejs';
type TravelMode = 'WALK' | 'BICYCLE' | 'DRIVE';
const DEFAULT_MODES: TravelMode[] = ['DRIVE', 'WALK'];

type LatLng = { lat: number; lng: number };

type RouteMatrixElement = {
  originIndex?: number;
  destinationIndex?: number;
  duration?: string | { seconds?: number | string };
  distanceMeters?: number;
  status?: { code?: number; message?: string };
  condition?: string;
  travelMode?: TravelMode;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isRouteMatrixElement = (value: unknown): value is RouteMatrixElement => {
  if (!isRecord(value)) return false;
  const { originIndex, destinationIndex, duration, distanceMeters, status, condition, travelMode } = value;

  const numericIndexValid =
    originIndex === undefined ||
    typeof originIndex === 'number' ||
    typeof originIndex === 'string';

  const destinationIndexValid =
    destinationIndex === undefined ||
    typeof destinationIndex === 'number' ||
    typeof destinationIndex === 'string';

  const durationValid =
    duration === undefined ||
    typeof duration === 'string' ||
    (isRecord(duration) &&
      (typeof duration.seconds === 'number' ||
        typeof duration.seconds === 'string' ||
        duration.seconds === undefined));

  const distanceValid = distanceMeters === undefined || typeof distanceMeters === 'number';
  const statusValid = status === undefined || isRecord(status);
  const conditionValid = condition === undefined || typeof condition === 'string';
  const modeValid = travelMode === undefined || ['DRIVE', 'WALK', 'BICYCLE'].includes(String(travelMode));

  return (
    numericIndexValid &&
    destinationIndexValid &&
    durationValid &&
    distanceValid &&
    statusValid &&
    conditionValid &&
    modeValid
  );
};

const safeJsonParse = (input: string): unknown => {
  try {
    return JSON.parse(input);
  } catch {
    return null;
  }
};

function parseRouteMatrixBody(text: string): RouteMatrixElement[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const parsedValue = trimmed.startsWith('{') || trimmed.startsWith('[')
    ? safeJsonParse(trimmed)
    : trimmed
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .map((line) => (line.startsWith('data:') ? line.slice(5).trim() : line))
        .map((line) => safeJsonParse(line));

  if (Array.isArray(parsedValue)) {
    return parsedValue.filter(isRouteMatrixElement);
  }

  if (isRecord(parsedValue) && Array.isArray(parsedValue.elements)) {
    return parsedValue.elements.filter(isRouteMatrixElement);
  }

  return [];
}

export async function POST(req: NextRequest) {
  try {
    if (!API_KEY) {
      return NextResponse.json({ error: 'Server API key missing' }, { status: 500 });
    }

    const { origin, destinations, travelMode, travelModes } = await req.json();

    if (
      !isRecord(origin) ||
      typeof origin.lat !== 'number' ||
      typeof origin.lng !== 'number' ||
      !Array.isArray(destinations) ||
      destinations.length === 0 ||
      !destinations.every(
        (value): value is LatLng =>
          isRecord(value) && typeof value.lat === 'number' && typeof value.lng === 'number'
      )
    ) {
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
      destinations: destinations.map((destination) => ({
        waypoint: {
          location: {
            latLng: {
              latitude: destination.lat,
              longitude: destination.lng,
            },
          },
        },
      })),
    };

    const allElements: RouteMatrixElement[] = [];

    for (const mode of modesToFetch) {
      const { ok, status, text } = await postJson('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
        ...baseBody,
        travelMode: mode,
      });

      if (!ok) {
        return NextResponse.json(
          { error: `Route Matrix error for ${mode.toLowerCase()}`, details: text },
          { status }
        );
      }

      const parsed = parseRouteMatrixBody(text).map((element) => ({
        ...element,
        travelMode: mode,
      }));

      allElements.push(...parsed);
    }

    return NextResponse.json({ elements: allElements });
  } catch (err) {
    return NextResponse.json(
      {
        error: 'Server error',
        details:
          err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

function postJson(url: string, body: unknown): Promise<{ ok: boolean; status: number; text: string }> {
  const payload = JSON.stringify(body);
  const endpoint = new URL(url);

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: endpoint.hostname,
        path: endpoint.pathname + endpoint.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(payload),
          'X-Goog-Api-Key': API_KEY ?? '',
          'X-Goog-FieldMask':
            'originIndex,destinationIndex,duration,distanceMeters,status,condition',
        },
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          const status = res.statusCode ?? 500;
          resolve({ ok: status >= 200 && status < 300, status, text });
        });
      }
    );

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}
