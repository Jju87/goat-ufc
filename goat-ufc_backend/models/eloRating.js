// models/eloRating.js

const mongoose = require('mongoose');

const eloRatingSchema = new mongoose.Schema({
  fighter_name: { type: String, required: true, unique: true },
  basic_elo: { type: Number, default: 1000 },
  experience_elo: { type: Number, default: 1000 },
  titleFight_elo: { type: Number, default: 1000 },
  winType_elo: { type: Number, default: 1000 },
  striking_elo: { type: Number, default: 1000 },
  fightCount: { type: Number, default: 0 },
  titleFightCount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now },
});

module.exports = mongoose.model('EloRating', eloRatingSchema);