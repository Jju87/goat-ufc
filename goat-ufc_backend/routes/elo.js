const express = require('express');
const router = express.Router();
const eloController = require('../controllers/elo');

router.post('/calculate', eloController.calculateAllElos);
router.get('/rankings', eloController.getEloRanking);

module.exports = router;