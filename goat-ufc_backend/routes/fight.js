const express = require('express');
const router = express.Router();
const fightCtrl = require('../controllers/fight');

router.get('/', fightCtrl.getAllFights);
router.get('/:_id', fightCtrl.getOneFight);

module.exports = router;