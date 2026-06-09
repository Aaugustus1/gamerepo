const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    intervalSeconds: { type: Number, default: 15, min: 3, max: 600 },
    usernamePool: {
      type: [String],
      default: [
        'NightOwl_42',
        'RetroGamerX',
        'PixelHunter',
        'VaultDiver',
        'CloudStriker',
        'ArcadeKing',
        'LootLlama',
        'SaveScummer',
        'GrindMode',
        'FinalBoss99',
        'SpeedRunJoe',
        'BounceMaster'
      ]
    },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model('Notification', notificationSchema);
