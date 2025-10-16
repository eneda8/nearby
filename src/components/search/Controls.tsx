'use client';
import { useState } from 'react';

const MILE_OPTIONS = [0.5, 1, 2, 3, 5, 10, 15, 25];

export default function Controls({
  onRadiusChange,
}: {
  onRadiusChange?: (meters: number) => void; // emit meters for API calls later
}) {
  const [miles, setMiles] = useState<number>(1);

  const handleMilesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const m = parseFloat(e.target.value);
    setMiles(m);
    onRadiusChange?.(m * 1609.344);
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
    </div>
  );
}
