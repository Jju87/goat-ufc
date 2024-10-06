function calculateBasicElo(ratingA, ratingB, scoreA) {
    const K = 32;
    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + K * (scoreA - expectedScoreA);
    const newRatingB = ratingB + K * ((1 - scoreA) - (1 - expectedScoreA));
    return { newRatingA: Math.round(newRatingA), newRatingB: Math.round(newRatingB) };
}

function calculateExperienceElo(ratingA, ratingB, scoreA, fightCountA, fightCountB, avgFights) {
    function calculateKFactor(fightCount) {
        const BASE_K = 32;
        const MAX_K = 40;
        const experienceFactor = Math.min(fightCount / avgFights, 2); // 2 is the maximum experience factor
        return BASE_K + (MAX_K - BASE_K) * (1 - Math.exp(-experienceFactor));
    }

    const kFactorA = calculateKFactor(fightCountA);
    const kFactorB = calculateKFactor(fightCountB);

    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + kFactorA * (scoreA - expectedScoreA);
    const newRatingB = ratingB + kFactorB * ((1 - scoreA) - (1 - expectedScoreA));

    return { newRatingA: Math.round(newRatingA), newRatingB: Math.round(newRatingB) };
}

function calculateTitleFightElo(ratingA, ratingB, scoreA, fightType) {
    const BASE_K = 32;
    const titleFightBonus = 1.5; // ou 2, selon votre préférence

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

module.exports = { calculateBasicElo, calculateExperienceElo, calculateTitleFightElo };