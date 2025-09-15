// src/lib/categories.ts
// Table A-only types for Nearby Search (New). Client still sends `includedTypes` from these.
// We keep "Specialty Markets" under Food & Drink; Groceries is strict (primary only).

export type CatKey =
  | 'essentials'
  | 'food_drink'
  | 'shopping'
  | 'things_to_do'
  | 'services'
  | 'lodging'
  | 'transport'
  | 'health'
  | 'education'
  | 'government'
  | 'worship';

export type CatMap = {
  key: CatKey;
  label: string;
  subs: Array<{
    key: string;
    label: string;
    // For compatibility with the current page.tsx, these are the exact types
    // we pass through as `includedTypes` to the backend.
    types: string[];
    brandNames?: string[];
  }>;
}[];

// When no selection yet, show a few broadly useful types
export const POPULAR_TYPES: string[] = [
  'grocery_store',
  'supermarket',
  'restaurant',
  'cafe',
  'coffee_shop',
  'park',
  'pharmacy',
  'gas_station',
];

export const CATEGORIES: CatMap = [
  {
    key: 'essentials',
    label: 'Essentials',
    subs: [
      // STRICT groceries (primary-only filtering happens server-side)
      { key: 'groceries', label: 'Groceries', types: ['grocery_store', 'supermarket'] },
      { key: 'convenience', label: 'Convenience', types: ['convenience_store'] },
      // Print/Ship: we’ll show USPS by type; brand add-ons (UPS/FedEx/OfficeDepot/OfficeMax) via Text Search
      { key: 'print_ship', label: 'Print/Ship', types: ['post_office'], brandNames: ['The UPS Store', 'FedEx', 'OfficeDepot', 'OfficeMax', 'Staples'] },
      { key: 'pharmacy', label: 'Pharmacy', types: ['pharmacy', 'drugstore'] },
      { key: 'gas', label: 'Gas & EV', types: ['gas_station', 'electric_vehicle_charging_station'] },
      { key: 'bank', label: 'ATM/Bank', types: ['atm', 'bank'] },
    ],
  },
  {
    key: 'food_drink',
    label: 'Food & Drink',
    subs: [
      { key: 'restaurants', label: 'Restaurants', types: ['restaurant', 'fast_food_restaurant'] },
      { key: 'cafes', label: 'Cafés', types: ['cafe', 'coffee_shop'] },
      {
        key: 'dessert',
        label: 'Dessert',
        types: ['bakery', 'ice_cream_shop', 'dessert_shop', 'donut_shop', 'candy_store', 'chocolate_shop'],
      },
      // Specialty Markets stays here; backend applies a specialty-only heuristic
      { key: 'specialty_markets', label: 'Specialty Markets', types: ['asian_grocery_store', 'butcher_shop', 'food_store', 'market'] },
      { key: 'bars', label: 'Bars', types: ['bar', 'pub', 'wine_bar'] },
      { key: 'liquor', label: 'Liquor, Beer & Wine', types: ['liquor_store'] },
    ],
  },
  {
    key: 'shopping',
    label: 'Shopping',
    subs: [
      { key: 'clothing', label: 'Clothing', types: ['clothing_store'] },
      { key: 'shoes', label: 'Shoes', types: ['shoe_store'] },
      { key: 'jewelry', label: 'Jewelry & Accessories', types: ['store'] },
      { key: 'department', label: 'Department Stores', types: ['department_store'] },
      { key: 'discount', label: 'Discount & Thrift Stores', types: ['discount_store', 'thrift_store', 'variety_store', 'other_store'] },
      { key: 'big_box', label: 'Big Box & Warehouse', types: ['warehouse_store', 'superstore', 'wholesale_store', 'supermarket'] },
      { key: 'office', label: 'Office & School', types: ['office_supply_store', 'stationery_store'] },
      { key: 'electronics', label: 'Electronics', types: ['electronics_store', 'cell_phone_store', 'computer_store'] },
      { key: 'home', label: 'Home & Housewares', types: ['home_goods_store', 'home_improvement_store', 'furniture_store', 'hardware_store', 'appliance_store'] },
      { key: 'books_gifts', label: 'Books & Gifts', types: ['book_store', 'gift_shop', 'toy_store', 'card_store'] },
      { key: 'hobby', label: 'Hobby & Crafts', types: ['craft_store', 'hobby_store', 'art_supply_store', 'music_store', 'game_store'] },
      { key: 'pets', label: 'Pet Supplies', types: ['pet_store'] },
      { key: 'auto', label: 'Auto Parts & Services', types: ['auto_parts_store', 'car_dealer', 'car_repair', 'oil_change', 'tire_shop'] },
      { key: 'sports', label: 'Sporting Goods', types: ['sporting_goods_store', 'bicycle_store', 'outdoor_sports_store'] },
      { key: 'misc', label: 'Miscellaneous', types: ['variety_store', 'other_store'] },
    ],
  },
  {
    key: 'things_to_do',
    label: 'Things to Do',
    subs: [
      { key: 'parks_nature', label: 'Parks & Nature', types: ['park', 'botanical_garden', 'dog_park', 'playground', 'state_park', 'national_park'] },
      { key: 'entertainment', label: 'Entertainment', types: ['amusement_center', 'bowling_alley', 'movie_theater', 'video_arcade', 'water_park'] },
      { key: 'attractions', label: 'Attractions', types: ['tourist_attraction', 'museum', 'historical_place'] },
      { key: 'arts_culture', label: 'Arts & Culture', types: ['art_gallery', 'performing_arts_theater', 'concert_hall', 'cultural_center'] },
      { key: 'sports', label: 'Sports', types: ['gym', 'fitness_center', 'golf_course', 'stadium', 'sports_complex'] },
    ],
  },
  {
    key: 'services',
    label: 'Services',
    subs: [
      { key: 'beauty', label: 'Beauty', types: ['barber_shop', 'beauty_salon', 'hair_salon', 'nail_salon', 'tanning_studio'] },
      { key: 'personal', label: 'Personal', types: ['spa', 'massage', 'wellness_center', 'skin_care_clinic'] },
      { key: 'home', label: 'Home', types: ['electrician', 'plumber', 'painter', 'locksmith', 'roofing_contractor'] },
      { key: 'professional', label: 'Professional', types: ['lawyer', 'insurance_agency', 'real_estate_agency', 'accounting', 'consultant'] },
      { key: 'misc', label: 'Misc', types: ['courier_service', 'laundry', 'moving_company', 'storage', 'tailor', 'telecommunications_service_provider', 'veterinary_care', 'sports_coaching'] },
    ],
  },
  {
    key: 'health',
    label: 'Health',
    subs: [
      { key: 'doctors', label: 'Doctors & Specialists', types: ['doctor', 'dentist', 'dental_clinic', 'physiotherapist', 'chiropractor'] },
      { key: 'hospitals', label: 'Hospitals', types: ['hospital'] },
      { key: 'pharm', label: 'Pharmacy', types: ['pharmacy', 'drugstore'] },
      { key: 'fitness', label: 'Wellness & Fitness', types: ['wellness_center', 'yoga_studio', 'fitness_center', 'gym'] },
    ],
  },
  {
    key: 'lodging',
    label: 'Lodging',
    subs: [
      { key: 'hotels_resorts', label: 'Hotels & Resorts', types: ['hotel', 'resort_hotel'] },
      { key: 'budget', label: 'Budget Stays', types: ['motel', 'hostel'] },
      { key: 'inns_bb', label: 'Inns & B&Bs', types: ['inn', 'bed_and_breakfast'] },
      { key: 'other', label: 'Extended & Other', types: ['extended_stay_hotel', 'guest_house', 'cottage'] },
    ],
  },
  {
    key: 'transport',
    label: 'Transport',
    subs: [
      { key: 'transit', label: 'Transit', types: ['bus_station', 'train_station', 'subway_station', 'light_rail_station', 'transit_station'] },
      { key: 'air', label: 'Air', types: ['airport', 'international_airport', 'heliport'] },
      { key: 'parking', label: 'Parking & Rest', types: ['parking', 'park_and_ride', 'rest_stop'] },
      { key: 'taxi', label: 'Taxi', types: ['taxi_stand'] },
      { key: 'ferry', label: 'Ferry', types: ['ferry_terminal'] },
    ],
  },
  {
    key: 'education',
    label: 'Education',
    subs: [
      { key: 'schools', label: 'Schools', types: ['preschool', 'primary_school', 'school', 'secondary_school'] },
      { key: 'university', label: 'Universities', types: ['university'] },
      { key: 'library', label: 'Libraries', types: ['library'] },
    ],
  },
  {
    key: 'government',
    label: 'Government',
    subs: [
      { key: 'city', label: 'City Services', types: ['city_hall', 'courthouse', 'police', 'fire_station', 'government_office', 'local_government_office'] },
      { key: 'post', label: 'Post Offices', types: ['post_office'] },
    ],
  },
  {
    key: 'worship',
    label: 'Worship',
    subs: [
      { key: 'church', label: 'Church', types: ['church'] },
      { key: 'hindu_temple', label: 'Hindu Temple', types: ['hindu_temple'] },
      { key: 'mosque', label: 'Mosque', types: ['mosque'] },
      { key: 'synagogue', label: 'Synagogue', types: ['synagogue'] },
    ],
  },
];