const mongoose = require('mongoose');

const fighterSchema = new mongoose.Schema({
    fighter_name: String,   // Fighter name
    Height: String,  // Height
    Weight: String,  // Weight
    Reach: Number,  // Reach
    Stance: String,  // Stance
    DOB: String,  // Date of birth
    SLpM: Number,  // Significant strikes landed per minute
    Str_Acc: String,  // Significant strike accuracy
    SApM: Number,  // Significant strikes absorbed per minute
    Str_Def: String, // Significant strike defense
    TD_Avg: Number, // Average takedowns landed per 15 minutes
    TD_Acc: String,  // Takedown accuracy
    TD_Def: String,  // Takedown defense
    Sub_Avg: Number // Average submission attempts per 15 minutes
});

const Fighter = mongoose.model('Fighter', fighterSchema);

module.exports = Fighter;
