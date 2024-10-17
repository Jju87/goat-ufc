function calculateBasicElo(ratingA, ratingB, scoreA) {
    const K = 32;
    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const changeA = K * (scoreA - expectedScoreA);
    const newRatingA = ratingA + changeA;
    const newRatingB = ratingB - changeA;

    return { 
        newRatingA: newRatingA, 
        newRatingB: newRatingB,
        changeA: Math.round(changeA),
        changeB: Math.round(-changeA)
    };
}

function calculateExperienceElo(ratingA, ratingB, scoreA, fightCountA, fightCountB) {
    const BASE_K = 32;
    const MAX_ADJUSTMENT = 1;

    // Vérifications des entrées
    if ([ratingA, ratingB, scoreA, fightCountA, fightCountB].some(isNaN)) {
        console.error("Invalid input in calculateExperienceElo:", 
            { ratingA, ratingB, scoreA, fightCountA, fightCountB });
        return { 
            newRatingA: ratingA || 1000, 
            newRatingB: ratingB || 1000, 
            kFactorA: BASE_K, 
            kFactorB: BASE_K 
        };
    }

    // Calculer la différence d'expérience relative
    const totalFights = Math.max(fightCountA + fightCountB, 1); // Évite la division par zéro
    const expDiff = (fightCountB - fightCountA) / totalFights;

    // Ajuster les facteurs K
    const kFactorA = BASE_K * (1 + MAX_ADJUSTMENT * expDiff);
    const kFactorB = BASE_K * (1 - MAX_ADJUSTMENT * expDiff);

    // Calcul ELO standard
    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const changeA = kFactorA * (scoreA - expectedScoreA);

    const newRatingA = Math.max((ratingA + changeA), 0);
    const newRatingB = Math.max((ratingB - changeA), 0);

    // Vérification finale pour NaN
    if (isNaN(newRatingA) || isNaN(newRatingB)) {
        console.error("NaN result in calculateExperienceElo:", 
            { newRatingA, newRatingB, kFactorA, kFactorB });
        return { 
            newRatingA: ratingA || 1000, 
            newRatingB: ratingB || 1000, 
            kFactorA: BASE_K, 
            kFactorB: BASE_K 
        };
    }

    return { 
        newRatingA: Math.max(newRatingA, 0),
        newRatingB: Math.max(newRatingB, 0),
        kFactorA, 
        kFactorB    
    };
}

function calculateTitleFightElo(ratingA, ratingB, scoreA, fightType) {
    const BASE_K = 32;
    const titleFightBonus = 3; // 300% bonus pour les combats de titre

    // Vérifier si c'est un combat pour le titre
    const isTitleFight = fightType.toLowerCase().includes('title');

    // Ajuster le facteur K si c'est un combat pour le titre
    const K = isTitleFight ? BASE_K * titleFightBonus : BASE_K;

    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + K * (scoreA - expectedScoreA);
    const newRatingB = ratingB + K * ((1 - scoreA) - (1 - expectedScoreA));

    return { 
        newRatingA: newRatingA, 
        newRatingB: newRatingB,
        isTitleFight: isTitleFight
    };
}

function calculateWinTypeElo(ratingA, ratingB, scoreA, win_By, last_Round, last_Round_Time, isTitleFight) {
    const BASE_K = 32;
    let bonusFactor = 1;

    // Bonus based on win type
    if (win_By === "Submission" || win_By === "KO/TKO") {
        bonusFactor += 1; // 50% bonus
    } else if (win_By === "Decision - Unanimous") {
        bonusFactor += 0.3; // 20% bonus
    }

    // Bonus based on last round
    if (last_Round === 1 ) {
        bonusFactor += 0.5; // 40% bonus added
    } else if (last_Round === 2 ) {
        bonusFactor += 0.2; // 20% bonus added
    }

    // Conversion of last round time to seconds
    const timeParts = last_Round_Time.split(':');
    const timeInSeconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);

    // Bonus based on last round time (only for first round)
    if (last_Round === 1) {
        if (timeInSeconds <= 30) {
            bonusFactor += 1; // 100% bonus added
        } else if (timeInSeconds <= 60) {
            bonusFactor += 0.5; // 50% bonus added
        } else if (timeInSeconds <= 120) {
            bonusFactor += 0.2; // 20% bonus added
        } else if (timeInSeconds <= 180) {
            bonusFactor += 0.1; // 10% bonus added
        } 
    }

    // Apply title fight bonus if it's a title fight
    if (isTitleFight) {
        bonusFactor *= 1.5; // 50% bonus
    }

    const K = BASE_K * bonusFactor;

    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + K * (scoreA - expectedScoreA);
    const newRatingB = ratingB + K * ((1 - scoreA) - (1 - expectedScoreA));

    return { 
        newRatingA: newRatingA, 
        newRatingB: newRatingB,
        bonusFactor,
        effectiveK: K,
    };
}

