

const Fighter = require('../models/fighter');
const Fight = require('../models/fight');
const EloRating = require('../models/eloRating');
const { calculateBasicElo, calculateExperienceElo, calculateTitleFightElo} = require('../utils/eloCalculations');
const { getUFCStats } = require('../models/UFCStats');

exports.calculateAllElos = async (req, res) => {
    try {
        // Get average fights per fighter
        const { totalFights, uniqueFightersCount, averageFights } = await getUFCStats();
        // Delete all ELO ratings
        await EloRating.deleteMany({});
        
        // Create new ELO ratings for all fighters
        const fighters = await Fighter.find();
        for (let fighter of fighters) {
            await EloRating.create({ 
                fighter_name: fighter.fighter_name, 
                basic_elo: 1000,
                experience_elo: 1000,
                fightCount: 0
            });
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

            // Calculate basic ELO
            const { newRatingA: newBasicA, newRatingB: newBasicB } = calculateBasicElo(ratingA.basic_elo, ratingB.basic_elo, scoreA);

            // Calculate experience-adjusted ELO
            const { newRatingA: newExperienceA, newRatingB: newExperienceB } = calculateExperienceElo(
                ratingA.experience_elo, 
                ratingB.experience_elo, 
                scoreA, 
                ratingA.fightCount, 
                ratingB.fightCount, 
                averageFights
            );
            // Calculate title fight ELO
            const { newRatingA: newTitleA, newRatingB: newTitleB, isTitleFight } = calculateTitleFightElo(
                ratingA.titleFight_elo,
                ratingB.titleFight_elo,
                scoreA,
                fight.Fight_type
            );

            // Update ratings
            ratingA.basic_elo = newBasicA;
            ratingB.basic_elo = newBasicB;
            ratingA.experience_elo = newExperienceA;
            ratingB.experience_elo = newExperienceB;
            ratingA.fightCount++;
            ratingB.fightCount++;
            ratingA.titleFight_elo = newTitleA;
            ratingB.titleFight_elo = newTitleB;
            ratingA.lastUpdated = fight.date;
            ratingB.lastUpdated = fight.date;

            // Promise.all is used to update both ratings at the same time
            await Promise.all([ratingA.save(), ratingB.save()]);
        }

        res.status(200).json({ message: "All ELOs calculated successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// Get basic ELO ranking
exports.getBasicEloRanking = async (req, res) => {
    try {
        const rankings = await EloRating.find().sort({ basic_elo: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get experience-adjusted ELO ranking
exports.getExperienceEloRanking = async (req, res) => {
    try {
        const { totalFights, uniqueFightersCount, averageFights } = await getUFCStats();
        console.log(`Nombre total de combats : ${totalFights}`);
        console.log(`Nombre total de combattants uniques : ${uniqueFightersCount}`);
        console.log(`Nombre moyen de combats par combattant : ${averageFights.toFixed(2)}`);
        const rankings = await EloRating.find().sort({ experience_elo: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getTitleFightEloRanking = async (req, res) => {
    try {
        const rankings = await EloRating.find().sort({ titleFight_elo: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};