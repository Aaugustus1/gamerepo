const mongoose = require('mongoose');

const gpuOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ping: { type: String, default: '12ms' },
    nodeLocation: { type: String, default: 'US-East Nodes' },
    freeSlots: { type: Number, default: 8 },
    isFull: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false }
  },
  { _id: false }
);

const streamingConfigSchema = new mongoose.Schema(
  {
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
      unique: true
    },
    gpuOptions: { type: [gpuOptionSchema], default: [] },
    qualityOptions: {
      type: [String],
      default: [
        'Balanced (1080p, High settings)',
        'Performance (720p, Ultra settings)',
        'Fidelity (4K, Ultra settings)'
      ]
    },
    frameRateOptions: {
      type: [String],
      default: [
        '60 FPS (Silky Smooth)',
        '30 FPS (Console Cinematic)',
        '120 FPS (Competitive)'
      ]
    },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model('StreamingConfig', streamingConfigSchema);