function calculateStrikingElo(ratingA, ratingB, scoreA, win_By, R_KD, B_KD, R_SIG_STR, B_SIG_STR, R_TOTAL_STR, B_TOTAL_STR) {
    const BASE_K = 32;
    let bonusFactor = 1;

    function parseSigStrikes(sigStrString) {
        if (!sigStrString || typeof sigStrString !== 'string') return [0, 0];
        const parts = sigStrString.split(' of ');
        if (parts.length !== 2) return [0, 0];
        return parts.map(part => parseInt(part, 10) || 0);
    }

    // Bonus pour KO/TKO
    if (win_By === "KO/TKO") {
        bonusFactor *= 1.5; // 50% bonus pour KO/TKO
    }

    // Bonus pour les knockdowns
    const totalKD = (R_KD || 0) + (B_KD || 0);
    bonusFactor += totalKD * 0.75; // 75% bonus par knockdown

    // Traitement des coups significatifs et totaux
    const [R_SIG_STR_landed, ] = parseSigStrikes(R_SIG_STR);
    const [B_SIG_STR_landed, ] = parseSigStrikes(B_SIG_STR);
    const [R_TOTAL_STR_landed, ] = parseSigStrikes(R_TOTAL_STR);
    const [B_TOTAL_STR_landed, ] = parseSigStrikes(B_TOTAL_STR);

    // Fonction de bonus logarithmique plafonnée à 250%
    function calculateLogBonus(strikerA, strikerB) {
        if (strikerB === 0) return strikerA > 0 ? 2.5 : 0; // 250% de bonus pour une domination totale
        const ratio = strikerA / strikerB;
        if (ratio <= 1) return 0;
        return Math.min(Math.log10(ratio) * 1.2, 2.5); // Plafonne à 250% de bonus
    }

    const sigStrikeBonus = calculateLogBonus(R_SIG_STR_landed, B_SIG_STR_landed);
    const totalStrikeBonus = calculateLogBonus(R_TOTAL_STR_landed, B_TOTAL_STR_landed);

    // Application des bonus
    bonusFactor += sigStrikeBonus + totalStrikeBonus;

    // Application du facteur de bonus au facteur K, plafonné à 500%
    const K = Math.min(BASE_K * bonusFactor, BASE_K * 6); // 6 = 500% bonus + 100% base

    // Calcul ELO standard
    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + K * (scoreA - expectedScoreA);
    const newRatingB = ratingB + K * ((1 - scoreA) - (1 - expectedScoreA));

    return { 
        newRatingA: newRatingA, 
        newRatingB: newRatingB,
        bonusFactor,
        effectiveK: K,
        sigStrikeBonus,
        totalStrikeBonus
    };
}

