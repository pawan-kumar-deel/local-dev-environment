const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');

// Get application settings
router.get('/', profileController.getProfiles);
router.get('/current', profileController.getCurrentProfile);
router.get('/login', profileController.login);

module.exports = router;