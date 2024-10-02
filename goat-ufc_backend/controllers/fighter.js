const Fighter = require("../models/fighter");

exports.getAllFighters = (req, res, next) => {
    Fighter.find()
        .then((fighters) => {
            res.status(200).json(fighters);
        })
        .catch((error) => res.status(400).json({ error }));
};

exports.getOneFighter = (req, res, next) => {
    Fighter.findOne({ _id: req.params._id })
        .then((fighter) => {
            if (!fighter) {
                return res.status(404).json({ message: "Fighter not found" });
            }
            res.status(200).json(fighter);
        })
        .catch((error) => res.status(400).json({ error }));
};
