const mongoose = require('mongoose');

const gameSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    publisher: { type: String, default: 'THE GAME REPOSITORY' },
    genres: [{ type: String }],
    coverImage: { type: String, default: '' },
    screenshots: [{ type: String }],
    description: { type: String, default: '' },
    starRating: { type: Number, default: 4.5, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0 },
    cloudReady: { type: Boolean, default: true },
    playersOnline: { type: Number, default: 1500 },
    catalogCode: { type: String, default: '' },
    icon: { type: String, default: '🎮' },
    streamUrl: { type: String, default: '' },
    section: {
      type: String,
      enum: [
        'premium',
        'retro',
        'mobile',
        'niche',
        'ios',
        'trending'
      ],
      default: 'retro'
    },
    order: { type: Number, default: 0 },
    isNewBadge: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model('Game', gameSchema);
