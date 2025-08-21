// src/app/api/places/route.ts
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
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ------------ Heuristics (names) ------------
const NON_ASCII = /[^\x00-\x7F]/;

const CONVENIENCE_WORDS = new RegExp(
  [
    '7\\s?-?\\s?eleven',
    'mini\\s?mart',
    'mart\\b',
    'liquor',
    'pharmacy',
    'drugstore',
    'deli',
    'bodega',
    'tobacco',
    'smoke',
    'vape',
    'grill',
    'kitchen',
    'cafe',
    'coffee',
    'restaurant',
    'pizza',
    'gas',
    'fuel',
    'quick\\s?shop',
    'quick\\s?stop',
  ].join('|'),
  'i'
);

// Big chains we don’t want in Specialty; also filters “Market Basket” false positives.
const CHAIN_DENY = new RegExp(
  [
    'market\\s*basket',
    'walgreens',
    '\\bcvs\\b',
    'rite\\s*aid',
    'dunkin',
    'starbucks',
    'family\\s*dollar',
    'dollar\\s*general',
    'dollar\\s*tree',
    'walmart',
    'target',
    'costco',
    "bj'?s",
    'sam\\s*’s|sam\\s*\\bclub\\b|sam\\s*club',
  ].join('|'),
  'i'
);

// “Specialty” cues for ethnic/international markets
const SPECIALTY_CUES = new RegExp(
  [
    'international',
    'world',
    'african',
    'asian',
    'indian',
    'middle\\s*eastern',
    'halal',
    'kosher',
    'latin',
    'balkan',
    'bosn',
    'himalay',
    'european',
    'caribbean',
    'polish',
    'russian',
    'ukrain',
    'mexican',
    'italian',
    'spanish',
    'turkish',
    'greek',
    'japanese',
    'korean',
    'thai',
    'vietnam',
    'filipino',
    'persian',
    'arab',
    'ethiop',
    'somali',
    'jamaic',
    'trinidad',
    'pakist',
    'bangla',
    'nepal',
    'sri\\s*lanka',
    'brazil',
    'argentin',
    'peru',
    'colomb',
    'cuban',
    'puerto\\s*ric',
  ].join('|'),
  'i'
);

type PlacesNewPlace = {
  id: string;
  displayName?: { text?: string } | string;
  formattedAddress?: string;
  location?: { latLng?: { latitude?: number; longitude?: number } } | { latitude?: number; longitude?: number };
  primaryType?: string;
  types?: string[];
  googleMapsUri?: string;
};