function calculateGroundElo(ratingA, ratingB, scoreA, win_By, R_TD, B_TD, R_CTRL, B_CTRL, R_GROUND, B_GROUND) {
    const BASE_K = 32;
    let bonusFactor = 1;

    // Vérification des valeurs d'entrée
    ratingA = isNaN(ratingA) ? 1000 : ratingA;
    ratingB = isNaN(ratingB) ? 1000 : ratingB;
    scoreA = isNaN(scoreA) ? 0.5 : scoreA;

    function parseTakedowns(tdString) {
        if (!tdString || typeof tdString !== 'string') return 0;
        const parts = tdString.split(' of ');
        return parseInt(parts[0], 10) || 0;
    }
    
    let winnerTakedowns = 0;
    if (scoreA === 1) {
    // Si A est le vainqueur
        winnerTakedowns = parseTakedowns(R_TD);
    } else if (scoreA === 0) {
    // Si B est le vainqueur
        winnerTakedowns = parseTakedowns(B_TD);
    }
    // En cas de match nul (scoreA === 0.5), winnerTakedowns reste à 0

    function parseControlTime(timeString) {
        if (!timeString || typeof timeString !== 'string') return 0;
        const [minutes, seconds] = timeString.split(':').map(Number);
        return (isNaN(minutes) ? 0 : minutes) * 60 + (isNaN(seconds) ? 0 : seconds);
    }

    function calculateLogBonus(strikerA, strikerB) {
        strikerA = isNaN(strikerA) ? 0 : strikerA;
        strikerB = isNaN(strikerB) ? 0 : strikerB;
        if (strikerB === 0) return strikerA > 0 ? 0.5 : 0; // Réduit de 2.5 à 0.5
        const ratio = strikerA / strikerB;
        if (ratio <= 1) return 0;
        return Math.min(Math.log10(ratio) * 0.3, 0.5); // Réduit le multiplicateur de 1.2 à 0.3 et le max de 2.5 à 0.5
    }

    // Bonus pour soumission
    if (win_By && win_By.toLowerCase() === "submission") {
        bonusFactor *= 1.5;
    }

    // Calcul du bonus de takedown (max 150%) compté seulement pour le vainqueur
    const takedownBonus = Math.min(winnerTakedowns * 0.2, 1.5); // 20% par takedown, max 150%
    bonusFactor += takedownBonus;

    // Bonus pour le temps de contrôle
    const R_CTRL_seconds = parseControlTime(R_CTRL);
    const B_CTRL_seconds = parseControlTime(B_CTRL);
    const controlTimeDiff = Math.abs(R_CTRL_seconds - B_CTRL_seconds);
    const controlTimeBonus = Math.min(controlTimeDiff / 600, 1);
    bonusFactor += controlTimeBonus;

    // Bonus pour les frappes au sol
    const [R_GROUND_landed, ] = (R_GROUND || "0 of 0").split(' of ').map(Number);
    const [B_GROUND_landed, ] = (B_GROUND || "0 of 0").split(' of ').map(Number);
    const groundStrikesBonus = calculateLogBonus(R_GROUND_landed, B_GROUND_landed);
    bonusFactor += groundStrikesBonus;

    // Application du facteur de bonus au facteur K
    const K = BASE_K * bonusFactor;

    // Calcul ELO standard
    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + K * (scoreA - expectedScoreA);
    const newRatingB = ratingB + K * ((1 - scoreA) - (1 - expectedScoreA));

    return { 
        newRatingA: newRatingA || 1000, 
        newRatingB: newRatingB || 1000,
        bonusFactor,
        effectiveK: K,
        takedownBonus,
        controlTimeBonus,
        groundStrikesBonus
    };
}

