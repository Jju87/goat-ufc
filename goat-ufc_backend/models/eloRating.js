// models/eloRating.js

const mongoose = require('mongoose');

const eloRatingSchema = new mongoose.Schema({
  fighter_name: { type: String, required: true, unique: true },
  basic_elo: { type: Number, default: 1000 },
  experience_elo: { type: Number, default: 1000 },
  titleFight_elo: { type: Number, default: 1000 },
  winType_elo: { type: Number, default: 1000 },
  striking_elo: { type: Number, default: 1000 },
  ground_elo:{ type: Number, default: 1000 },
  activity_elo: { type: Number, default: 1000 },
  winStreak_elo: { type: Number, default: 1000 },
  category_elo: { type: Number, default: 1000 },
  combined_elo: { type: Number, default: 1000 },
  combinedEloEvolution: [{ 
    elo: Number, 
    date: Date 
  }],
  peak_elo: { type: Number, default: 1000 }, 
  peak_elo_date: Date, 
  peak_elo_winStreak: Number,  
  highestWinStreak: { type: Number, default: 0 },
  currentWinStreak: { type: Number, default: 0 },
  fightCount: { type: Number, default: 0 },
  titleFightCount: { type: Number, default: 0 },
  doubleChampAchievements: [{
    date: Date,
    weightClasses: [String]
  }],
  titleWeightClassesWon: [String],
  lastUpdated: { type: Date, default: Date.now },

});

module.exports = mongoose.model('EloRating', eloRatingSchema);