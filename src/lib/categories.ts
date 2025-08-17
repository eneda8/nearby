export type CatKey =
  | 'groceries' | 'restaurants' | 'financial' | 'transport' | 'medical'
  | 'schools' | 'worship' | 'shopping' | 'nature' | 'lodging'
  | 'attractions' | 'entertainment' | 'libraries';

export interface Subcat {
  key: string;
  label: string;
  types: string[];         // Google Places (New) includedTypes
}

export interface Category {
  key: CatKey;
  label: string;
  subs: Subcat[];
}

// Helper: “All” = union of all subs in that category
const allOf = (...subs: Subcat[]): Subcat => ({
  key: 'all',
  label: 'All',
  types: Array.from(new Set(subs.flatMap(s => s.types))),
});

export const CATEGORIES: Category[] = [
  {
    key: 'groceries',
    label: 'Groceries',
    subs: (() => {
      const supermarket = { key: 'supermarket', label: 'Supermarket', types: ['supermarket'] };
      const grocery     = { key: 'grocery',     label: 'Grocery store', types: ['grocery_store'] };
      const convenience = { key: 'convenience', label: 'Convenience',   types: ['convenience_store'] };
      const liquor      = { key: 'liquor',      label: 'Liquor',        types: ['liquor_store'] };
      // Supercenters (Walmart/Target) don’t have a perfect type; department_store is a decent proxy.
      const supercenter = { key: 'supercenter', label: 'Supercenter',   types: ['department_store'] };
      return [allOf(supermarket, grocery, convenience, liquor, supercenter), supermarket, grocery, convenience, liquor, supercenter];
    })(),
  },
  {
    key: 'restaurants',
    label: 'Restaurants',
    subs: (() => {
      const sitdown  = { key: 'sitdown',  label: 'Sit-down', types: ['restaurant'] };
      const fastFood    = { key: 'fast_food',   label: 'Fast food',       types: ['fast_food_restaurant'] };
      const cafe        = { key: 'cafe',        label: 'Café',            types: ['cafe','coffee_shop'] };
      const bakery      = { key: 'bakery',      label: 'Bakery',          types: ['bakery'] };
      const bar         = { key: 'bar',         label: 'Bar',             types: ['bar'] };
      const dessert     = { key: 'dessert',     label: 'Ice cream/Dessert', types: ['ice_cream_shop'] };
      return [allOf(sitdown, fastFood, cafe, bakery, bar, dessert), sitdown, fastFood, cafe, bakery, bar, dessert];
    })(),
  },
  {
    key: 'financial',
    label: 'ATMs & Banks',
    subs: [
      { key: 'all',    label: 'All',     types: ['bank','atm','currency_exchange','money_transfer'] },
      { key: 'bank',   label: 'Banks',   types: ['bank'] },
      { key: 'atm',    label: 'ATMs',    types: ['atm'] },
    ],
  },
  {
    key: 'transport',
    label: 'Transport',
    subs: [
      { key: 'all',   label: 'All',    types: ['airport','train_station','bus_station'] },
      { key: 'air',   label: 'Airports', types: ['airport'] },
      { key: 'train', label: 'Train',    types: ['train_station'] },
      { key: 'bus',   label: 'Bus',      types: ['bus_station'] },
    ],
  },
  {
    key: 'medical',
    label: 'Medical',
    subs: [
      { key: 'all',   label: 'All',      types: ['hospital','doctor','pharmacy'] },
      { key: 'hospital', label: 'Hospitals', types: ['hospital'] },
      { key: 'clinic',   label: 'Doctor/Clinic', types: ['doctor'] },
      // Urgent care may vary by region; we’ll add when verified or via text search fallback.
      { key: 'pharmacy', label: 'Pharmacies', types: ['pharmacy'] },
    ],
  },
  {
    key: 'schools',
    label: 'Schools',
    subs: [
      { key: 'all',     label: 'All',     types: ['primary_school','secondary_school','school','university'] },
      { key: 'k12',     label: 'K–12',    types: ['primary_school','secondary_school','school'] },
      { key: 'highered',label: 'Higher ed', types: ['university'] },
      // Trade/vocational varies; start with 'school' umbrella.
    ],
  },
  {
    key: 'worship',
    label: 'Worship',
    subs: [
      { key: 'all',   label: 'All', types: ['place_of_worship','church','mosque','synagogue','hindu_temple','buddhist_temple'] },
      { key: 'church', label: 'Church',  types: ['church'] },
      { key: 'mosque', label: 'Mosque',  types: ['mosque'] },
      { key: 'synagogue', label: 'Synagogue', types: ['synagogue'] },
    ],
  },
  {
    key: 'shopping',
    label: 'Shopping',
    subs: [
      { key: 'all',     label: 'All', types: ['shopping_mall','department_store','clothing_store','shoe_store','book_store','electronics_store','furniture_store','home_goods_store','pet_store','sporting_goods_store','thrift_store'] },
      { key: 'mall',    label: 'Malls', types: ['shopping_mall'] },
      { key: 'dept',    label: 'Department', types: ['department_store'] },
      // { key: 'thrift',  label: 'Thrift/Discount', types: ['thrift_store'] }, // add 'discount_store' later if needed
      { key: 'furniture', label: 'Furniture', types: ['furniture_store','home_goods_store'] },
      { key: 'beauty',  label: 'Beauty', types: ['beauty_salon'] }, // placeholder; refine later
      { key: 'specialty', label: 'Specialty', types: ['book_store','pet_store','shoe_store','sporting_goods_store','electronics_store'] },
    ],
  },
  {
    key: 'nature',
    label: 'Nature',
    subs: [
      { key: 'all', label: 'All', types: ['park','campground','beach'] },
      { key: 'parks', label: 'Parks', types: ['park'] },
      { key: 'camp',  label: 'Campgrounds', types: ['campground'] },
      { key: 'beach', label: 'Beaches', types: ['beach'] },
    ],
  },
  {
    key: 'lodging',
    label: 'Lodging',
    subs: [
      { key: 'all', label: 'All', types: ['lodging'] }, // covers hotels/motels/inns
    ],
  },
  {
    key: 'attractions',
    label: 'Attractions',
    subs: [
      { key: 'all', label: 'All', types: ['tourist_attraction','museum','art_gallery','zoo','aquarium'] },
      { key: 'museums', label: 'Museums', types: ['museum'] },
      { key: 'sights',  label: 'Sights/Landmarks', types: ['tourist_attraction'] },
    ],
  },
  {
    key: 'entertainment',
    label: 'Entertainment',
    subs: [
      { key: 'all',  label: 'All', types: ['bowling_alley','movie_theater','stadium','theater','amusement_center'] },
      { key: 'movies', label: 'Movie theaters', types: ['movie_theater'] },
      { key: 'bowling', label: 'Bowling', types: ['bowling_alley'] },
      // Performing arts can come later via searchText fallback
    ],
  },
  {
    key: 'libraries',
    label: 'Libraries',
    subs: [
      { key: 'all', label: 'Libraries', types: ['library'] }, // ← Your “Libraries (what category?)”: this is the official type.
    ],
  },
];

export const POPULAR_TYPES: string[] = Array.from(
  new Set([
    'restaurant',
    'supermarket',
    'grocery_store',
    'cafe',
    'coffee_shop',
    'gas_station',
    'pharmacy',
    'park',
    'lodging',
  ])
);

