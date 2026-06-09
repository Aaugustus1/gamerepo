const mongoose = require('mongoose');

const trendingItemSchema = new mongoose.Schema(
  {
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    rank: { type: Number, required: true },
    rankLabel: { type: String, default: '#1' }
  },
  { _id: false }
);

const trendingConfigSchema = new mongoose.Schema(
  {
    items: { type: [trendingItemSchema], default: [] },
    title: { type: String, default: 'Trending This Week' },
    enabled: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model('TrendingConfig', trendingConfigSchema);