function calculateActivityElo(ratingA, ratingB, scoreA, currentFight, allFights) {
    const BASE_K = 32;
    
    function getMonthsBetween(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        const yearDiff = d2.getUTCFullYear() - d1.getUTCFullYear();
        const monthDiff = d2.getUTCMonth() - d1.getUTCMonth();
        const dayDiff = d2.getUTCDate() - d1.getUTCDate();

        let months = yearDiff * 12 + monthDiff;
        if (dayDiff < 0) {
            months -= 1;
        }
        return months;
    }

    function calculateActivityBonus(fighterName) {
        const fighterFights = allFights.filter(fight => 
            (fight.R_fighter === fighterName || fight.B_fighter === fighterName) &&
            new Date(fight.date) <= new Date(currentFight.date)
        ).sort((a, b) => new Date(a.date) - new Date(b.date));

        if (fighterFights.length < 2) return 1;

        let totalBonus = 0;

        for (let i = 1; i < fighterFights.length; i++) {
            const monthsBetween = getMonthsBetween(fighterFights[i-1].date, fighterFights[i].date);

            let bonus;
            if (monthsBetween < 1) bonus = 3;
            else if (monthsBetween < 2) bonus = 2.5;
            else if (monthsBetween < 3) bonus = 2;
            else if (monthsBetween < 6) bonus = 1.5;
            else if (monthsBetween < 12) bonus = 1.1;
            else bonus = 1;

            totalBonus += bonus;
        }

        const averageBonus = totalBonus / (fighterFights.length - 1);
        return Math.min(averageBonus, 2);
    }

    // Calculer le bonus seulement pour le gagnant
    const activityBonusA = scoreA === 1 ? calculateActivityBonus(currentFight.R_fighter) : 1;
    const activityBonusB = scoreA === 0 ? calculateActivityBonus(currentFight.B_fighter) : 1;

    // Appliquer le bonus au facteur K seulement pour le gagnant
    const KA = BASE_K * (scoreA === 1 ? activityBonusA : 1);
    const KB = BASE_K * (scoreA === 0 ? activityBonusB : 1);

    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + KA * (scoreA - expectedScoreA);
    const newRatingB = ratingB + KB * ((1 - scoreA) - (1 - expectedScoreA));

    return { 
        newRatingA: newRatingA, 
        newRatingB: newRatingB,
        activityBonusA: scoreA === 1 ? activityBonusA : 1,
        activityBonusB: scoreA === 0 ? activityBonusB : 1
    };
}

function calculateWinStreakElo(ratingA, ratingB, scoreA, currentFight, allFights) {
    const BASE_K = 32;

    function calculateWinStreakBonus(fighterName) {
        const fighterFights = allFights.filter(fight => 
            (fight.R_fighter === fighterName || fight.B_fighter === fighterName) &&
            new Date(fight.date) < new Date(currentFight.date)
        ).sort((a, b) => new Date(a.date) - new Date(b.date));

        let winStreak = 0;
        for (let i = fighterFights.length - 1; i >= 0; i--) {
            const fight = fighterFights[i];
            if (fight.Winner === fighterName) {
                winStreak++;
            } else {
                break; // La série de victoires s'arrête à la première défaite
            }
        }

        // Calculer le bonus basé sur la série de victoires
        let winStreakBonus;
        if (winStreak < 5) {
            winStreakBonus = winStreak * 0.2;
        } else if (winStreak < 10) {
            winStreakBonus = 1 + (winStreak - 5) * 0.3;
        } else if (winStreak < 15) {
            winStreakBonus = 2.5 + (winStreak - 10) * 0.4;
        } else {
            winStreakBonus = 4.5 + (winStreak - 15) * 0.5;
        }

        return { bonus: 1 + winStreakBonus, currentWinStreak: winStreak };
    }

    const { bonus: bonusA, currentWinStreak: currentWinStreakA } = calculateWinStreakBonus(currentFight.R_fighter);
    const { bonus: bonusB, currentWinStreak: currentWinStreakB } = calculateWinStreakBonus(currentFight.B_fighter);

    // Appliquer le bonus au facteur K
    const KA = BASE_K * bonusA;
    const KB = BASE_K * bonusB;

    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + KA * (scoreA - expectedScoreA);
    const newRatingB = ratingB + KB * ((1 - scoreA) - (1 - expectedScoreA));

    // Mettre à jour les séries de victoires actuelles
    const newCurrentWinStreakA = scoreA === 1 ? currentWinStreakA + 1 : 0;
    const newCurrentWinStreakB = scoreA === 0 ? currentWinStreakB + 1 : 0;

    return { 
        newRatingA: newRatingA, 
        newRatingB: newRatingB,
        winStreakBonusA: bonusA,
        winStreakBonusB: bonusB,
        newCurrentWinStreakA,
        newCurrentWinStreakB
    };
}