// Infer “mode” by the includedTypes set the client sent (keeps page.tsx unchanged)
function inferMode(includedTypes: string[]): 'groceries' | 'specialty_markets' | 'generic' {
  const set = new Set(includedTypes);
  const isGroceries = set.size === 2 && set.has('grocery_store') && set.has('supermarket');
  if (isGroceries) return 'groceries';
  if (set.has('asian_grocery_store') || set.has('butcher_shop') || set.has('food_store') || set.has('market')) {
    return 'specialty_markets';
  }
  return 'generic';
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

    const mode = inferMode(includedTypes);

    // Text-based search for Print/Ship brands
    const isPrintShipRequest =
      Array.isArray(includedTypes) &&
      includedTypes.length === 1 &&
      includedTypes[0] === 'post_office';
    let raw: PlacesNewPlace[] = [];
    if (isPrintShipRequest) {
      // 1. Search for post_office
      const postOfficeBody = {
        includedTypes: ['post_office'],
        maxResultCount: 20,
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters } },
      };
      const resp1 = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
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
            'places.googleMapsUri',
          ].join(','),
        },
        body: JSON.stringify(postOfficeBody),
      });
      const data1 = await resp1.json();
      const postOffices: PlacesNewPlace[] = Array.isArray(data1?.places) ? data1.places : [];

      // 2. For each brand, do a textQuery search
      const BRANDS = [
        'The UPS Store',
        'FedEx',
        'OfficeDepot',
        'OfficeMax',
        'Staples',
      ];
      const brandResults: PlacesNewPlace[] = [];
      for (const brand of BRANDS) {
        const textBody = {
          textQuery: brand + ' near ' + lat + ',' + lng,
          maxResultCount: 10,
          locationBias: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters } },
        };
        const resp = await fetch('https://places.googleapis.com/v1/places:searchText', {
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
              'places.googleMapsUri',
            ].join(','),
          },
          body: JSON.stringify(textBody),
        });
        const data = await resp.json();
        if (Array.isArray(data?.places)) {
          brandResults.push(...data.places);
        }
      }
      // Merge and deduplicate by id
      const all = [...postOffices, ...brandResults];
      const seen = new Set<string>();
      raw = all.filter((p) => {
        if (!p.id || seen.has(p.id)) return false;
        seen.add(p.id);
        // Filter by actual distance from center
        const ll = (p.location as any)?.latLng ?? p.location;
        const position = {
          lat: Number(ll?.latitude ?? ll?.lat ?? 0),
          lng: Number(ll?.longitude ?? ll?.lng ?? 0),
        };
        const dist = haversineMeters({ lat, lng }, position);
        return dist <= radiusMeters;
      });
    } else {
      // Build Places (New) Nearby request
      const nearbyBody = {
        includedTypes,
        maxResultCount: 20,
        locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusMeters } },
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
            'places.types',
            'places.googleMapsUri',
          ].join(','),
        },
        body: JSON.stringify(nearbyBody),
      });

      if (!resp.ok) {
        const text = await resp.text();
        return NextResponse.json({ error: 'Places API error', details: text }, { status: resp.status });
      }

      const data = await resp.json();
      raw = Array.isArray(data?.places) ? data.places : [];
    }

    // ---------- Post-filters ----------
    let filtered: PlacesNewPlace[] = raw;

    // Print/Ship: include any post_office or brand match
    const isPrintShip =
      Array.isArray(includedTypes) &&
      includedTypes.length === 1 &&
      includedTypes[0] === 'post_office';
    const PRINT_SHIP_BRANDS = [
      '(?:the[ .-]*)?ups[ .-]*store',
      'ups',
      'fed[ .-]*ex',
      'office[ .-]*depot',
      'office[ .-]*max',
      'staples',
    ];
    if (isPrintShip) {
      const brandRegex = new RegExp(PRINT_SHIP_BRANDS.join('|'), 'i');
      filtered = raw.filter((p) => {
        const name = typeof p.displayName === 'string' ? p.displayName : p.displayName?.text || '';
        const hasType = (p.types || []).includes('post_office');
        const hasBrand = brandRegex.test(name);
        return hasType || hasBrand;
      });
      // Debug: if no results, log all names
      if (filtered.length === 0 && raw.length > 0) {
        console.warn('No Print/Ship results. Raw names:', raw.map(p => (typeof p.displayName === 'string' ? p.displayName : p.displayName?.text || '')));
      }
    } else if (mode === 'groceries') {
      // STRICT: primary type must be grocery_store or supermarket; trim out convenience/deli/specialty by name
      filtered = raw.filter((p) => {
        const name = typeof p.displayName === 'string' ? p.displayName : p.displayName?.text || '';
        const pt = (p.primaryType || '').toLowerCase();
        if (pt !== 'grocery_store' && pt !== 'supermarket') return false;
        if (CONVENIENCE_WORDS.test(name)) return false;
        if (SPECIALTY_CUES.test(name) || NON_ASCII.test(name)) return false;
        return true;
      });
    } else if (mode === 'specialty_markets') {
      // Keep explicit specialty types…
      let spec = raw.filter((p) => {
        const pt = (p.primaryType || '').toLowerCase();
        return pt === 'asian_grocery_store' || pt === 'butcher_shop';
      });

      // …and include fallback food_store/market/grocery only if the name clearly indicates specialty,
      // while avoiding big chain supermarkets/pharmacies/convenience.
      const extra = raw.filter((p) => {
        const pt = (p.primaryType || '').toLowerCase();
        if (pt === 'asian_grocery_store' || pt === 'butcher_shop') return false; // already included
        const name = typeof p.displayName === 'string' ? p.displayName : p.displayName?.text || '';
        if (CHAIN_DENY.test(name)) return false;
        if (CONVENIENCE_WORDS.test(name)) return false;
        // pick up international/specialty cues or non-ASCII names
        return SPECIALTY_CUES.test(name) || NON_ASCII.test(name);
      });

      filtered = [...spec, ...extra];
    }

    // Map to client shape + pre-rank by straight-line distance
    const places = filtered
      .map((p) => {
        const ll = (p.location as any)?.latLng ?? p.location;
        const position = {
          lat: Number(ll?.latitude ?? ll?.lat ?? 0),
          lng: Number(ll?.longitude ?? ll?.lng ?? 0),
        };
        return {
          id: p.id,
          name: typeof p.displayName === 'string' ? p.displayName : p.displayName?.text ?? 'Unknown',
          address: p.formattedAddress ?? '',
          primaryType: p.primaryType ?? '',
          types: p.types ?? [],
          googleMapsUri: p.googleMapsUri ?? '',
          location: position,
          directDistanceMeters: haversineMeters({ lat, lng }, position),
        };
      })
      .sort((a, b) => a.directDistanceMeters - b.directDistanceMeters)
      .slice(0, 20);

    return NextResponse.json({
      origin: { lat, lng },
      mode,
      debugIncludedTypes: includedTypes,
      places,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: 'Server error', details: String(err?.message || err) },
      { status: 500 }
    );
  }
}