// --- catalog-helpers.js ---
window.CaintaOneData = window.CaintaOneData || {};

const normalizeCatalogText = (value) => String(value)
  .toLocaleLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

window.CaintaOneData.normalizeItemText = normalizeCatalogText;
window.CaintaOneData.item = (name, category, group, also = '', popular = false, price = null, seller = '') => ({
  name,
  category,
  group,
  popular,
  price,
  seller,
  key: normalizeCatalogText(name),
  icon: normalizeCatalogText(name).replace(/ /g, '-'),
  nameWords: normalizeCatalogText(name).split(' '),
  alsoWords: normalizeCatalogText(also).split(' ').filter(Boolean),
  categoryWords: normalizeCatalogText(category).split(' ')
});

// --- catalog-settings.js ---
window.CaintaOneData.catalogSource = 'database';

// --- food-catalog.js ---
window.CaintaOneData.foodCatalog = [
  // Boodle Brunch items
  window.CaintaOneData.item('Hot Chocolate', 'Boodle Brunch', 'Food', 'hot chocolate', false, 30),
  window.CaintaOneData.item('Pineapple Juice', 'Boodle Brunch', 'Food', 'pineapple juice', false, 60),
  window.CaintaOneData.item('Beef Tapa', 'Boodle Brunch', 'Food', 'beef tapa', true, 120),
  window.CaintaOneData.item('Iced Tea', 'Boodle Brunch', 'Food', 'iced tea', false, 25),
  window.CaintaOneData.item('Pinakbet', 'Boodle Brunch', 'Food', 'pinakbet', true, 130),
  window.CaintaOneData.item('Ginataang Tulingan', 'Boodle Brunch', 'Food', 'ginataang tulingan', true, 150),
  window.CaintaOneData.item('Buko Juice', 'Boodle Brunch', 'Food', 'buko juice', true, 50),
  window.CaintaOneData.item('Breakfast Silog', 'Boodle Brunch', 'Food', 'breakfast silog', true, 250),
  window.CaintaOneData.item('Melon Juice', 'Boodle Brunch', 'Food', 'melon juice', true, 120),
  window.CaintaOneData.item('Banana Bread', 'Boodle Brunch', 'Food', 'banana bread', false, 80),
  window.CaintaOneData.item('Ube Halaya Shake', 'Boodle Brunch', 'Food', 'ube halaya shake', false, 80),
  window.CaintaOneData.item('Spanish Bread', 'Boodle Brunch', 'Food', 'spanish bread', false, 15),
  window.CaintaOneData.item('Lechon Manok', 'Boodle Brunch', 'Food', 'lechon manok', true, 200),
  window.CaintaOneData.item('Cheese Bread', 'Boodle Brunch', 'Food', 'cheese bread', true, 150),
  window.CaintaOneData.item('Coffee', 'Boodle Brunch', 'Food', 'coffee', false, 25),
  window.CaintaOneData.item('Whole fried Chicken', 'Boodle Brunch', 'Food', 'whole fried chicken', true, 300),
  window.CaintaOneData.item('Calamansi Juice', 'Boodle Brunch', 'Food', 'calamansi juice', false, 40),
  window.CaintaOneData.item('Lechon Kawali', 'Boodle Brunch', 'Food', 'lechon kawali', true, 145),
  window.CaintaOneData.item('6x Donuts', 'Boodle Brunch', 'Food', 'donut', false, 70),
  window.CaintaOneData.item('Kare Kare', 'Boodle Brunch', 'Food', 'kare kare', true, 180),
  window.CaintaOneData.item('Halo-Halo', 'Boodle Brunch', 'Food', 'halo-halo', false, 50),
  window.CaintaOneData.item('Chocolate Bread', 'Boodle Brunch', 'Food', 'chocolate bread', false, 80),
  window.CaintaOneData.item('Sinigang Baboy', 'Boodle Brunch', 'Food', 'sinigang baboy', true, 150),
  //Deja Brew items
  window.CaintaOneData.item('24-Hour Cold Brew', 'Deja Brew', 'Food', 'cold brew', true, 160),
  window.CaintaOneData.item('Americano', 'Deja Brew', 'Food', 'americano', false, 130),
  window.CaintaOneData.item('Cafe Latte', 'Deja Brew', 'Food', 'cafe latte', false, 160),
  window.CaintaOneData.item('Cappuccino', 'Deja Brew', 'Food', 'cappuccino', true, 150),
  window.CaintaOneData.item('Decaf Therapy', 'Deja Brew', 'Food', 'decaf therapy', false, 160),
  window.CaintaOneData.item('Deja Brew House Blend', 'Deja Brew', 'Food', 'House Blend', true, 145),
  window.CaintaOneData.item('Espresso Double', 'Deja Brew', 'Food', 'espresso', true, 130),
  window.CaintaOneData.item('Espresso Single', 'Deja Brew', 'Food', 'espresso', true, 110),
  window.CaintaOneData.item('Iced Matcha', 'Deja Brew', 'Food', 'iced matcha', true, 190),
  window.CaintaOneData.item('Liquid Patience', 'Deja Brew', 'Food', 'liquid patience', false, 180),
  window.CaintaOneData.item("The Overthinker's Latte", 'Deja Brew', 'Food', 'Lattle', true, 190),
  //Crumb and Get It items
  window.CaintaOneData.item('Classic Vanilla', 'Crumb and Get It', 'Food', 'Vanilla', false, 800),
  window.CaintaOneData.item('Ube Bliss', 'Crumb and Get It', 'Food', 'Ube', false, 700),
  window.CaintaOneData.item('Red Velvet', 'Crumb and Get It', 'Food', 'red velvet', true, 750),
  window.CaintaOneData.item('Chocolate Dream', 'Crumb and Get It', 'Food', 'chocolate', true, 450),
  window.CaintaOneData.item('Cookies & Cream', 'Crumb and Get It', 'Food', 'cookies', true, 900),
  window.CaintaOneData.item('Mocha Delight', 'Crumb and Get It', 'Food', 'mocha', false, 850),
  // Wings and Twirl items
  window.CaintaOneData.item('Smokey Wing Shock', 'Wings and Twirl', 'Food', 'smokey wings', false, 170),
  window.CaintaOneData.item('Alfredo Twirl w/ Chicken(S)', 'Wings and Twirl', 'Food', 'alfredo wings chicken', true, 120),
  window.CaintaOneData.item('Alfredo Twirl w/ Shrimp(L)', 'Wings and Twirl', 'Food', 'alfredo wings shrimp', false, 170),
  window.CaintaOneData.item('Barbeque Wings', 'Wings and Twirl', 'Food', 'barbeque wings', true, 170),
  window.CaintaOneData.item('Deep Tomato Twirl', 'Wings and Twirl', 'Food', 'deep tomato twirl', true, 110),
  window.CaintaOneData.item('Fire-Fly Wings', 'Wings and Twirl', 'Food', 'fire-fly wings', false, 160),
  window.CaintaOneData.item('Pesto Breeze Twirl(S)', 'Wings and Twirl', 'Food', 'pesto breeze twirl', false, 130),
  window.CaintaOneData.item('Twisted Garlic-Parm Wings', 'Wings and Twirl', 'Food', 'garlic-parmesan wings', false, 180),
  // Lomi Nom Nom items
  window.CaintaOneData.item('The Condiments Bar', 'Lomi Nom Nom', 'Food', 'condiments', true, 120),
  window.CaintaOneData.item('Add Ons & Optional Toppings', 'Lomi Nom Nom', 'Food', 'add ons', false, 150),
  window.CaintaOneData.item('Solo Nom Lomi', 'Lomi Nom Nom', 'Food', 'solo nom lomi', true, 120),
  window.CaintaOneData.item('Sidekicks(Pang-Pares)', 'Lomi Nom Nom', 'Food', 'sidekicks', false, 170),
  window.CaintaOneData.item('Refreshing Drinks', 'Lomi Nom Nom', 'Food', 'refreshing drinks', true, 180),
  //Sip Happens items
  window.CaintaOneData.item('Vanilla Frappe', 'Sip Happens', 'Food', 'vanilla frappuccino', true, 150),
  window.CaintaOneData.item('Mocha Frappe', 'Sip Happens', 'Food', 'mocha frappuccino', true, 150),
  window.CaintaOneData.item('Iced Americano', 'Sip Happens', 'Food', 'iced americano', false, 150),
  window.CaintaOneData.item('Matcha Frappe', 'Sip Happens', 'Food', 'matcha frappuccino', true, 70),
  window.CaintaOneData.item('Iced Latte', 'Sip Happens', 'Food', 'iced latte', false, 80),
  window.CaintaOneData.item('Classic Coffee Frappe', 'Sip Happens', 'Food', 'iced mocha', true, 150),
  window.CaintaOneData.item('Iced Hazelnut Macchiato', 'Sip Happens', 'Food', 'iced hazelnut mocha', true, 100),
  window.CaintaOneData.item('Iced Caramel Macchiato', 'Sip Happens', 'Food', 'iced caramel macchiato', false, 100),
  window.CaintaOneData.item('Chocolate Milk Tea', 'Sip Happens', 'Food', 'chocolate milk tea', true, 80),
  window.CaintaOneData.item('Chocolate Frappe', 'Sip Happens', 'Food', 'chocolate frappuccino', true, 150),
  window.CaintaOneData.item('Hokkaido', 'Sip Happens', 'Food', 'hokkaido', false, 80),
  window.CaintaOneData.item('Cookies and Cream', 'Sip Happens', 'Food', 'cookies and cream', true, 80),
  window.CaintaOneData.item('Okinawa', 'Sip Happens', 'Food', 'okinawa', true, 70),
  window.CaintaOneData.item('Iced Mocha', 'Sip Happens', 'Food', 'iced mocha', false, 100),
  window.CaintaOneData.item('Caramel Frappe', 'Sip Happens', 'Food', 'caramel frappuccino', true, 150),
  window.CaintaOneData.item('Matcha', 'Sip Happens', 'Food', 'matcha', true, 90),
  // In Crust We Trust items
  window.CaintaOneData.item("The Believer's Meal(For 2)", 'In Crust We Trust', 'Food', "believer's meal", false, 999),
  window.CaintaOneData.item('The Solo Slice Deal', 'In Crust We Trust', 'Food', 'solo slice', true, 399),
  window.CaintaOneData.item('The Holy Grail(Classic Cheese)', 'In Crust We Trust', 'Food', 'holy grail', true, 459),
  window.CaintaOneData.item('The Garden Blessing(Veggie)', 'In Crust We Trust', 'Food', 'garden blessing', true, 569),
  window.CaintaOneData.item('Cheesy Crust Sticks', 'In Crust We Trust', 'Food', 'crust sticks', false, 289),
  window.CaintaOneData.item('The Family Feast (For 4)', 'In Crust We Trust', 'Food', "family feast", true, 1699),
  window.CaintaOneData.item('Loaded Pepperoni Fries', 'In Crust We Trust', 'Food', "pepperoni fries", true, 349),
  window.CaintaOneData.item('Trusty Garlic Knots', 'In Crust We Trust', 'Food', "garlic knots", false, 229),
  window.CaintaOneData.item('The Meat Messiah', 'In Crust We Trust', 'Food', "meat messiah", false, 629),
  //Wrap and Roll items
  window.CaintaOneData.item('Classic Beef Rice Bowl', 'Wrap and Roll', 'Food', "classic beef rice bowl", true, 150),
  window.CaintaOneData.item('The Overdrive Loaded Roll', 'Wrap and Roll', 'Food', "overdrive loaded roll", true, 175),
  window.CaintaOneData.item('Rock and Roast Beef', 'Wrap and Roll', 'Food', "rock and roast beef", false, 200),
  window.CaintaOneData.item('The Classic Headliner', 'Wrap and Roll', 'Food', "classic headliner", false, 150),
  window.CaintaOneData.item('Green Day Veggie Roll', 'Wrap and Roll', 'Food', "veggie roll", false, 250),
  window.CaintaOneData.item('Spicy Chicken Rice Bowl', 'Wrap and Roll', 'Food', "spicy chicken rice bowl", true, 150),
  window.CaintaOneData.item('Crispy Solo Chicken', 'Wrap and Roll', 'Food', "crispy solo chicken", true, 250),
];

