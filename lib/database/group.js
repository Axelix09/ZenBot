import mongoose from 'mongoose';

const GroupSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  antilink: { type: Boolean, default: false },
  antilink_active: { type: [String], default: [] },
  antinotadevoz: { type: Boolean, default: false },
  antimenciongp: { type: Boolean, default: false },
  antisticker: { type: Boolean, default: false },
  antivideo: { type: Boolean, default: false },
  antiimagen: { type: Boolean, default: false },
  antidelete: { type: Boolean, default: false },
  antitoxic: { type: Boolean, default: false },
  antispam: { type: Boolean, default: false },
  antispam_config: {
    type: mongoose.Schema.Types.Mixed,
    default: {
      maxMessages: 5,
      timeWindow: 5000,
      warnLimit: 3,
      muteDuration: 300000
    }
  },
  welcome: { type: Boolean, default: false },
  welcomeMsg: { type: String, default: null },
  welcomeImage: { type: String, default: null },
  goodbye: { type: Boolean, default: false },
  goodbyeMsg: { type: String, default: null },
  goodbyeImage: { type: String, default: null },
  onlyadmin: { type: Boolean, default: false },
  nsfw: { type: Boolean, default: false },
  warnLimit: { type: Number, default: 3 },
  disabledCmds: { type: [String], default: [] },
  disabledCategories: { type: [String], default: [] },
  silencedUsers: { type: [String], default: [] },
  anticallgp: { type: Boolean, default: false },
  primaryBot: { type: String, default: null }
}, { timestamps: true });

export const Group = mongoose.model('Group', GroupSchema);
