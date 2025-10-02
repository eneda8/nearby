// Centralized deny regexps for filtering unwanted results in places API

export const CHAIN_DENY = new RegExp([
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
].join('|'), 'i');

export const PHARMACY_DENY = new RegExp([
  'restaurant', 'deli', 'pizza', 'grill', 'kitchen', 'cafe', 'coffee', 'liquor', 'beer', 'wine', 'market basket', 'walmart(?! pharmacy)', 'target(?! pharmacy)', 'costco(?! pharmacy)', 'bj', 'sam', 'grocery', 'supermarket', 'bank', 'atm', 'auto', 'repair', 'dealer', 'parts', 'oil', 'change', 'station', 'pet', 'sport', 'electronics', 'office', 'best buy', 'staples', 'dollar', 'family dollar', 'dollar general', 'dollar tree', '7\\s?-?\\s?eleven', 'convenience'
].join('|'), 'i');

export const GAS_DENY = new RegExp([
  'restaurant', 'deli', 'pizza', 'grill', 'kitchen', 'cafe', 'coffee', 'liquor', 'beer', 'wine', 'market basket', 'bank', 'atm', 'auto repair', 'dealer', 'parts', 'oil change', 'stationery', 'pet', 'sport', 'electronics', 'office', 'best buy', 'staples', 'dollar', 'family dollar', 'dollar general', 'dollar tree', 'pharmacy', 'drugstore', 'grocery', 'supermarket'
].join('|'), 'i');

export const BANK_DENY = new RegExp([
  'restaurant', 'deli', 'pizza', 'grill', 'kitchen', 'cafe', 'coffee', 'liquor', 'beer', 'wine', 'market basket', 'grocery', 'supermarket', 'pharmacy', 'drugstore', 'convenience', 'auto', 'repair', 'dealer', 'parts', 'oil', 'change', 'stationery', 'pet', 'sport', 'electronics', 'office', 'best buy', 'staples', 'dollar', 'family dollar', 'dollar general', 'dollar tree', 'gas', 'ev charging', 'shell', 'exxon', 'chevron', 'bp', 'sunoco', 'marathon', 'phillips 66', 'valero', 'circle k', 'costco', 'sam', 'speedway', 'quiktrip', 'wawa', 'racetrac', 'loves', 'pilot', 'flying j', 'gulf', 'arco', '76', 'conoco', 'sinclair', 'hess', 'irving', 'casey', 'holiday', 'sheetz', 'getgo', 'kwik trip', 'kwik fill', 'maverik', 'tesla', 'chargepoint', 'electrify america', 'evgo', 'blink', 'volta', 'greenlots', 'semaconnect', 'ev connect', 'evbox'
].join('|'), 'i');

export const CLOTHING_CHAIN_DENY = new RegExp([
  'walgreens',
  'cvs',
  'rite\\s*aid',
  'dollar\\s*tree',
  'dollar\\s*general',
  'family\\s*dollar',
  'walmart',
  'target',
  'costco',
  "bj'?s",
  'sam\\s*’s|sam\\s*\\bclub\\b|sam\\s*club',
  'pharmacy',
  'drugstore',
  'auto',
  'parts',
  'oil',
  'change',
  'repair',
  'dealer',
  'staples',
  'office',
  'electronics',
  'best\\s*buy',
  'pet',
  'sport',
  'grocery',
  'market',
  'supermarket',
  'liquor',
  'beer',
  'wine',
  'gas',
  'station',
  'convenience',
  '7\\s?-?\\s?eleven',
].join('|'), 'i');

export const JEWELRY_CHAIN_DENY = new RegExp([
  'pawn',
  'department',
  'pharmacy',
  'drugstore',
  'dollar',
  'walmart',
  'target',
  'costco',
  'bj',
  'sam',
  'auto',
  'parts',
  'oil',
  'change',
  'repair',
  'dealer',
  'staples',
  'office',
  'electronics',
  'pet',
  'sport',
  'grocery',
  'market',
  'supermarket',
  'liquor',
  'beer',
  'wine',
  'gas',
  'station',
  'convenience',
  '7\\s?-?\\s?eleven',
].join('|'), 'i');