// --- bazaar-catalog.js ---
window.CaintaOneData.bazaarCatalog = [
  //Appliances Items
  window.CaintaOneData.item('Electric Fan', 'Appliances', 'Appliances', 'electric fan', true, 899, 'Thomas Appliances'),
  window.CaintaOneData.item('Electric Mixer', 'Appliances', 'Appliances', 'electric mixer', true, 1299, 'Thomas Appliances'),
  window.CaintaOneData.item('Rice Cooker', 'Appliances', 'Appliances', 'rice cooker', true, 1550, 'Thomas Appliances'),
  window.CaintaOneData.item('Electric Kettle', 'Appliances', 'Appliances', 'electric kettle', true, 899, 'Thomas Appliances'),
  window.CaintaOneData.item('LED TV', 'Appliances', 'Appliances', 'led tv', true, 25000, 'Thomas Appliances'),
  window.CaintaOneData.item('Aircon', 'Appliances', 'Appliances', 'aircon', true, 15999, 'Thomas Appliances'),
  window.CaintaOneData.item('Electric Stove', 'Appliances', 'Appliances', 'electric stove', true, 8999, 'Thomas Appliances'),
  window.CaintaOneData.item('Coffee Maker', 'Appliances', 'Appliances', 'coffee maker', true, 7999, 'Thomas Appliances'),
  window.CaintaOneData.item('Electric Iron', 'Appliances', 'Appliances', 'electric iron', true, 567, 'Thomas Appliances'),
  window.CaintaOneData.item('Washing Machine', 'Appliances', 'Appliances', 'washing machine', true, 12999, 'Thomas Appliances'),
  //Bags Items
  window.CaintaOneData.item('School Bagpack', 'Bags', 'Bags', 'backpack', true, 899, 'South Face'),
  window.CaintaOneData.item('Small Purse', 'Bags', 'Bags', 'purse', true, 1299, 'Bucci'),
  //Cosmetics Items
  window.CaintaOneData.item('Brushes', 'Cosmetics', 'Cosmetics', 'brushes', true, 899, 'Maybelline'),
  window.CaintaOneData.item('Concealer', 'Cosmetics', 'Cosmetics', 'concealer', true, 1299, 'Maybelline'),
  window.CaintaOneData.item('Contouring Palette', 'Cosmetics', 'Cosmetics', 'contouring palette', true, 899, 'Maybelline'),
  window.CaintaOneData.item('Eyebrow Pencil', 'Cosmetics', 'Cosmetics', 'eyebrow pencil', true, 1299, 'Maybelline'),
  window.CaintaOneData.item('Eye Shadow', 'Cosmetics', 'Cosmetics', 'eye shadow', true, 2679, 'Maybelline'),
  window.CaintaOneData.item('Foundation', 'Cosmetics', 'Cosmetics', 'foundation', true, 1299, 'Maybelline'),
  window.CaintaOneData.item('Highlighter', 'Cosmetics', 'Cosmetics', 'highlighter', true, 899, 'Maybelline'),
  window.CaintaOneData.item('Lip Gloss', 'Cosmetics', 'Cosmetics', 'lip gloss', true, 1299, 'Maybelline'),
  window.CaintaOneData.item('Lipstick', 'Cosmetics', 'Cosmetics', 'lipstick', true, 899, 'Maybelline'),
  window.CaintaOneData.item('Makeup Sponge', 'Cosmetics', 'Cosmetics', 'makeup sponge', true, 1299, 'Maybelline'),
  window.CaintaOneData.item('Powder Blush-on', 'Cosmetics', 'Cosmetics', 'powder blush-on', true, 899, 'Maybelline'),
  window.CaintaOneData.item('Primer', 'Cosmetics', 'Cosmetics', 'primer', true, 1299, 'Maybelline'),
  window.CaintaOneData.item('Setting Spray', 'Cosmetics', 'Cosmetics', 'setting spray', true, 899, 'Maybelline'),
  //Electronics Items
  window.CaintaOneData.item('Headphones', 'Electronics', 'Electronics', 'headphones', true, 8999, 'Namnung'),
  window.CaintaOneData.item('MePhone 18 Pro-max', 'Electronics', 'Electronics', 'Smartphone', true, 75999, 'Orange'),
  window.CaintaOneData.item('MeWatch', 'Electronics', 'Electronics', 'Smartwatch', true, 59999, 'Orange'),
  //Shift LaBs Clothing Items
  window.CaintaOneData.item('B&W Shift LaBs V1', 'Clothing', 't-shirt', 't-shirt', true, 570, 'Shift LaBs'),
  window.CaintaOneData.item('B&W Shift LaBs V2', 'Clothing', 't-shirt', 't-shirt', true, 899, 'Shift LaBs'),
  window.CaintaOneData.item('CuteBot Shift LaBs', 'Clothing', 't-shirt', 't-shirt', true, 800, 'Shift LaBs'),
  window.CaintaOneData.item('Glow Shift LaBs', 'Clothing', 't-shirt', 't-shirt', true, 650, 'Shift LaBs'),
  window.CaintaOneData.item('Happy Shift LaBs', 'Clothing', 't-shirt', 't-shirt', true, 750, 'Shift LaBs'),
  window.CaintaOneData.item('Minimalist', 'Clothing', 't-shirt', 't-shirt', true, 630, 'Shift LaBs'),
  window.CaintaOneData.item('Retro Shift LaBs V3', 'Clothing', 't-shirt', 't-shirt', true, 700, 'Shift LaBs'),
  window.CaintaOneData.item('Casual Shift LaBs V8', 'Clothing', 't-shirt', 't-shirt', true, 750, 'Shift LaBs'),
  //Miscellaneous Clothing Items
  window.CaintaOneData.item('LeJeans', 'Clothing', 'pants', 'jeans', true, 1250, 'LEBON'),
  window.CaintaOneData.item("Mike's HanginForce 0nes", 'Clothing', 'shoes', 'shoes', true, 1350, 'MIKE'),
  window.CaintaOneData.item("Mike's HanginForce 8ths", 'Clothing', 'shoes', 'shoes', true, 899, 'MIKE'),
  window.CaintaOneData.item("Mike's Casual Nines", 'Clothing', 'shoes', 'shoes', true, 899, 'MIKE'),
  window.CaintaOneData.item("LeSunGlass", 'Clothing', 'shoes', 'shoes', true, 899, 'LEBON'),
  window.CaintaOneData.item("LeHoodies", 'Clothing', 'jacket', 'hoodies', true, 2899, 'LEBON'),
  window.CaintaOneData.item("LeT-shirt", 'Clothing', 't-shirt', 't-shirt', true, 3999, 'LEBON'),
  //Tumblers Items
  window.CaintaOneData.item('Sirain na Tumbler', 'Tumbler', 'Tumbler', 'tumbler', true, 30, 'Thermos'),
  window.CaintaOneData.item('Stainless Steel Water Bottle', 'Tumbler', 'cups', 'water bottle', true, 1299, 'Thermos'),
  window.CaintaOneData.item('Matibay na Tumbler', 'Tumbler', 'Tumbler', 'tumbler', true, 899, 'Thermos'),
  window.CaintaOneData.item('Magandang design na Tumbler', 'Tumbler', 'Tumbler', 'tumbler', true, 1299, 'Thermos'),
  window.CaintaOneData.item('Thermos na Tumbler', 'Tumbler', 'Tumbler', 'tumbler', true, 2599, 'Thermos'),
  window.CaintaOneData.item('HighTech na Tumbler V2 (with bluetooth)', 'Tumbler', 'Tumbler', 'tumbler', true, 10999, 'Thermos'),
  // Womens Clothing Items
  window.CaintaOneData.item('Womens Casual White & Blue Dress', 'Clothing', 'dress', 'dress', true, 899, 'Louis Bitin'),
  window.CaintaOneData.item('Princess-Seam Fit & Flare Mini Dress', 'Clothing', 'dress', 'dress', true, 599, 'Benching'),
  window.CaintaOneData.item('Tailored Asymmetric Vest & Wide-Leg Trouser Set', 'Clothing', 'dress', 'dress', true, 1799, 'Louis Bitin'),
  window.CaintaOneData.item('Cottagecore Puff-Sleeve Floral Dress', 'Clothing', 'dress', 'dress', true, 5099, 'Louis Bitin'),
  window.CaintaOneData.item('Ruched Square-Neck Peplum Top', 'Clothing', 'dress', 'dress', true, 789, 'UniqTo'),
  window.CaintaOneData.item('V-Neck Seamless Athleisure Crop Top', 'Clothing', 'dress', 'dress', true, 450, 'UniqTo'),
  window.CaintaOneData.item('Ruffled-Hem Cotton Sundress', 'Clothing', 'dress', 'dress', true, 8599, 'UniqTo'),
  window.CaintaOneData.item('Shawl-Collar Ribbed Knit Cardigan', 'Clothing', 'dress', 'dress', true, 899, 'M&H'),
  window.CaintaOneData.item('High-Slit Floral Wrap Maxi Dress', 'Clothing', 'dress', 'dress', true, 1299, 'M&H'),
  window.CaintaOneData.item('Satin A-Line Evening Gown', 'Clothing', 'dress', 'dress', true, 1299, 'M&H'),
];

