function calculateBasicElo(ratingA, ratingB, scoreA) {
    const K = 32;
    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const changeA = K * (scoreA - expectedScoreA);
    const newRatingA = ratingA + changeA;
    const newRatingB = ratingB - changeA;

    return { 
        newRatingA: Math.round(newRatingA), 
        newRatingB: Math.round(newRatingB),
        changeA: Math.round(changeA),
        changeB: Math.round(-changeA)
    };
}

function calculateExperienceElo(ratingA, ratingB, scoreA, fightCountA, fightCountB) {
    const BASE_K = 32;
    const MAX_ADJUSTMENT = 0.5;

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

    const newRatingA = Math.max(Math.round(ratingA + changeA), 0);
    const newRatingB = Math.max(Math.round(ratingB - changeA), 0);

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

    return { newRatingA, newRatingB, kFactorA, kFactorB };
}

function calculateTitleFightElo(ratingA, ratingB, scoreA, fightType) {
    const BASE_K = 32;
    const titleFightBonus = 1.5; // 50% bonus

    // Vérifier si c'est un combat pour le titre
    const isTitleFight = fightType.toLowerCase().includes('title');

    // Ajuster le facteur K si c'est un combat pour le titre
    const K = isTitleFight ? BASE_K * titleFightBonus : BASE_K;

    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + K * (scoreA - expectedScoreA);
    const newRatingB = ratingB + K * ((1 - scoreA) - (1 - expectedScoreA));

    return { 
        newRatingA: Math.round(newRatingA), 
        newRatingB: Math.round(newRatingB),
        isTitleFight: isTitleFight
    };
}

function calculateWinTypeElo(ratingA, ratingB, scoreA, win_By, last_Round, last_Round_Time, isTitleFight) {
    const BASE_K = 32;
    let bonusFactor = 1;

    // Bonus based on win type
    if (win_By === "Submission" || win_By === "KO/TKO") {
        bonusFactor += 0.5; // 50% bonus
    } else if (win_By === "Decision - Unanimous") {
        bonusFactor += 0.2; // 20% bonus
    }

    // Bonus based on last round
    if (last_Round === 1 ) {
        bonusFactor += 0.4; // 40% bonus added
    } else if (last_Round === 2 ) {
        bonusFactor += 0.2; // 20% bonus added
    }

    // Conversion of last round time to seconds
    const timeParts = last_Round_Time.split(':');
    const timeInSeconds = parseInt(timeParts[0]) * 60 + parseInt(timeParts[1]);

    // Bonus based on last round time (only for first round)
    if (last_Round === 1) {
        if (timeInSeconds <= 30) {
            bonusFactor += 0.5; // 50% bonus added
        } else if (timeInSeconds <= 60) {
            bonusFactor += 0.4; // 40% bonus added
        } else if (timeInSeconds <= 120) {
            bonusFactor += 0.3; // 30% bonus added
        } else if (timeInSeconds <= 180) {
            bonusFactor += 0.2; // 20% bonus added
        } else if (timeInSeconds <= 240) {
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
        newRatingA: Math.round(newRatingA), 
        newRatingB: Math.round(newRatingB),
        bonusFactor,
        effectiveK: K,
    };
}

function calculateStrikingElo(ratingA, ratingB, scoreA, win_By, R_KD, B_KD, R_SIG_STR, B_SIG_STR, R_SIG_STR_pct, B_SIG_STR_pct) {

    const BASE_K = 32;
    let bonusFactor = 1;

    // Fonction pour parser les coups significatifs de manière sécurisée
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
    bonusFactor += totalKD * 0.2; // 20% bonus par knockdown

    // Traitement des coups significatifs
    const [R_SIG_STR_landed, R_SIG_STR_attempted] = parseSigStrikes(R_SIG_STR);
    const [B_SIG_STR_landed, B_SIG_STR_attempted] = parseSigStrikes(B_SIG_STR);

    // Bonus basé sur la différence de coups significatifs
    const sigStrikeDiff = Math.abs(R_SIG_STR_landed - B_SIG_STR_landed);
    const strikingDominanceBonus = Math.min(sigStrikeDiff / 50, 1); // Max 100% bonus pour 50 coups de différence
    bonusFactor += strikingDominanceBonus;

    // Bonus basé sur la précision des coups significatifs
    const R_SIG_STR_percent = parseFloat(R_SIG_STR_pct) / 100 || 0;
    const B_SIG_STR_percent = parseFloat(B_SIG_STR_pct) / 100 || 0;
    const maxAccuracy = Math.max(R_SIG_STR_percent, B_SIG_STR_percent);
    const accuracyBonus = maxAccuracy * 0.5; // Max 50% bonus pour 100% de précision
    bonusFactor += accuracyBonus;

    // Application du facteur de bonus au facteur K
    const K = BASE_K * bonusFactor;

    // Calcul ELO standard
    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + K * (scoreA - expectedScoreA);
    const newRatingB = ratingB + K * ((1 - scoreA) - (1 - expectedScoreA));

    const result = { 
        newRatingA: Math.round(newRatingA), 
        newRatingB: Math.round(newRatingB),
        bonusFactor,
        effectiveK: K,
    };

    return result;
}

module.exports = { calculateBasicElo, calculateExperienceElo, calculateTitleFightElo, calculateWinTypeElo, calculateStrikingElo };