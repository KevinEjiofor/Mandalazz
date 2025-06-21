const express = require('express');
const LocationController = require('../location/controllers/LocationController');
const NigeriaLocationController = require('../location/controllers/NigeriaLocationController');
const authMiddleware = require('../middlewares/authMiddleware');

const router = express.Router();


router.get('/suggestions', authMiddleware, LocationController.getAddressSuggestions);

router.get('/details/:placeId', authMiddleware, LocationController.getPlaceDetails);


router.get('/nigeria/states', NigeriaLocationController.getAllStates);
router.get('/nigeria/states/:state/lgas', NigeriaLocationController.getLGAsByState);

module.exports = router;
