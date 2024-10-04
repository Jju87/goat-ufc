const Fight = require('./fight');

async function getUFCStats() {
    const stats = await Fight.aggregate([
        {
            $group: {
                _id: null,
                totalFights: { $sum: 1 },
                uniqueFighters: { 
                    $addToSet: {
                        $concatArrays: [
                            ["$R_fighter"], 
                            ["$B_fighter"]
                        ]
                    }
                }
            }
        },
        {
            $project: {
                totalFights: 1,
                uniqueFightersCount: { 
                    $size: {
                        $reduce: {
                            input: "$uniqueFighters",
                            initialValue: [],
                            in: { $setUnion: ["$$value", "$$this"] }
                        }
                    }
                }
            }
        }
    ]);

    if (stats.length > 0) {
        const { totalFights, uniqueFightersCount } = stats[0];
        const averageFights = totalFights * 2 / uniqueFightersCount; // Multiplié par 2 car chaque combat implique 2 combattants
        return { totalFights, uniqueFightersCount, averageFights };
    }

    return { totalFights: 0, uniqueFightersCount: 0, averageFights: 0 };
}

module.exports = { getUFCStats };