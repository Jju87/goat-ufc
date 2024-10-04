
const express = require('express');
const router = express.Router();
const eloController = require('../controllers/elo');

router.post('/calculate', eloController.calculateAllElos);
router.get('/rankings/basic', eloController.getBasicEloRanking);
router.get('/rankings/experience', eloController.getExperienceEloRanking);

module.exports = router;