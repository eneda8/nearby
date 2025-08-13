'use client';
import { useState } from 'react';

export type TravelMode = 'WALK' | 'BICYCLE' | 'DRIVE';

const MILE_OPTIONS = [0.5, 1, 2, 3, 5, 10, 15, 25];

export default function Controls({
  onRadiusChange,
  onModeChange,
}: {
  onRadiusChange?: (meters: number) => void; // emit meters for API calls later
  onModeChange?: (mode: TravelMode) => void;
}) {
  const [miles, setMiles] = useState<number>(1);
  const [mode, setMode] = useState<TravelMode>('DRIVE');

  const handleMilesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const m = parseFloat(e.target.value);
    setMiles(m);
    onRadiusChange?.(m * 1609.344);
  };

  const handleModeChange = (m: TravelMode) => {
    setMode(m);
    onModeChange?.(m);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <label className="text-sm">Radius</label>
        <select
          className="h-9 px-3 rounded-md border bg-background"
          value={miles}
          onChange={handleMilesChange}
        >
          {MILE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt} mile{opt === 1 ? '' : 's'}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm">Mode</span>
        <div className="flex gap-2">
          {(['WALK', 'BICYCLE', 'DRIVE'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => handleModeChange(m)}
              className={`h-9 px-3 rounded-md border ${
                mode === m ? 'bg-foreground text-background' : 'bg-background'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}