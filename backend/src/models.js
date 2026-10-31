const mongoose = require('mongoose');
const { Schema } = mongoose;

const TYPES = ['view', 'save', 'contact'];

const User = mongoose.model('User', new Schema({ _id: String, name: String, bio: String }));

const Listing = mongoose.model('Listing', new Schema({
  _id: String,
  title: { type: String, required: true },
  category: { type: String, enum: ['vehicle', 'property'], required: true },
  location: String,
  price: Number,
  currency: { type: String, default: 'LKR' },
  // vehicle: { make, model, year, fuel }   property: { propertyType, bedrooms, areaSqft }
  attributes: Schema.Types.Mixed,
  popularity: { type: Number, default: 0 }, // seeded 0-100 prior used for cold start
  imageKey: String,
}));

// One aggregated row per (user, listing, type). Repeated clicks increment `count`
// instead of creating unbounded rows; the ranker caps how much `count` can matter.
const interactionSchema = new Schema({
  userId: { type: String, required: true, index: true },
  listingId: { type: String, required: true },
  type: { type: String, enum: TYPES, required: true },
  count: { type: Number, default: 0 },
  lastAt: { type: Date, default: Date.now },
});
interactionSchema.index({ userId: 1, listingId: 1, type: 1 }, { unique: true });
const Interaction = mongoose.model('Interaction', interactionSchema);

module.exports = { User, Listing, Interaction, TYPES };
