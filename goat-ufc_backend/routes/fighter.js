const express = require('express');
const router = express.Router();
const fighterCtrl = require('../controllers/fighter');

router.get('/', fighterCtrl.getAllFighters);
router.get('/:_id', fighterCtrl.getOneFighter);

module.exports = router;