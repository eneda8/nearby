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
    <div className="flex flex-wrap items-center gap-1.5">
      <div className="flex items-center gap-1">
        <label className="text-[11px] font-medium">Radius</label>
        <select
          className="h-7 px-2 rounded-md border bg-background text-[11px]"
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
