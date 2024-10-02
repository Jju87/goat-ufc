// controllers/eloController.js

const Fighter = require('../models/fighter');
const Fight = require('../models/fight');
const EloRating = require('../models/eloRating');
const { updateElo } = require('../models/elo');

exports.calculateAllElos = async (req, res) => {
    try {
        // Delete all ELO ratings
        await EloRating.deleteMany({});
        // Create new ELO ratings for all fighters
        const fighters = await Fighter.find();
        for (let fighter of fighters) {
            await EloRating.create({ fighter_name: fighter.fighter_name, elo: 1000 });
        }

        // Calculate ELO ratings for all fights
        const fights = await Fight.find().sort({ date: 1 });

        for (let fight of fights) {
            const [ratingA, ratingB] = await Promise.all([
                EloRating.findOne({ fighter_name: fight.R_fighter }),
                EloRating.findOne({ fighter_name: fight.B_fighter })
            ]);

            if (!ratingA || !ratingB) {
                console.log(`Skipping fight: ${fight.R_fighter} vs ${fight.B_fighter} - rating not found`);
                continue;
            }

            let scoreA;
            if (fight.Winner === fight.R_fighter) scoreA = 1;
            else if (fight.Winner === fight.B_fighter) scoreA = 0;
            else scoreA = 0.5;

            const { newRatingA, newRatingB } = updateElo(ratingA.elo, ratingB.elo, scoreA);

            ratingA.elo = newRatingA;
            ratingB.elo = newRatingB;
            ratingA.lastUpdated = fight.date;
            ratingB.lastUpdated = fight.date;
            // promose.all is used to update both ratings at the same time
            await Promise.all([ratingA.save(), ratingB.save()]);
        }

        res.status(200).json({ message: "All ELOs calculated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Get ELO ranking
exports.getEloRanking = async (req, res) => {
    try {
        // return all fighters sorted by ELO rating using the find() method combined with the sort() method
        const rankings = await EloRating.find().sort({ elo: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};