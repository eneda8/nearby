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
    <select
      className="h-7 rounded-full border border-slate-200 bg-white px-3 text-[11px] font-medium text-slate-700 shadow-sm focus:border-slate-400 focus:outline-none"
      value={miles}
      onChange={handleMilesChange}
    >
      {MILE_OPTIONS.map((opt) => (
        <option key={opt} value={opt}>
          {opt} mile{opt === 1 ? '' : 's'}
        </option>
      ))}
    </select>
  );
}
