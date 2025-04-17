const express = require('express');
const router = express.Router();
const favoriteController = require('../favorite/controller/FavoriteController');
const authenticate = require('../middlewares/authMiddleware');
const isUser = require('../middlewares/isUser');


router.use(authenticate,isUser);

router.post('/', favoriteController.addToFavorites);
router.delete('/:productId', favoriteController.removeFromFavorites);
router.get('/', favoriteController.getUserFavorites);

module.exports = router;
