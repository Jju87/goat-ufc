const mongoose = require('mongoose');

const fightSchema = mongoose.Schema({
    name: { type: String, required: true },
    date: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String, required: true },
    creator: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
    });