// --- company.js ---
window.CaintaOneData.company = {
  name: 'Cainta One Express',
  location: 'Cainta, Rizal',
  phone: '09566753142',
  email: 'cainta1express@gmail.com'
};

// --- images.js ---
window.CaintaOneData.images = {
  categoryImages: {
    // Example: Fresh: { src: 'images/fresh.png', type: 'banner', alt: 'Fresh produce' }
  },
  itemImages: {
    //Food Express Menu images Catalog
    //Boodle Brunch images
    'Hot Chocolate': 'images/boodle_branch/5f0efa97-0329-4573-9828-3276fb68e159.jpg',
    'Pineapple Juice': 'images/boodle_branch/5f0efa97-0329-4573-9828-3276fb68e159.jpg',
    'Beef Tapa': 'images/boodle_branch/7b292879-ceb4-4505-b31e-e25f9d3d2d55.jpg',
    'Iced Tea': 'images/boodle_branch/18c6ba56-5921-47dc-85d8-2a123f863ace.jpg',
    'Pinakbet': 'images/boodle_branch/65e957f2-531d-4b76-8e97-72dc6338e224.jpg',
    //tuloy mo pa dito aeron
    'Ginataang Tulingan': 'images/boodle_branch/248f1163-3e49-4a6d-b78e-9e32621561f4.jpg',
    'Buko Juice': 'images/boodle_branch/372a239a-ca88-453b-9f9f-ed3f8eb1fe86.jpg',
    'Breakfast Silog': 'images/boodle_branch/444ce125-d807-494a-8fb8-a02365f46f8b.jpg',
    'Melon Juice': 'images/boodle_branch/758b365b-e8ce-453d-b0d8-a48a8d6ff404.jpg',
    'Banana Bread': 'images/boodle_branch/785e9eba-2f2b-4151-8be1-13f6075db2db.jpg',
    'Ube Halaya Shake': 'images/boodle_branch/4123fa4b-a55b-4bcf-a2e1-fb4ca68ca3f5.jpg',
    'Spanish Bread': 'images/boodle_branch/4694bbea-3783-4d7e-8764-c09806e4802d.jpg',
    'Lechon Manok': 'images/boodle_branch/748349af-0ef5-400a-9b0a-273d7b102af3.jpg',
    'Cheese Bread': 'images/boodle_branch/863515be-c737-4e52-ac41-e74134df4308.jpg',
    'Coffee': 'images/boodle_branch/1318035b-354a-4821-9153-2b4da4a13211.jpg',
    'Whole fried Chicken': 'images/boodle_branch/43526893-2834-47d5-a66d-5e8a22981fbc.jpg',
    'Calamansi Juice': 'images/boodle_branch/b9d5a449-9361-4986-bd79-ee9cea119ed7.jpg',
    'Lechon Kawali': 'images/boodle_branch/bbf9df4a-4b8f-467e-a8b2-2c4037fcc9ee.jpg',
    '6x Donuts': 'images/boodle_branch/bfe7e6e4-7ae7-41e9-8056-964213fb8cab.jpg',
    'Kare Kare': 'images/boodle_branch/c4b51d8d-5dbc-4a28-8c85-e2b09181dc3f.jpg',
    'Halo-Halo': 'images/boodle_branch/ca5316b6-fcb8-42a1-b5d1-7529b02db78d.jpg',
    'Chocolate Bread': 'images/boodle_branch/d91548fe-d411-4ae3-ade4-590c1cda7377.jpg',
    'Sinigang Baboy': 'images/boodle_branch/ee67ae4e-f457-4881-8654-54dba60a7562.jpg',

    // Deja Brew images
    '24-Hour Cold Brew': 'images/Cafe/24-Hour Cold Brew (Php 160).jpg',
    'Americano': 'images/Cafe/Americano (Php130).jpg',
    'Cafe Latte': 'images/Cafe/Cafe Latte (Php 160).jpg',
    'Cappuccino': 'images/Cafe/Cappuccino (Php150).jpg',
    'Decaf Therapy': 'images/Cafe/Decaf Therapy (Php160).jpg',
    'Deja Brew House Blend': 'images/Cafe/Deja Brew House Blend (Php145).jpg',
    'Espresso Double': 'images/Cafe/Espresso Double_Single (Php110_Php130).jpg',
    'Espresso Single': 'images/Cafe/Espresso Double_Single (Php110_Php130).jpg',
    'Iced Matcha': 'images/Cafe/Iced Matcha (Php190).jpg',
    'Liquid Patience': 'images/Cafe/Liquid Patience (Php180).jpg',
    "The Overthinker's Latte": 'images/Cafe/The Overthinker_s Latte (190).jpg',

    // Crumb and Get It images
    'Classic Vanilla': 'images/cakes/1ac22c3c-cedf-4d72-8edc-af8089f7805e.jpg',
    'Ube Bliss': 'images/cakes/269e9ec4-f72c-4634-9e5c-f11f4c2127af.jpg',
    'Red Velvet': 'images/cakes/595d05c3-799a-4bab-928b-ad9dece75ea1.jpg',
    'Chocolate Dream': 'images/cakes/823ad33d-2205-4e05-b2ab-729fe5a7bf2c.jpg',
    'Cookies & Cream': 'images/cakes/5763f836-90dd-4701-aa54-0a3043d22a1f.jpg',
    'Mocha Delight': 'images/cakes/b92aee25-7770-484d-bb3a-64da2c02ce49.jpg',

    // Wings and Twirl images
    'Smokey Wing Shock': 'images/chicken/22154056-25b4-4c1c-be49-cca9b8de2b29.jpg',
    'Alfredo Twirl w/ Chicken(S)': 'images/chicken/Alfredo Twirl Chicken .jpg',
    'Alfredo Twirl w/ Shrimp(L)': 'images/chicken/Alfredo Twirl w_ Shrimp.jpg',
    'Barbeque Wings': 'images/chicken/bbq Wings.jpg',
    'Deep Tomato Twirl': 'images/chicken/Deep Tomato Twirl.jpg',
    'Fire-Fly Wings': 'images/chicken/Fire-fly Wings.jpg',
    'Pesto Breeze Twirl(S)': 'images/chicken/Pesto Breeze Twirl.jpg',
    'Twisted Garlic-Parm Wings': 'images/chicken/Twisted Garlic Parm Wings.jpg',

    // Lomi Nom Nom images
    'The Condiments Bar': 'images/lomi/6e898691-ec92-4964-911a-b9ca3bfd1b0d.jpg',
    'Add Ons & Optional Toppings': 'images/lomi/148dac39-77f2-41fb-a7e6-0f37408f5fe8.jpg',
    'Solo Nom Lomi': 'images/lomi/16206f56-4dc3-4a77-b72a-e800e9aaa635.jpg',
    'Sidekicks(Pang-Pares)': 'images/lomi/a97f954a-0380-484c-bc52-c5583b30b71e.jpg',
    'Refreshing Drinks': 'images/lomi/bbf07bfc-8a2f-48d4-8ecb-0a99e661a938.jpg',

    // Sip Happens images
    'Vanilla Frappe': 'images/milktea/0fd43226-5d4d-43b5-8b3f-892b27f6359b.jpg',
    'Mocha Frappe': 'images/milktea/1c414a10-8807-41b4-90fe-91d2b56a9c63.jpg',
    'Iced Americano': 'images/milktea/5ff68948-7c8e-4197-bb11-dbd9b426dc26.jpg',
    'Matcha Frappe': 'images/milktea/6cac8b6d-6e8c-4d6b-95b5-f7830de59f6b.jpg',
    'Iced Latte': 'images/milktea/6cac8b6d-6e8c-4d6b-95b5-f7830de59f6b.jpg',
    'Classic Coffee Frappe': 'images/milktea/26dffc10-d862-493b-8799-de85f5505345.jpg',
    'Iced Hazelnut Macchiato': 'images/milktea/511410f7-8e78-4c50-80dc-0ff2f9de3e47.jpg',
    'Iced Caramel Macchiato': 'images/milktea/4994abe4-186e-4ed4-93f1-0250c640946e.jpg',
    'Chocolate Milk Tea': 'images/milktea/511410f7-8e78-4c50-80dc-0ff2f9de3e47.jpg',
    'Chocolate Frappe': 'images/milktea/a300dd0b-6c23-4b0c-bac3-4c726ca52c62.jpg',
    'Hokkaido': 'images/milktea/aef8819e-ad41-4825-9527-f75cc9cad873.jpg',
    'Cookies and Cream': 'images/milktea/d7eceaad-0388-4129-9095-89d9add1e5eb.jpg',
    'Okinawa': 'images/milktea/d62c264d-2785-4a8f-8e4d-58a526f87965.jpg',
    'Iced Mocha': 'images/milktea/de47e001-77d1-41bb-83ab-795cd612f05d.jpg',
    'Caramel Frappe': 'images/milktea/ded301df-7033-4608-a6a9-881a47890900.jpg',
    'Matcha': 'images/milktea/e778fc1f-26a8-4c63-aa8d-81e21091fd29.jpg',

    // In Crust We Trust images
    "The Believer's Meal(For 2)": 'images/Pizza/2bb3bfba-2537-4801-8fd0-85f59cd53c14.jpg',
    'The Solo Slice Deal': 'images/Pizza/80d3a433-2570-4bc2-83a9-bb4e52d7301f.jpg',
    'The Holy Grail(Classic Cheese)': 'images/Pizza/7183b37d-faa7-417a-966e-998e1c4396e0.jpg',
    'The Garden Blessing(Veggie)': 'images/Pizza/8545be83-7a5f-4af8-9efc-0e684369d210.jpg',
    'Cheesy Crust Sticks': 'images/Pizza/303829aa-016a-424a-9810-29cd40c14551.jpg',
    'The Family Feast (For 4)': 'images/Pizza/28388796-82bf-421b-90f7-84bacc3ba693.jpg',
    'Loaded Pepperoni Fries': 'images/Pizza/a6b74b3a-1275-4278-ac70-03c8d33c71dd.jpg',
    'Trusty Garlic Knots': 'images/Pizza/ebd3b7e8-ce02-43fa-a92c-bc3d3a57d226.jpg',
    'The Meat Messiah': 'images/Pizza/f14d573c-c2e8-4f67-ae90-7b3cb598f5d4.jpg',

    // Wrap and Roll images
    'Classic Beef Rice Bowl': 'images/shawarma/0d41428b-8f53-4e92-bccf-0dc44c0816c3.jpg',
    'The Overdrive Loaded Roll': 'images/shawarma/40b194cb-1612-4f4c-9059-9b82737d277b.jpg',
    'Rock and Roast Beef': 'images/shawarma/57ec90e6-80e4-4c9c-85d7-509d1706e100.jpg',
    'The Classic Headliner': 'images/shawarma/269f96de-ac39-473b-a920-55cba0d842ce.jpg',
    'Green Day Veggie Roll': 'images/shawarma/891ed10a-7376-48d9-a28c-ab490aa85eb0.jpg',
    'Spicy Chicken Rice Bowl': 'images/shawarma/958d67c4-4b2d-4f72-8dec-08571af5e1e8.jpg',
    'Crispy Solo Chicken': 'images/shawarma/e9d6ac94-0bdc-4adb-a339-3c1aa4718a3d.jpg',
    /////////////////////////////////////////////////////////////////////////////////////
    //Online Bazaar images

    //Appliances images
    'Electric Fan': 'images/Appliances/Appliances-1.jpg',
    'Electric Mixer': 'images/Appliances/Appliances-2.jpg',
    'Rice Cooker': 'images/Appliances/Appliances-3.jpg',
    'Electric Kettle': 'images/Appliances/Appliances-4.jpg',
    'LED TV': 'images/Appliances/Appliances-5.jpg',
    'Aircon': 'images/Appliances/Appliances-6.jpg',
    'Electric Stove': 'images/Appliances/Appliances-7.jpg',
    'Coffee Maker': 'images/Appliances/Appliances-9.jpg',
    'Electric Iron': 'images/Appliances/Appliances-10.jpg',
    'Washing Machine': 'images/Appliances/Appliances-11.jpg',

    // Bags images
    'School Bagpack': 'images/Bags/photo-1553062407-98eeb64c6a62.png',
    'Small Purse': 'images/Bags/photo-1584917865442-de89df76afd3.png',

    // Cosmetics images
    'Brushes': 'images/Cosmetics/brushes.jpg',
    'Concealer': 'images/Cosmetics/concealer.jpg',
    'Contouring Palette': 'images/Cosmetics/contour.jpg',
    'Eyebrow Pencil': 'images/Cosmetics/eyebrow pencil.jpg',
    'Eye Shadow': 'images/Cosmetics/eyeshaddow.jpg',
    'Foundation': 'images/Cosmetics/foundation.jpg',
    'Highlighter': 'images/Cosmetics/highlighter.jpg',
    'Lip Gloss': 'images/Cosmetics/lip gloss.jpg',
    'Lipstick': 'images/Cosmetics/lipstick.jpg',
    'Makeup Sponge': 'images/Cosmetics/make up sponge.jpg',
    'Powder Blush-on': 'images/Cosmetics/powder blush on.jpg',
    'Primer': 'images/Cosmetics/primer.jpg',
    'Setting Spray': 'images/Cosmetics/setting spray.jpg',

    // Electronics images
    'Headphones': 'images/Electronics/photo-1505740420928-5e560c06d30e.png',
    'MePhone 18 Pro-max': 'images/Electronics/photo-1511707171634-5f897ff02aa9.png',
    'MeWatch': 'images/Electronics/photo-1523275335684-37898b6baf30.png',

    // Shift Labs clothing images
    'B&W Shift LaBs V1': 'images/Shift_Labs_Clothing/B&W Shift Labs V1 (Php570).jpg',
    'B&W Shift LaBs V2': 'images/Shift_Labs_Clothing/B&W Shift Labs V2.jpg',
    'CuteBot Shift LaBs': 'images/Shift_Labs_Clothing/CuteBot Shift Labs (Php800).jpg',
    'Glow Shift LaBs': 'images/Shift_Labs_Clothing/Glow Shift Labs (Php650).jpg',
    'Happy Shift LaBs': 'images/Shift_Labs_Clothing/Happy Shift Labs (Php 750).jpg',
    'Minimalist': 'images/Shift_Labs_Clothing/minimalist (Php630).jpg',
    'Retro Shift LaBs V3': 'images/Shift_Labs_Clothing/Shift Labs V3.jpg',
    'Casual Shift LaBs V8': 'images/Shift_Labs_Clothing/Star Shift Labs (Php950).jpg',
    'LeJeans': 'images/Shift_Labs_Clothing/photo-1542272604-787c3835535d.png',
    "Mike's HanginForce 0nes": 'images/Shift_Labs_Clothing/photo-1542291026-7eec264c27ff.png',
    "Mike's HanginForce 8ths": 'images/Shift_Labs_Clothing/photo-1552346154-21d32810aba3.png',
    "Mike's Casual Nines": 'images/Shift_Labs_Clothing/photo-1460353581641-37baddab0fa2.png',
    'LeSunGlass': 'images/Shift_Labs_Clothing/photo-1511499767150-a48a237f0083.png',
    'LeHoodies': 'images/Shift_Labs_Clothing/photo-1515886657613-9f3515b0c78f.png',
    'LeT-shirt': 'images/Shift_Labs_Clothing/photo-1521572163474-6864f9cf17ab.png',

    // Tumbler images
    'Sirain na Tumbler': 'images/Tumbler/photo-1550736386-78b14d2601f8.png',
    'Stainless Steel Water Bottle': 'images/Tumbler/photo-1602143407151-7111542de6e8.png',
    'Matibay na Tumbler': 'images/Tumbler/photo-1625708458528-802ec79b1ed8.png',
    'Magandang design na Tumbler': 'images/Tumbler/photo-1625708458528-802ec79b1ed8.png',
    'Thermos na Tumbler': 'images/Tumbler/photo-1789925941122-8162d3628b47.png',
    'HighTech na Tumbler V2 (with bluetooth)': 'images/Tumbler/photo-1789276392869-8103c256a501.png',

    // Womens clothing images
    'Womens Casual White & Blue Dress': 'images/women_cloths/1.webp',
    'Princess-Seam Fit & Flare Mini Dress': 'images/women_cloths/2.jpg',
    'Tailored Asymmetric Vest & Wide-Leg Trouser Set': 'images/women_cloths/3.jpg',
    'Cottagecore Puff-Sleeve Floral Dress': 'images/women_cloths/4.jpg',
    'Ruched Square-Neck Peplum Top': 'images/women_cloths/6.webp',
    'V-Neck Seamless Athleisure Crop Top': 'images/women_cloths/7.jpg',
    'Ruffled-Hem Cotton Sundress': 'images/women_cloths/9.jpg',
    'Shawl-Collar Ribbed Knit Cardigan': 'images/women_cloths/10.webp',
    'High-Slit Floral Wrap Maxi Dress': 'images/women_cloths/11.webp',
    'Satin A-Line Evening Gown': 'images/women_cloths/photo-1496747611176-843222e1e57c.png',
  },
  foodPhotosByMenu: [
    { terms: ['spaghetti', 'pasta', 'lasagna', 'noodles', 'pancit'], photo: 'images/Kainin_mo_to/photo-1473093295043-cdd812d0e601.png' },
    { terms: ['pizza'], photo: 'images/Kainin_mo_to/photo-1513104890138-7c749659a591.png' },
    { terms: ['burger', 'yumburger', 'whopper'], photo: 'images/Kainin_mo_to/photo-1568901346375-23c9450c58cd.png' },
    { terms: ['chicken', 'inasal'], photo: 'images/Kainin_mo_to/photo-1626082927389-6cd097cdc6ec.png' },
    { terms: ['fries', 'siomai', 'chao fan', 'bowl'], photo: 'images/Kainin_mo_to/photo-1512058564366-18510be2db19.png' }
  ],
  bazaarPhotoGroups: [
    { category: 'Clothing', match: /t-shirt|polo|hoodie/, photos: ['images/Shift_Labs_Clothing/photo-1521572163474-6864f9cf17ab.png', 'images/Shift_Labs_Clothing/photo-1515886657613-9f3515b0c78f.png'] },
    { category: 'Clothing', match: /dress/, photos: ['images/women_cloths/photo-1496747611176-843222e1e57c.png', 'images/women_cloths/photo-1595777457583-95e059d581b8.png'] },
    { category: 'Clothing', match: /jeans/, photos: ['images/Shift_Labs_Clothing/photo-1542272604-787c3835535d.png', 'images/Shift_Labs_Clothing/photo-1515886657613-9f3515b0c78f.png'] },
    { category: 'Shoes', match: /sneakers|shoes/, photos: ['images/Shift_Labs_Clothing/photo-1542291026-7eec264c27ff.png', 'images/Shift_Labs_Clothing/photo-1552346154-21d32810aba3.png', 'images/Shift_Labs_Clothing/photo-1460353581641-37baddab0fa2.png'] },
    { category: 'Shoes', match: /sandals|slippers/, photos: ['images/Shift_Labs_Clothing/photo-1460353581641-37baddab0fa2.png', 'images/Shift_Labs_Clothing/photo-1552346154-21d32810aba3.png'] },
    { category: 'Bags', match: /backpack/, photos: ['images/Bags/photo-1553062407-98eeb64c6a62.png', 'images/Bags/photo-1584917865442-de89df76afd3.png'] },
    { category: 'Bags', match: /bag/, photos: ['images/Bags/photo-1584917865442-de89df76afd3.png', 'images/Bags/photo-1553062407-98eeb64c6a62.png'] },
    { category: 'Accessories', match: /watch/, photos: ['images/Electronics/photo-1523275335684-37898b6baf30.png'] },
    { category: 'Accessories', match: /sunglasses/, photos: ['images/Shift_Labs_Clothing/photo-1511499767150-a48a237f0083.png'] },
    { category: 'Accessories', match: /cap/, photos: ['images/Shift_Labs_Clothing/photo-1515886657613-9f3515b0c78f.png'] },
    { category: 'Electronics', match: /earphone|headphone/, photos: ['images/Electronics/photo-1505740420928-5e560c06d30e.png', 'images/Electronics/photo-1511707171634-5f897ff02aa9.png'] },
    { category: 'Electronics', match: /phone|cable|power bank/, photos: ['images/Electronics/photo-1511707171634-5f897ff02aa9.png', 'images/Electronics/photo-1505740420928-5e560c06d30e.png'] }
  ],
  bazaarCategoryPhotos: {
    Clothing: ['images/Shift_Labs_Clothing/photo-1521572163474-6864f9cf17ab.png', 'images/women_cloths/photo-1496747611176-843222e1e57c.png'],
    Shoes: ['images/Shift_Labs_Clothing/photo-1542291026-7eec264c27ff.png', 'images/Shift_Labs_Clothing/photo-1552346154-21d32810aba3.png'],
    Bags: ['images/Bags/photo-1553062407-98eeb64c6a62.png', 'images/Bags/photo-1584917865442-de89df76afd3.png'],
    Accessories: ['images/Electronics/photo-1523275335684-37898b6baf30.png', 'images/Shift_Labs_Clothing/photo-1511499767150-a48a237f0083.png'],
    Electronics: ['images/Electronics/photo-1511707171634-5f897ff02aa9.png', 'images/Electronics/photo-1505740420928-5e560c06d30e.png'],
    Appliances: ['images/Appliances/Appliances-8.jpg'],
    Cosmetics: ['images/Cosmetics/logo.jpg'],
  },
  bazaarCategoryPhotoOverrides: {
    Clothing: []
  },
  restaurants: [
    {
      name: 'Boodle Brunch',
      area: 'Junction',
      address: 'Ortigas Avenue Extension, San Buena, Cainta, Rizal 1900',
      lat: 14.586457,
      lon: 121.1134744,
      photo: 'images/boodle_branch/logo.jpg'
    },
    {
      name: "Deja Brew",
      area: 'San Isidro',
      address: 'Cardinal Santos Street, Teachers Village, Cainta, Rizal 1900',
      lat: 14.5785966,
      lon: 121.1160083,
      photo: 'images/Cafe/logo.jpg'
    },
    {
      name: 'Crumb and Get It',
      area: 'Brookside',
      address: 'Ortigas Avenue Extension, San Buena, Cainta, Rizal 1900',
      lat: 14.5863791,
      lon: 121.1137359,
      photo: 'images/cakes/9795da14-67cc-44c5-86fa-8e0e5701c529.jpg'
    },
    {
      name: 'Wings and Twirl',
      area: 'Sto. Domingo',
      address: 'Santa Lucia Drive, Cainta, Rizal 1900',
      lat: 14.6177452,
      lon: 121.1004004,
      photo: 'images/chicken/logo.jpg'
    },
    {
      name: 'Lomi Nom Nom',
      area: 'Karangalan',
      address: 'F. P. Felix Avenue, Cainta, Rizal 1900',
      lat: 14.6193028,
      lon: 121.1021025,
      photo: 'images/lomi/6d3a6f42-48bd-4fce-a2e1-9e7f5998b413.jpg'
    },
    { name: 'Sip Happens', area: 'Santo Domingo', address:'1562 Birmingham Street, Brookside Hills Subdivision,  Cainta, 1900 Rizal',lat: 14.5824, lon: 121.1134744, photo: 'images/milktea/8b5cf3d6-b478-45d5-a869-52e251432c80.jpg' },
    { name: 'In Crust We Trust', area: 'San Juan', address:' Lot 15-B Redbud Street, Greenwoods Executive Village Phase 2, Cainta, 1900 Rizal',lat: 14.5785966, lon: 121.1160083, photo: 'images/Pizza/0b116767-c712-41c8-9aaf-003ecdfd75fe.jpg' },
    { name: 'Wrap and Roll', area: 'San Isidro', address:' 84 Ortega Street, Vista Verde Executive Village,  Cainta, 1900 Rizal',lat: 14.5863791, lon: 121.1137359, photo: 'images/shawarma/logo.jpg' }
  ],
  categoryIcons: {
    All: 'all',
    'Boodle Brunch': 'chicken',
    "Deja Brew": 'fried-chicken',
    'Crumb and Get It': 'chicken',
    'Wings and Twirl': 'chicken',
    'Lomi Nom Nom': 'noodles',
    'Sip Happens': 'pizza',
    'In Crust We Trust': 'pizza',
    'Wrap and Roll': 'sandwich',
    Popeyes: 'fried-chicken',
    Fresh: 'vegetables',
    Pantry: 'cooking-oil',
    Snacks: 'snacks',
    Drinks: 'softdrinks',
    Meals: 'adobo',
    Clothing: 't-shirts',
    Shoes: 'sneakers',
    Bags: 'handbags',
    Accessories: 'watches',
    Home: 'home-decor',
    Electronics: 'electronics'
  }
};

// --- delivery-settings.js ---
window.CaintaOneData.deliverySettings = {
  assumedAverageSpeedKmh: 20
};
