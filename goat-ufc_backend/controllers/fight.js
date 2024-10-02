const Fight = require("../models/fight");

exports.getAllFights = (req, res, next) => {
    Fight.find()
        .then((fights) => {
            // console.log('Fetched Fights:', fights); // Log des données récupérées
            res.status(200).json(fights);
        })
        .catch((error) => res.status(400).json({ error }));
};

exports.getOneFight = (req, res, next) => {
    Fight.findOne({ _id: req.params._id })
    .then((fight) => {
        if(!fight){
        return res.status(404).json({message: "Fight not found"});  
        }
        res.status(200).json(fight);
    })
    .catch((error) => res.status(404).json({ message: "fight not found", error }));
};

// async function fetchFights() {
//     try {
//         console.log('Model Fight:', Fight);
//         console.log('Fetching fights from database...');
//         const fights = await Fight.find(); // Cela tentera de trouver des documents dans la collection `fights`
//         console.log('Après la requête');
//         console.log('Nombre de fights trouvés:', fights.length);
//         console.log('Premier fight (si existe):', fights[0]);
//         console.log('Fetched Fights:', JSON.stringify(fights, null, 2));
//         console.log('Fights:', fights);
//     } catch (error) {
//         console.error('Erreur lors de la récupération des combats:', error);
//     }
//   }
  
//   fetchFights();