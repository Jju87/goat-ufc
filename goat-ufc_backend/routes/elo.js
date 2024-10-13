
const express = require('express');
const router = express.Router();
const eloController = require('../controllers/elo');

router.post('/calculate', eloController.calculateAllElos);

router.get('/rankings/basic', eloController.getBasicEloRanking);
router.get('/rankings/experience', eloController.getExperienceEloRanking);
router.get('/rankings/title', eloController.getTitleFightEloRanking);
router.get('/rankings/winType', eloController.getWinTypeEloRanking);
router.get('/rankings/striking', eloController.getStrikingEloRanking);
router.get('/rankings/ground',eloController.getGroundEloRanking);
router.get('/rankings/activity', eloController.getActivityEloRanking);
router.get('/rankings/winStreak', eloController.getWinStreakEloRanking);
router.get('/rankings/category', eloController.getCategoryEloRanking);
router.get('/rankings/combined', eloController.getCombinedEloRanking);
router.get('/rankings/peak', eloController.getPeakEloRanking);

module.exports = router;