'use client';

export type CategoryKey =
  | 'groceries'
  | 'restaurants'
  | 'cafes'
  | 'gas'
  | 'pharmacies'
  | 'shopping'
  | 'parks'
  | 'gyms';

// Map a friendly category to Google Places (New) includedTypes
export const CATEGORY_TYPES: Record<CategoryKey, string[]> = {
  groceries: ['grocery_store', 'supermarket', 'convenience_store'],
  restaurants: ['restaurant'],
  cafes: ['cafe', 'coffee_shop'],
  gas: ['gas_station'],
  pharmacies: ['pharmacy'],
  shopping: ['shopping_mall', 'department_store', 'clothing_store'],
  parks: ['park'],
  gyms: ['gym', 'fitness_center'],
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  groceries: 'Grocery stores',
  restaurants: 'Restaurants',
  cafes: 'Cafés',
  gas: 'Gas stations',
  pharmacies: 'Pharmacies',
  shopping: 'Shopping',
  parks: 'Parks',
  gyms: 'Gyms',
};

export default function CategoryFilters({
  value,
  onChange,
}: {
  value: CategoryKey;
  onChange: (key: CategoryKey) => void;
}) {
  const keys = Object.keys(CATEGORY_LABELS) as CategoryKey[];
  return (
    <div className="flex flex-wrap gap-2">
      {keys.map((k) => (
        <button
          key={k}
          type="button"
          onClick={() => onChange(k)}
          className={`h-9 px-3 rounded-full border ${
            value === k ? 'bg-foreground text-background' : 'bg-background'
          }`}
        >
          {CATEGORY_LABELS[k]}
        </button>
      ))}
    </div>
  );
}