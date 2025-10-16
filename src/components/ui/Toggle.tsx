'use client';

import { KeyboardEvent } from 'react';

type ToggleProps = {
  checked: boolean;
  onChange?: (next: boolean) => void;
  className?: string;
};

export default function Toggle({ checked, onChange, className }: ToggleProps) {
  const handleToggle = () => onChange?.(!checked);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleToggle();
    }
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
      className={`relative inline-flex h-[18px] w-[36px] items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-blue-400 ${
        checked ? 'bg-green-500' : 'bg-gray-300'
      } ${className ?? ''}`}
    >
      <span
        className={`inline-block h-[14px] w-[14px] translate-x-[2px] rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-[18px]' : 'translate-x-[2px]'
        }`}
      />
    </button>
  );
}
