const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    game: { type: mongoose.Schema.Types.ObjectId, ref: 'Game', required: true },
    username: { type: String, required: true, trim: true },
    avatarColor: {
      type: String,
      default: '#7c6dfa',
      match: /^#([0-9a-fA-F]{6})$/
    },
    stars: { type: Number, default: 5, min: 1, max: 5 },
    text: { type: String, required: true, trim: true },
    timestampLabel: { type: String, default: '1 day ago' },
    isApproved: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model('Review', reviewSchema);
