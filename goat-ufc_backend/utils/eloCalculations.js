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
        newRatingA: Math.round(newRatingA), 
        newRatingB: Math.round(newRatingB),
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
    bonusFactor += totalKD * 0.2; // 20% bonus par knockdown

    // Traitement des coups significatifs et totaux
    const [R_SIG_STR_landed, ] = parseSigStrikes(R_SIG_STR);
    const [B_SIG_STR_landed, ] = parseSigStrikes(B_SIG_STR);
    const [R_TOTAL_STR_landed, ] = parseSigStrikes(R_TOTAL_STR);
    const [B_TOTAL_STR_landed, ] = parseSigStrikes(B_TOTAL_STR);

    // Calcul des ratios et bonus
    function calculateRatioBonus(strikerA, strikerB) {
        if (strikerB === 0) return strikerA > 0 ? strikerA : 0; // Évite la division par zéro
        return Math.max(0, (strikerA / strikerB) - 1); // -1 pour que le bonus commence à partir de la domination
    }

    const sigStrikeBonus = calculateRatioBonus(R_SIG_STR_landed, B_SIG_STR_landed);
    const totalStrikeBonus = calculateRatioBonus(R_TOTAL_STR_landed, B_TOTAL_STR_landed);

    // Application des bonus
    bonusFactor += sigStrikeBonus;
    bonusFactor += totalStrikeBonus;

    // Application du facteur de bonus au facteur K
    const K = BASE_K * bonusFactor;

    // Calcul ELO standard
    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + K * (scoreA - expectedScoreA);
    const newRatingB = ratingB + K * ((1 - scoreA) - (1 - expectedScoreA));

    return { 
        newRatingA: Math.round(newRatingA), 
        newRatingB: Math.round(newRatingB),
        bonusFactor,
        effectiveK: K,
        sigStrikeBonus,
        totalStrikeBonus
    };
};

module.exports = { calculateBasicElo, calculateExperienceElo, calculateTitleFightElo, calculateWinTypeElo, calculateStrikingElo };