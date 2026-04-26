-- =============================================================
-- Sellee niches + categories migration for existing projects.
-- Run this once in Supabase SQL editor.
-- Updated: includes original + new niches & categories
-- =============================================================

create extension if not exists "pgcrypto";

create table if not exists public.niches (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.niche_categories (
  id uuid primary key default gen_random_uuid(),
  niche_id uuid not null references public.niches(id) on delete cascade,
  slug text not null,
  name text not null,
  created_at timestamptz not null default now(),
  unique (niche_id, slug),
  unique (niche_id, name)
);

create table if not exists public.store_niches (
  store_id uuid not null references public.stores(id) on delete cascade,
  niche_id uuid not null references public.niches(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (store_id, niche_id)
);

create index if not exists idx_store_niches_store on public.store_niches (store_id);
create index if not exists idx_store_niches_niche on public.store_niches (niche_id);

alter table public.niches enable row level security;
alter table public.niche_categories enable row level security;
alter table public.store_niches enable row level security;

drop policy if exists "niches_public_read" on public.niches;
create policy "niches_public_read"
on public.niches for select
using (true);

drop policy if exists "niche_categories_public_read" on public.niche_categories;
create policy "niche_categories_public_read"
on public.niche_categories for select
using (true);

drop policy if exists "store_niches_vendor_all" on public.store_niches;
create policy "store_niches_vendor_all"
on public.store_niches for all
using (
  exists (
    select 1 from public.stores s
    where s.id = store_niches.store_id
    and s.vendor_id::text = auth.uid()::text
  )
)
with check (
  exists (
    select 1 from public.stores s
    where s.id = store_niches.store_id
    and s.vendor_id::text = auth.uid()::text
  )
);

-- =============================================================
-- NICHES (original + new)
-- =============================================================

insert into public.niches (slug, name)
values
  -- Original
  ('groceries',       'Groceries'),
  ('fashion',         'Fashion'),
  ('electronics',     'Electronics'),
  ('beauty',          'Beauty'),
  ('home-living',     'Home & Living'),
  ('health-fitness',  'Health & Fitness'),
  ('baby-kids',       'Baby & Kids'),
  ('automotive',      'Automotive'),

  -- New
  ('food-drinks',         'Food & Drinks'),
  ('books-stationery',    'Books & Stationery'),
  ('sports',              'Sports'),
  ('art-crafts',          'Art & Crafts'),
  ('digital-products',    'Digital Products'),
  ('thrift-vintage',      'Thrift & Vintage'),
  ('jewelry',             'Jewelry'),
  ('pets',                'Pets'),
  ('phones-accessories',  'Phones & Accessories'),
  ('services',            'Services'),
  ('event-party',         'Event & Party'),
  ('gaming',              'Gaming')

on conflict (slug) do update set name = excluded.name;

-- =============================================================
-- CATEGORIES
-- =============================================================

insert into public.niche_categories (niche_id, slug, name)
select n.id, v.slug, v.name
from (
  values

    -- -------------------------------------------------------
    -- GROCERIES (original + extras)
    -- -------------------------------------------------------
    ('groceries', 'fruits-vegetables',   'Fruits & Vegetables'),
    ('groceries', 'grains-rice',         'Grains & Rice'),
    ('groceries', 'beverages',           'Beverages'),
    ('groceries', 'snacks',              'Snacks'),
    ('groceries', 'frozen-foods',        'Frozen Foods'),
    ('groceries', 'cooking-essentials',  'Cooking Essentials'),
    ('groceries', 'condiments-sauces',   'Condiments & Sauces'),
    ('groceries', 'dairy-eggs',          'Dairy & Eggs'),
    ('groceries', 'bread-bakery',        'Bread & Bakery'),
    ('groceries', 'meat-seafood',        'Meat & Seafood'),

    -- -------------------------------------------------------
    -- FASHION (original + extras)
    -- -------------------------------------------------------
    ('fashion', 'mens-wear',      'Men''s Wear'),
    ('fashion', 'womens-wear',    'Women''s Wear'),
    ('fashion', 'shoes',          'Shoes'),
    ('fashion', 'bags',           'Bags'),
    ('fashion', 'accessories',    'Accessories'),
    ('fashion', 'traditional',    'Traditional Wear'),
    ('fashion', 'activewear',     'Activewear'),
    ('fashion', 'underwear',      'Underwear & Lingerie'),
    ('fashion', 'kids-fashion',   'Kids Fashion'),
    ('fashion', 'outerwear',      'Outerwear & Jackets'),

    -- -------------------------------------------------------
    -- ELECTRONICS (original + extras)
    -- -------------------------------------------------------
    ('electronics', 'phones-tablets',  'Phones & Tablets'),
    ('electronics', 'computing',       'Computing'),
    ('electronics', 'audio',           'Audio'),
    ('electronics', 'gaming',          'Gaming'),
    ('electronics', 'appliances',      'Appliances'),
    ('electronics', 'cameras',         'Cameras & Photography'),
    ('electronics', 'smart-home',      'Smart Home'),
    ('electronics', 'tv-displays',     'TVs & Displays'),
    ('electronics', 'cables-chargers', 'Cables & Chargers'),
    ('electronics', 'wearables',       'Wearables'),

    -- -------------------------------------------------------
    -- BEAUTY (original + extras)
    -- -------------------------------------------------------
    ('beauty', 'skincare',   'Skincare'),
    ('beauty', 'haircare',   'Haircare'),
    ('beauty', 'makeup',     'Makeup'),
    ('beauty', 'fragrance',  'Fragrance'),
    ('beauty', 'nails',      'Nails'),
    ('beauty', 'body-care',  'Body Care'),
    ('beauty', 'mens-grooming', 'Men''s Grooming'),
    ('beauty', 'tools-brushes', 'Tools & Brushes'),

    -- -------------------------------------------------------
    -- HOME & LIVING (original + extras)
    -- -------------------------------------------------------
    ('home-living', 'furniture',             'Furniture'),
    ('home-living', 'kitchen-dining',        'Kitchen & Dining'),
    ('home-living', 'decor',                 'Decor'),
    ('home-living', 'storage-organization',  'Storage & Organization'),
    ('home-living', 'bedding-bath',          'Bedding & Bath'),
    ('home-living', 'lighting',              'Lighting'),
    ('home-living', 'cleaning-supplies',     'Cleaning Supplies'),
    ('home-living', 'garden-outdoor',        'Garden & Outdoor'),

    -- -------------------------------------------------------
    -- HEALTH & FITNESS (original + extras)
    -- -------------------------------------------------------
    ('health-fitness', 'supplements',       'Supplements'),
    ('health-fitness', 'fitness-equipment', 'Fitness Equipment'),
    ('health-fitness', 'wellness',          'Wellness'),
    ('health-fitness', 'medical-supplies',  'Medical Supplies'),
    ('health-fitness', 'yoga-pilates',      'Yoga & Pilates'),
    ('health-fitness', 'sports-nutrition',  'Sports Nutrition'),
    ('health-fitness', 'personal-care',     'Personal Care'),

    -- -------------------------------------------------------
    -- BABY & KIDS (original + extras)
    -- -------------------------------------------------------
    ('baby-kids', 'baby-care',    'Baby Care'),
    ('baby-kids', 'kids-fashion', 'Kids Fashion'),
    ('baby-kids', 'toys-games',   'Toys & Games'),
    ('baby-kids', 'baby-feeding', 'Baby Feeding'),
    ('baby-kids', 'school-supplies', 'School Supplies'),
    ('baby-kids', 'baby-gear',    'Baby Gear & Travel'),

    -- -------------------------------------------------------
    -- AUTOMOTIVE (original + extras)
    -- -------------------------------------------------------
    ('automotive', 'car-care',    'Car Care'),
    ('automotive', 'accessories', 'Accessories'),
    ('automotive', 'parts-tools', 'Parts & Tools'),
    ('automotive', 'tyres-wheels','Tyres & Wheels'),
    ('automotive', 'electronics', 'Car Electronics'),
    ('automotive', 'bike-scooter','Bike & Scooter'),

    -- -------------------------------------------------------
    -- FOOD & DRINKS (new — great for student vendors)
    -- -------------------------------------------------------
    ('food-drinks', 'homemade-meals',   'Homemade Meals'),
    ('food-drinks', 'pastries-cakes',   'Pastries & Cakes'),
    ('food-drinks', 'drinks-smoothies', 'Drinks & Smoothies'),
    ('food-drinks', 'small-chops',      'Small Chops'),
    ('food-drinks', 'local-dishes',     'Local Dishes'),
    ('food-drinks', 'fast-food',        'Fast Food'),
    ('food-drinks', 'healthy-meals',    'Healthy Meals'),
    ('food-drinks', 'desserts',         'Desserts & Ice Cream'),
    ('food-drinks', 'spices-seasonings','Spices & Seasonings'),
    ('food-drinks', 'meal-prep',        'Meal Prep & Packages'),

    -- -------------------------------------------------------
    -- BOOKS & STATIONERY (new — very popular in schools)
    -- -------------------------------------------------------
    ('books-stationery', 'textbooks',         'Textbooks'),
    ('books-stationery', 'past-questions',    'Past Questions & Exams'),
    ('books-stationery', 'fiction-novels',    'Fiction & Novels'),
    ('books-stationery', 'self-development',  'Self Development'),
    ('books-stationery', 'stationery',        'Stationery & Supplies'),
    ('books-stationery', 'art-supplies',      'Art Supplies'),
    ('books-stationery', 'notebooks-journals','Notebooks & Journals'),
    ('books-stationery', 'religious-books',   'Religious Books'),

    -- -------------------------------------------------------
    -- SPORTS (new)
    -- -------------------------------------------------------
    ('sports', 'jerseys-kits',    'Jerseys & Kits'),
    ('sports', 'footwear',        'Sports Footwear'),
    ('sports', 'equipment',       'Equipment'),
    ('sports', 'outdoor-adventure','Outdoor & Adventure'),
    ('sports', 'swimming',        'Swimming'),
    ('sports', 'racket-sports',   'Racket Sports'),
    ('sports', 'martial-arts',    'Martial Arts'),
    ('sports', 'team-sports',     'Team Sports'),

    -- -------------------------------------------------------
    -- ART & CRAFTS (new)
    -- -------------------------------------------------------
    ('art-crafts', 'paintings',       'Paintings & Drawings'),
    ('art-crafts', 'photography',     'Photography & Prints'),
    ('art-crafts', 'handmade-crafts', 'Handmade Crafts'),
    ('art-crafts', 'digital-art',     'Digital Art'),
    ('art-crafts', 'pottery-ceramics','Pottery & Ceramics'),
    ('art-crafts', 'fabrics-sewing',  'Fabrics & Sewing'),
    ('art-crafts', 'candles-soaps',   'Candles & Soaps'),
    ('art-crafts', 'beads-jewelry',   'Beads & Jewelry Making'),

    -- -------------------------------------------------------
    -- DIGITAL PRODUCTS (new — growing fast)
    -- -------------------------------------------------------
    ('digital-products', 'ebooks',            'eBooks & Guides'),
    ('digital-products', 'templates',         'Templates & Designs'),
    ('digital-products', 'courses',           'Online Courses'),
    ('digital-products', 'software-tools',    'Software & Tools'),
    ('digital-products', 'music-beats',       'Music & Beats'),
    ('digital-products', 'photo-presets',     'Photo Presets & Filters'),
    ('digital-products', 'social-media-kits', 'Social Media Kits'),
    ('digital-products', 'printables',        'Printables'),
    ('digital-products', 'subscriptions',     'Subscriptions & Accounts'),

    -- -------------------------------------------------------
    -- THRIFT & VINTAGE (new — huge in Nigerian student market)
    -- -------------------------------------------------------
    ('thrift-vintage', 'thrift-clothing',  'Thrift Clothing'),
    ('thrift-vintage', 'thrift-shoes',     'Thrift Shoes'),
    ('thrift-vintage', 'thrift-bags',      'Thrift Bags'),
    ('thrift-vintage', 'vintage-items',    'Vintage Items'),
    ('thrift-vintage', 'fairly-used-electronics', 'Fairly Used Electronics'),
    ('thrift-vintage', 'thrift-furniture', 'Thrift Furniture'),
    ('thrift-vintage', 'bundle-deals',     'Bundle Deals'),

    -- -------------------------------------------------------
    -- JEWELRY (new)
    -- -------------------------------------------------------
    ('jewelry', 'necklaces',     'Necklaces'),
    ('jewelry', 'bracelets',     'Bracelets & Bangles'),
    ('jewelry', 'earrings',      'Earrings'),
    ('jewelry', 'rings',         'Rings'),
    ('jewelry', 'anklets',       'Anklets'),
    ('jewelry', 'mens-jewelry',  'Men''s Jewelry'),
    ('jewelry', 'sets',          'Jewelry Sets'),
    ('jewelry', 'waist-beads',   'Waist Beads'),

    -- -------------------------------------------------------
    -- PETS (new)
    -- -------------------------------------------------------
    ('pets', 'pet-food',        'Pet Food'),
    ('pets', 'pet-accessories', 'Pet Accessories'),
    ('pets', 'pet-grooming',    'Pet Grooming'),
    ('pets', 'pet-toys',        'Pet Toys'),
    ('pets', 'pet-health',      'Pet Health & Vets'),
    ('pets', 'live-animals',    'Live Animals'),

    -- -------------------------------------------------------
    -- PHONES & ACCESSORIES (new — very high demand)
    -- -------------------------------------------------------
    ('phones-accessories', 'phone-cases',     'Phone Cases & Covers'),
    ('phones-accessories', 'screen-protectors','Screen Protectors'),
    ('phones-accessories', 'chargers-cables', 'Chargers & Cables'),
    ('phones-accessories', 'earphones',       'Earphones & Headsets'),
    ('phones-accessories', 'power-banks',     'Power Banks'),
    ('phones-accessories', 'phone-holders',   'Phone Holders & Stands'),
    ('phones-accessories', 'smartwatch-bands','Smartwatch Bands'),
    ('phones-accessories', 'fairly-used-phones','Fairly Used Phones'),

    -- -------------------------------------------------------
    -- SERVICES (new — student freelancers)
    -- -------------------------------------------------------
    ('services', 'graphic-design',    'Graphic Design'),
    ('services', 'photography-video', 'Photography & Videography'),
    ('services', 'tutoring',          'Tutoring & Teaching'),
    ('services', 'hair-beauty',       'Hair & Beauty Services'),
    ('services', 'tailoring',         'Tailoring & Fashion'),
    ('services', 'tech-repairs',      'Tech Repairs'),
    ('services', 'delivery',          'Delivery & Errands'),
    ('services', 'event-planning',    'Event Planning'),
    ('services', 'social-media-mgmt', 'Social Media Management'),
    ('services', 'web-design',        'Web & App Design'),
    ('services', 'copywriting',       'Copywriting & Content'),

    -- -------------------------------------------------------
    -- EVENT & PARTY (new)
    -- -------------------------------------------------------
    ('event-party', 'decorations',     'Decorations'),
    ('event-party', 'party-supplies',  'Party Supplies'),
    ('event-party', 'costumes',        'Costumes & Outfits'),
    ('event-party', 'invitations',     'Invitations & Cards'),
    ('event-party', 'catering',        'Catering & Food'),
    ('event-party', 'event-equipment', 'Event Equipment Rental'),
    ('event-party', 'souvenirs',       'Souvenirs & Gifts'),

    -- -------------------------------------------------------
    -- GAMING (new)
    -- -------------------------------------------------------
    ('gaming', 'game-cards',       'Game Cards & Vouchers'),
    ('gaming', 'consoles',         'Consoles'),
    ('gaming', 'game-titles',      'Game Titles & CDs'),
    ('gaming', 'gaming-gear',      'Gaming Gear & Accessories'),
    ('gaming', 'in-game-items',    'In-Game Items & Accounts'),
    ('gaming', 'mobile-gaming',    'Mobile Gaming')

) as v(niche_slug, slug, name)
join public.niches n on n.slug = v.niche_slug
on conflict (niche_id, slug) do update set name = excluded.name;