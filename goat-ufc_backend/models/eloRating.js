const mongoose = require('mongoose');

const eloRatingSchema = new mongoose.Schema({
  fighter_name: { type: String, required: true, unique: true },
  elo: { type: Number, default: 1000 },
  lastUpdated: { type: Date, default: Date.now }
});

module.exports = mongoose.model('EloRating', eloRatingSchema);