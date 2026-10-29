// Fictional seed data: 12 vehicles + 12 properties. Prices in LKR.
const users = [
  { _id: 'u1', name: 'Amal Perera', bio: 'Test user 1' },
  { _id: 'u2', name: 'Nimali Fernando', bio: 'Test user 2' },
];

const v = (id, title, location, price, make, model, year, fuel, popularity) => ({
  _id: id, title, category: 'vehicle', location, price, popularity,
  attributes: { make, model, year, fuel },
});
const p = (id, title, location, price, propertyType, bedrooms, areaSqft, popularity) => ({
  _id: id, title, category: 'property', location, price, popularity,
  attributes: { propertyType, bedrooms, areaSqft },
});

const listings = [
  v('L001', 'Toyota Aqua 2016 Hybrid', 'Colombo', 6450000, 'Toyota', 'Aqua', 2016, 'Hybrid', 90),
  v('L002', 'Toyota Prius 2014', 'Kandy', 9800000, 'Toyota', 'Prius', 2014, 'Hybrid', 70),
  v('L003', 'Toyota Axio 2015', 'Galle', 7200000, 'Toyota', 'Axio', 2015, 'Petrol', 60),
  v('L004', 'Honda Vezel 2017 RS', 'Colombo', 11500000, 'Honda', 'Vezel', 2017, 'Hybrid', 85),
  v('L005', 'Honda Fit 2013', 'Negombo', 5900000, 'Honda', 'Fit', 2013, 'Petrol', 50),
  v('L006', 'Suzuki Alto 2019', 'Kandy', 3400000, 'Suzuki', 'Alto', 2019, 'Petrol', 75),
  v('L007', 'Suzuki Wagon R 2018', 'Colombo', 4100000, 'Suzuki', 'Wagon R', 2018, 'Hybrid', 65),
  v('L008', 'Nissan Leaf 2015', 'Colombo', 5200000, 'Nissan', 'Leaf', 2015, 'Electric', 55),
  v('L009', 'Nissan X-Trail 2016', 'Galle', 14500000, 'Nissan', 'X-Trail', 2016, 'Petrol', 45),
  v('L010', 'Mitsubishi Montero 2012', 'Jaffna', 22000000, 'Mitsubishi', 'Montero', 2012, 'Diesel', 30),
  v('L011', 'Toyota Hilux 2018 Double Cab', 'Negombo', 16800000, 'Toyota', 'Hilux', 2018, 'Diesel', 68),
  v('L012', 'Mitsubishi Outlander 2014', 'Kandy', 13200000, 'Mitsubishi', 'Outlander', 2014, 'Petrol', 40),
  p('L013', '2BR Apartment, Colombo 05', 'Colombo', 28500000, 'Apartment', 2, 950, 88),
  p('L014', '3BR Luxury Apartment, Colombo 03', 'Colombo', 45000000, 'Apartment', 3, 1450, 72),
  p('L015', '2BR Apartment, Rajagiriya', 'Colombo', 19500000, 'Apartment', 2, 880, 62),
  p('L016', '4BR House, Peradeniya Road', 'Kandy', 32000000, 'House', 4, 2400, 66),
  p('L017', '3BR House, Katugastota', 'Kandy', 18500000, 'House', 3, 1700, 48),
  p('L018', '3BR House near Galle Fort', 'Galle', 38000000, 'House', 3, 1900, 58),
  p('L019', '20 Perch Land, Negombo', 'Negombo', 8500000, 'Land', 0, 5440, 52),
  p('L020', '40 Perch Land, Katunayake', 'Negombo', 12000000, 'Land', 0, 10890, 42),
  p('L021', '1 Acre Land, Jaffna', 'Jaffna', 6800000, 'Land', 0, 43560, 35),
  p('L022', '2BR Apartment, Galle', 'Galle', 21000000, 'Apartment', 2, 900, 46),
  p('L023', 'Beachside Villa, Unawatuna', 'Galle', 85000000, 'Villa', 5, 3800, 38),
  p('L024', 'Commercial Building, Fort', 'Colombo', 120000000, 'Commercial', 0, 6200, 44),
];

// Up to five listings carry a sample image stored in the (private) bucket.
const imageKeys = { L001: 'listing-1.svg', L004: 'listing-2.svg', L013: 'listing-3.svg', L018: 'listing-4.svg', L023: 'listing-5.svg' };
listings.forEach((l) => { if (imageKeys[l._id]) l.imageKey = imageKeys[l._id]; });

module.exports = { users, listings, imageKeys };
