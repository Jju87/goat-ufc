
let K_FACTOR = 32;

function calculateExpectedScore(ratingA, ratingB) {
    return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function updateElo(ratingA, ratingB, actualScoreA) {
    const expectedScoreA = calculateExpectedScore(ratingA, ratingB);
    const expectedScoreB = 1 - expectedScoreA;
    const actualScoreB = 1 - actualScoreA;

    const newRatingA = Math.round(ratingA + K_FACTOR * (actualScoreA - expectedScoreA));
    const newRatingB = Math.round(ratingB + K_FACTOR * (actualScoreB - expectedScoreB));

    return { newRatingA, newRatingB };
}

module.exports = { updateElo };