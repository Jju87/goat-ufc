

const Fighter = require('../models/fighter');
const Fight = require('../models/fight');
const EloRating = require('../models/eloRating');
const { calculateBasicElo, calculateExperienceElo, calculateTitleFightElo, calculateWinTypeElo, calculateStrikingElo, calculateGroundElo, calculateActivityElo, calculateWinStreakElo, calculateCategoryElo, calculateCombinedElo, calculatePeakElo, updateCombinedEloEvolution, cleanCombinedEloEvolution} = require('../utils/eloCalculations');
const { getUFCStats } = require('../models/UFCStats');
const fs = require('fs');
const path = require('path');
const util = require('util');

function logToFile(message, logType) {
    const logFileName = `${logType}_elo_calculation.log`;
    const logFilePath = path.join(__dirname, logFileName);
    
    fs.appendFileSync(logFilePath, message + '\n', 'utf8');
}

exports.calculateAllElos = async (req, res) => {
    try {
        // Get average fights per fighter
        const { totalFights, uniqueFightersCount, averageFights } = await getUFCStats();
        // Delete all ELO ratings
        await EloRating.deleteMany({});
            if (averageFights === 0) {
                averageFights = 1; // Valeur par défaut pour éviter la division par zéro
            }
        // Create new ELO ratings for all fighters
        const fighters = await Fighter.find();
        for (let fighter of fighters) {
            await EloRating.create({ 
                fighter_name: fighter.fighter_name, 
                basic_elo: 1000,
                experience_elo: 1000,
                fightCount: 0,
                titleFightCount: 0,
                currentWinStreak: 0,
            });
        }

        // Calculate ELO ratings for all fights
        const fights = await Fight.find().sort({ date: 1 });
        const fightDates = fights.map(fight => new Date(fight.date));


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
            const { newRatingA: newBasicA, newRatingB: newBasicB } = calculateBasicElo(
                ratingA.basic_elo, 
                ratingB.basic_elo, 
                scoreA
            );
            // logToFile("Inputs for calculateExperienceElo:", {
            //     ratingA: ratingA.experience_elo,
            //     ratingB: ratingB.experience_elo,
            //     scoreA,
            //     fightCountA: ratingA.fightCount,
            //     fightCountB: ratingB.fightCount,
            //     averageFights
            // });

            // Calculate experience-adjusted ELO
            const { newRatingA: newExperienceA, newRatingB: newExperienceB, kFactorA, kFactorB } = calculateExperienceElo(
                ratingA.experience_elo, 
                ratingB.experience_elo, 
                scoreA, 
                ratingA.fightCount, 
                ratingB.fightCount, 
            );
            
            // Calculate title fight ELO
            const { newRatingA: newTitleA, newRatingB: newTitleB, isTitleFight } = calculateTitleFightElo(
                ratingA.titleFight_elo,
                ratingB.titleFight_elo,
                scoreA,
                fight.Fight_type,
            );

            // Calculate win type ELO
            const { newRatingA: newWinTypeA, newRatingB: newWinTypeB, bonusFactor, effectiveK } = calculateWinTypeElo(
                ratingA.winType_elo,
                ratingB.winType_elo,
                scoreA,
                fight.win_by,
                fight.last_round,
                fight.last_round_time,
                isTitleFight
            );
            // Calculate striking ELO
            const {newRatingA: newStrikingA, newRatingB: newStrikingB } = calculateStrikingElo(
                ratingA.striking_elo, 
                ratingB.striking_elo, 
                scoreA, 
                fight.win_by,
                fight.R_KD,
                fight.B_KD,
                fight.R_SIG_STR,
                fight.B_SIG_STR,
                fight.R_TOTAL_STR,
                fight.B_TOTAL_STR

            );

            // Calculate ground ELO
            const {newRatingA: newGroundA, newRatingB: newGroundB } = calculateGroundElo(
                ratingA.ground_elo,
                ratingB.ground_elo,
                scoreA,
                fight.win_by,
                fight.R_TD,
                fight.B_TD,
                fight.R_CTRL,
                fight.B_CTRL,
                fight.R_GROUND,
                fight.B_GROUND
            );

            // Calculate activity ELO
            const { newRatingA: newActivityA, newRatingB: newActivityB } = calculateActivityElo(
                ratingA.activity_elo,
                ratingB.activity_elo,
                scoreA,
                fight,
                fights
            );
            
            // Calculate win streak ELO
            const { newRatingA: newWinStreakA, newRatingB: newWinStreakB, 
                winStreakBonusA, winStreakBonusB, 
                newCurrentWinStreakA, newCurrentWinStreakB } = calculateWinStreakElo(
            ratingA.winStreak_elo,
            ratingB.winStreak_elo,
            scoreA,
            fight,
            fights
            );

            // Calculate category ELO
            const { newRatingA: newCategoryEloA, newRatingB: newCategoryEloB, isDoubleChampA, isDoubleChampB } = calculateCategoryElo(
                ratingA.category_elo,
                ratingB.category_elo,
                scoreA,
                fight,
                ratingA,
                ratingB
            );

            //Calculate combined ELO
            const { newRatingA: newCombinedA, newRatingB: newCombinedB } = calculateCombinedElo(
                ratingA.combined_elo,
                ratingB.combined_elo,
                scoreA,
                ratingA,
                ratingB,
            );

            const newCombinedEloEntryA = {
                elo: newCombinedA,
                date: new Date(fight.date)
            };
            updateCombinedEloEvolution(ratingA, newCombinedEloEntryA);
            const newCombinedEloEntryB = {
                elo: newCombinedB,
                date: new Date(fight.date)
            };
            updateCombinedEloEvolution(ratingB, newCombinedEloEntryB);


            // Update ratings
            ratingA.basic_elo = newBasicA;
            ratingB.basic_elo = newBasicB;
            ratingA.experience_elo = newExperienceA;
            ratingB.experience_elo = newExperienceB;
            ratingA.fightCount++;
            ratingB.fightCount++;
            if (isTitleFight){
                ratingA.titleFightCount++;
                ratingB.titleFightCount++;
            }
            ratingA.titleFight_elo = newTitleA;
            ratingB.titleFight_elo = newTitleB;
            ratingA.category_elo = newCategoryEloA;
            ratingB.category_elo = newCategoryEloB;
            if (isDoubleChampA) {
                ratingA.doubleChampAchievements = ratingA.doubleChampAchievements || [];
                ratingA.doubleChampAchievements.push({ 
                    date: fight.date, 
                    weightClasses: [...ratingA.titleWeightClassesWon] 
                });
            }
            if (isDoubleChampB) {
                ratingB.doubleChampAchievements = ratingB.doubleChampAchievements || [];
                ratingB.doubleChampAchievements.push({ 
                    date: fight.date, 
                    weightClasses: [...ratingB.titleWeightClassesWon] 
                });
            }
            ratingA.winType_elo = newWinTypeA;
            ratingB.winType_elo = newWinTypeB;
            ratingA.striking_elo = newStrikingA;
            ratingB.striking_elo = newStrikingB;
            ratingA.ground_elo = newGroundA;
            ratingB.ground_elo = newGroundB;
            ratingA.activity_elo = newActivityA;
            ratingB.activity_elo = newActivityB;
            ratingA.winStreak_elo = newWinStreakA;
            ratingB.winStreak_elo = newWinStreakB;
            ratingA.currentWinStreak = newCurrentWinStreakA;
            ratingB.currentWinStreak = newCurrentWinStreakB;
            ratingA.combined_elo = newCombinedA;
            ratingB.combined_elo = newCombinedB;
            ratingA.lastUpdated = fight.date;
            ratingB.lastUpdated = fight.date;

            // Update highest win streaks
            ratingA.highestWinStreak = Math.max(ratingA.highestWinStreak || 0, ratingA.currentWinStreak);
            ratingB.highestWinStreak = Math.max(ratingB.highestWinStreak || 0, ratingB.currentWinStreak);

            const newPeakA = calculatePeakElo(ratingA.peak_elo, newCombinedA, fight.date, ratingA.currentWinStreak);
            const newPeakB = calculatePeakElo(ratingB.peak_elo, newCombinedB, fight.date, ratingB.currentWinStreak);

            // Mise à jour du peak ELO si nécessaire
            if (newPeakA) {
                ratingA.peak_elo = newPeakA.peak_elo;
                ratingA.peak_elo_date = newPeakA.peak_elo_date;
                ratingA.peak_elo_winStreak = newPeakA.peak_elo_winStreak;
            }
            if (newPeakB) {
                ratingB.peak_elo = newPeakB.peak_elo;
                ratingB.peak_elo_date = newPeakB.peak_elo_date;
                ratingB.peak_elo_winStreak = newPeakB.peak_elo_winStreak;
            
            }

            // Nettoyage et tri de combinedEloEvolution
            ratingA.combinedEloEvolution = cleanCombinedEloEvolution(ratingA.combinedEloEvolution);
            ratingB.combinedEloEvolution = cleanCombinedEloEvolution(ratingB.combinedEloEvolution);

            // Promise.all is used to update both ratings at the same time
            await Promise.all([ratingA.save(), ratingB.save()]);

        }

        const allFighters = await EloRating.find();
        await Promise.all(allFighters.map(async (fighter) => {
            fighter.combinedEloEvolution = cleanCombinedEloEvolution(fighter.combinedEloEvolution, fightDates);
        await fighter.save();
        }));

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

        // Get all fights, sorted by date in ascending order
        const allFights = await Fight.find().sort({ date: 1 });

        logToFile("Simulation de l'évolution des ELO:");

        // Create a map to store the current ELO for each fighter
        const currentElo = new Map();

        for (const fight of allFights) {
            // Get or initialize the current ELO for both fighters
            const ratingA = currentElo.get(fight.R_fighter) || 1000;
            const ratingB = currentElo.get(fight.B_fighter) || 1000;

            let scoreA;
            if (fight.Winner === fight.R_fighter) scoreA = 1;
            else if (fight.Winner === fight.B_fighter) scoreA = 0;
            else scoreA = 0.5;

            const { newRatingA, newRatingB, changeA, changeB } = calculateBasicElo(
                ratingA,
                ratingB,
                scoreA
            );

            // Update the current ELO for both fighters
            currentElo.set(fight.R_fighter, newRatingA);
            currentElo.set(fight.B_fighter, newRatingB);

            logToFile(`
                Date: ${new Date(fight.date).toLocaleDateString()}
                Fight: ${fight.R_fighter} vs ${fight.B_fighter}
                Result: ${fight.Winner === fight.R_fighter ? fight.R_fighter + " wins" : 
                            fight.Winner === fight.B_fighter ? fight.B_fighter + " wins" : "Draw or No Contest"}
                ${fight.R_fighter}: ${ratingA} -> ${newRatingA} (${changeA > 0 ? "+" : ""}${changeA})
                ${fight.B_fighter}: ${ratingB} -> ${newRatingB} (${changeB > 0 ? "+" : ""}${changeB})
            `, 'basic');
        }

        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getExperienceEloRanking = async (req, res) => {
    try {
        const rankings = await EloRating.find().sort({ experience_elo: -1 });

        // Récupérer les 20 derniers combats
        const recentFights = await Fight.find().sort({ date: -1 }).limit(20);

        console.log("K factors pour les 20 derniers combats:");

        for (const fight of recentFights) {
            const [ratingA, ratingB] = await Promise.all([
                EloRating.findOne({ fighter_name: fight.R_fighter }),
                EloRating.findOne({ fighter_name: fight.B_fighter })
            ]);

            if (!ratingA || !ratingB) {
                console.log(`Données manquantes pour le combat: ${fight.R_fighter} vs ${fight.B_fighter}`);
                continue;
            }

            const scoreA = fight.Winner === fight.R_fighter ? 1 : fight.Winner === fight.B_fighter ? 0 : 0.5;

            const { kFactorA, kFactorB, } = calculateExperienceElo(
                ratingA.experience_elo,
                ratingB.experience_elo,
                scoreA,
                ratingA.fightCount,
                ratingB.fightCount,
                6.23 // Utilisez ici la valeur moyenne de combats que vous avez calculée précédemment
            );

            console.log(`
                Date: ${new Date(fight.date).toLocaleDateString()}
                Combat: ${fight.R_fighter} vs ${fight.B_fighter}
                K Factor ${fight.R_fighter}: ${kFactorA.toFixed(2)}
                K Factor ${fight.B_fighter}: ${kFactorB.toFixed(2)}
                Fight Count ${fight.R_fighter}: ${ratingA.fightCount}
                Fight Count ${fight.B_fighter}: ${ratingB.fightCount}
            `);
        }

        res.status(200).json(rankings);
    } catch (error) {
        console.error("Erreur lors de la récupération du classement Experience ELO:", error);
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

exports.getWinTypeEloRanking = async (req, res) => {
    try {
        const rankings = await EloRating.find().sort({ winType_elo: -1 });

        // Récupérer les combats de Conor McGregor
        const mcGregorFights = await Fight.find({
            $or: [{ R_fighter: "Conor McGregor" }, { B_fighter: "Conor McGregor" }]
        }).sort({ date: 1 });

        console.log("Bonus pour les combats de Conor McGregor:");
        mcGregorFights.forEach(fight => {
            const { win_by, last_round, last_round_time, date, Fight_type } = fight;
            const { isTitleFight } = calculateTitleFightElo(1000, 1000, 1, Fight_type);
            const { bonusFactor, effectiveK } = calculateWinTypeElo(1000, 1000, 1, win_by, last_round, last_round_time, isTitleFight);
            const opponent = fight.R_fighter === "Conor McGregor" ? fight.B_fighter : fight.R_fighter;
            const result = fight.Winner === "Conor McGregor" ? "Victoire" : "Défaite";
            
            console.log(`
                Date: ${new Date(fight.date).toLocaleDateString()}
                Adversaire: ${opponent}
                Résultat: ${result}
                Méthode: ${fight.win_by}
                Round: ${fight.last_round}
                Temps: ${fight.last_round_time}
                Combat de titre: ${isTitleFight ? "Oui" : "Non"}
                Bonus Factor: ${bonusFactor.toFixed(2)}
                K factor : ${effectiveK.toFixed(2)}
            `);
        });
        res.status(200).json(rankings);
    } catch (error) {
        console.error("Erreur lors de la récupération du classement WinType ELO:", error);
        res.status(500).json({ error: error.message });
    }
};

exports.getStrikingEloRanking = async (req, res) => {
    try {
        const rankings = await EloRating.find().sort({ striking_elo: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getGroundEloRanking = async (req, res) => {
    try {
        const rankings = await EloRating.find().sort({ ground_elo: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getActivityEloRanking = async (req, res) => {
    try {
        const rankings = await EloRating.find().sort({ activity_elo: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getWinStreakEloRanking = async (req, res) => {
    try {
        const rankings = await EloRating.find().sort({ winStreak_elo: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCategoryEloRanking = async (req, res) => {
    try {
        const rankings = await EloRating.find().sort({ category_elo: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

exports.getCombinedEloRanking = async (req, res) => {
    try {
        const rankings = await EloRating.find().sort({ combined_elo: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        logToFile(`Error: ${error.message}`, 'combined');
        res.status(500).json({ error: error.message });
    }
};


exports.getPeakEloRanking = async (req, res) => {
    try {
        const rankings = await EloRating.find().sort({ peak_elo: -1 });
        res.status(200).json(rankings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}