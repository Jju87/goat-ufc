// utils/eloCalculations.js

function calculateBasicElo(ratingA, ratingB, scoreA) {
    const K = 32;
    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + K * (scoreA - expectedScoreA);
    const newRatingB = ratingB + K * ((1 - scoreA) - (1 - expectedScoreA));
    return { newRatingA: Math.round(newRatingA), newRatingB: Math.round(newRatingB) };
}

function calculateExperienceElo(ratingA, ratingB, scoreA, fightCountA, fightCountB, avgFights) {
    function calculateKFactor(fightCount, avgFights) {
        const experienceFactor = fightCount / avgFights;
        return 32 / (1 + Math.exp(-experienceFactor));
    }

    const kFactorA = calculateKFactor(fightCountA, avgFights);
    const kFactorB = calculateKFactor(fightCountB, avgFights);

    const expectedScoreA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    const newRatingA = ratingA + kFactorA * (scoreA - expectedScoreA);
    const newRatingB = ratingB + kFactorB * ((1 - scoreA) - (1 - expectedScoreA));
    
    return { newRatingA: Math.round(newRatingA), newRatingB: Math.round(newRatingB) };
}

module.exports = { calculateBasicElo, calculateExperienceElo };