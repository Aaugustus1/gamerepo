const mongoose = require('mongoose');

const howItWorksStepSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    icon: { type: String, default: '⚡' }
  },
  { _id: false }
);

const footerColumnSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    links: [
      {
        label: { type: String, required: true },
        href: { type: String, default: '#' },
        _id: false
      }
    ]
  },
  { _id: false }
);

const siteSettingsSchema = new mongoose.Schema(
  {
    heroEyebrow: { type: String, default: 'Next-Gen Streaming · Play Instantly' },
    heroHeadline: {
      type: String,
      default: 'High-Performance Cloud Gaming.<br>Anywhere, Anytime.'
    },
    heroHeadlineEm: { type: String, default: 'Cloud Gaming' },
    heroSubheadline: {
      type: String,
      default:
        'Stream high-end PC and console games directly to your browser. No downloads, no hardware upgrades required. Access an expanding catalog of premium titles instantly via our optimized cloud network.'
    },
    howItWorksTitle: { type: String, default: 'How It Works' },
    howItWorksSteps: { type: [howItWorksStepSchema], default: [] },
    compatibilityTitle: {
      type: String,
      default: 'Compatible With Your Devices'
    },
    compatibilityDevices: {
      type: [String],
      default: ['PC', 'Mac', 'iOS', 'Android', 'Chromebook', 'Smart TV']
    },
    footerColumns: { type: [footerColumnSchema], default: [] },
    updatedAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = mongoose.model('SiteSetting', siteSettingsSchema);