function calculateCombinedElo(ratingA, ratingB, scoreA, fighterA, fighterB) {
    const BASE_K = 32;
    const weights = {
        basic: 0.8,
        experience: 0.8,
        titleFight: 1.4,
        activity: 1.2,
        winType: 1.4,
        striking: 1.2,
        ground: 1.2,
        winStreak: 1.4,
        category: 1.4
    };

    function calculateWeightedElo(fighter) {
        let totalWeight = 0;
        let weightedSum = 0;
        for (const [type, weight] of Object.entries(weights)) {
            if (fighter[`${type}_elo`]) {
                weightedSum += fighter[`${type}_elo`] * weight;
                totalWeight += weight;
            }
        }
        return weightedSum / totalWeight;
    }

    const weightedEloA = calculateWeightedElo(fighterA);
    const weightedEloB = calculateWeightedElo(fighterB);

    const expectedScoreA = 1 / (1 + Math.pow(10, (weightedEloB - weightedEloA) / 400));
    const changeA = BASE_K * (scoreA - expectedScoreA);

    const newRatingA = weightedEloA + changeA;
    const newRatingB = weightedEloB - changeA;

    return {
        newRatingA: newRatingA,
        newRatingB: newRatingB,
        changeA: Math.round(changeA),
        changeB: Math.round(-changeA)
    };
}

function calculateCategoryElo(ratingA, ratingB, scoreA, fight, fighterA, fighterB) {
    const BASE_K = 32;
    const DOUBLE_CHAMP_BONUS = 10; // Un bonus multiplicateur très élevé
    const MAX_LOSER_PENALTY = 32; // Perte maximale pour le perdant


    function parseWeightClass(fightType) {
        const weightClasses = [
            "Flyweight", "Bantamweight", "Featherweight", "Lightweight",
            "Welterweight", "Middleweight", "Light Heavyweight", "Heavyweight",
            "Women's Strawweight", "Women's Flyweight", "Women's Bantamweight",
            "Women's Featherweight"
        ];
        
        for (let weightClass of weightClasses) {
            if (fightType.includes(weightClass)) {
                return weightClass;
            }
        }
        return null;
    }

    function isOfficialUFCTitleFight(fightType) {
        return fightType.startsWith("UFC") && fightType.toLowerCase().includes("title bout");
    }

    function isNewTitleWin(fighter, fightType) {
        if (!isOfficialUFCTitleFight(fightType)) return false;

        const newWeightClass = parseWeightClass(fightType);
        return newWeightClass && (!fighter.titleWeightClassesWon || !fighter.titleWeightClassesWon.includes(newWeightClass));
    }

    function updateTitlesWon(fighter, fightType) {
        if (!isOfficialUFCTitleFight(fightType)) return;

        if (!fighter.titleWeightClassesWon) {
            fighter.titleWeightClassesWon = [];
        }
        const newWeightClass = parseWeightClass(fightType);
        if (newWeightClass && !fighter.titleWeightClassesWon.includes(newWeightClass)) {
            fighter.titleWeightClassesWon.push(newWeightClass);
        }
    }

    let bonusA = 1;
    let bonusB = 1;
    let isDoubleChampA = false;
    let isDoubleChampB = false;

    if (scoreA === 1 && isNewTitleWin(fighterA, fight.Fight_type)) {
        if (fighterA.titleWeightClassesWon && fighterA.titleWeightClassesWon.length > 0) {
            bonusA = DOUBLE_CHAMP_BONUS;
            isDoubleChampA = true;
        }
        updateTitlesWon(fighterA, fight.Fight_type);
    } else if (scoreA === 0 && isNewTitleWin(fighterB, fight.Fight_type)) {
        if (fighterB.titleWeightClassesWon && fighterB.titleWeightClassesWon.length > 0) {
            bonusB = DOUBLE_CHAMP_BONUS;
            isDoubleChampB = true;
        }
        updateTitlesWon(fighterB, fight.Fight_type);
    }

    const KA = BASE_K * bonusA;
    const KB = BASE_K * bonusB;

    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    let changeA = KA * (scoreA - expectedScoreA);
    let changeB = KB * ((1 - scoreA) - (1 - expectedScoreA));

    // Limiter la perte pour le perdant
    if (changeA < -MAX_LOSER_PENALTY) changeA = -MAX_LOSER_PENALTY;
    if (changeB < -MAX_LOSER_PENALTY) changeB = -MAX_LOSER_PENALTY;

    const newRatingA = ratingA + changeA;
    const newRatingB = ratingB + changeB;

    return {
        newRatingA: newRatingA,
        newRatingB: newRatingB,
        bonusFactorA: bonusA,
        bonusFactorB: bonusB,
        isDoubleChampA,
        isDoubleChampB,
        changeA: Math.round(changeA),
        changeB: Math.round(changeB)
    };
}

