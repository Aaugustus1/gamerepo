const mongoose = require('mongoose');

const queueSettingSchema = new mongoose.Schema(
  {
    game: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Game',
      required: true,
      unique: true
    },
    position: { type: Number, default: 0 },
    estimatedWait: { type: String, default: '5h 23m' },
    onlineNow: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model('QueueSetting', queueSettingSchema);