function calculateCombinedElo(ratingA, ratingB, scoreA, fighterA, fighterB) {
    const BASE_K = 32;
    const weights = {
        basic: 0.8,
        experience: 0.8,
        titleFight: 1.4,
        activity: 1.2,
        winType: 1.4,
        striking: 1.2,
        ground: 1.2,
        winStreak: 1.4,
        category: 1.4
    };

    function calculateWeightedElo(fighter) {
        let totalWeight = 0;
        let weightedSum = 0;
        for (const [type, weight] of Object.entries(weights)) {
            if (fighter[`${type}_elo`]) {
                weightedSum += fighter[`${type}_elo`] * weight;
                totalWeight += weight;
            }
        }
        return weightedSum / totalWeight;
    }

    const weightedEloA = calculateWeightedElo(fighterA);
    const weightedEloB = calculateWeightedElo(fighterB);

    const expectedScoreA = 1 / (1 + Math.pow(10, (weightedEloB - weightedEloA) / 400));
    const changeA = BASE_K * (scoreA - expectedScoreA);

    const newRatingA = weightedEloA + changeA;
    const newRatingB = weightedEloB - changeA;

    // Mise à jour de l'évolution du ELO combiné
    fighterA.combinedEloEvolution.push({ elo: newRatingA, date: new Date() });
    fighterB.combinedEloEvolution.push({ elo: newRatingB, date: new Date() });

    return {
        newRatingA: newRatingA,
        newRatingB: newRatingB,
        changeA: Math.round(changeA),
        changeB: Math.round(-changeA)
    };
}

function updateCombinedEloEvolution(rating, newEntry) {
    if (!rating.combinedEloEvolution) {
        rating.combinedEloEvolution = [];
    }

    const existingEntryIndex = rating.combinedEloEvolution.findIndex(
        entry => entry.date.getTime() === newEntry.date.getTime()
    );

    if (existingEntryIndex !== -1) {
        rating.combinedEloEvolution[existingEntryIndex] = newEntry;
    } else {
        rating.combinedEloEvolution.push(newEntry);
    }
}

function cleanCombinedEloEvolution(evolution, fightDates) {
    console.log("Cleaning evolution:", evolution);
    console.log("Using fightDates:", fightDates);

    if (!Array.isArray(fightDates)) {
        console.error("fightDates is not an array:", fightDates);
        return evolution; // Retourne l'évolution originale si fightDates n'est pas un tableau
    }

    if (fightDates.length === 0) {
        console.warn("fightDates is empty");
        return evolution; // Retourne l'évolution originale si fightDates est vide
    }

    const uniqueEntries = new Map();

    evolution.forEach(entry => {
        const date = new Date(entry.date);
        // Ne garder que les entrées correspondant aux dates réelles des combats
        if (fightDates.some(fightDate => fightDate.getTime() === date.getTime())) {
            uniqueEntries.set(date.toISOString(), {
                elo: entry.elo,
                date: date
            });
        }
    });

    return Array.from(uniqueEntries.values())
        .sort((a, b) => a.date - b.date);
}

function calculatePeakElo(currentPeakElo, newCombinedElo, currentDate, currentWinStreak) {
    if (newCombinedElo > currentPeakElo) {
        return {
            peak_elo: newCombinedElo,
            peak_elo_date: currentDate,
            peak_elo_winStreak: currentWinStreak
        };
    }
    return null;
}

module.exports = { 
    calculateBasicElo, 
    calculateExperienceElo, 
    calculateTitleFightElo, 
    calculateWinTypeElo, 
    calculateStrikingElo, 
    calculateGroundElo, 
    calculateActivityElo, 
    calculateWinStreakElo, 
    calculateCombinedElo,
    calculateCategoryElo, 
    calculatePeakElo,
    updateCombinedEloEvolution,
    cleanCombinedEloEvolution
};