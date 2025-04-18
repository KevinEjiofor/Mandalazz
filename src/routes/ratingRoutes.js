const express = require('express');
const router = express.Router();
const ratingController = require('../rating/controller/RatingController');
const authenticate = require('../middlewares/authMiddleware');

router.use(authenticate);

router.post('/:productId', ratingController.rateProduct);
router.get('/:productId', ratingController.getProductRatings);
module.exports = router;
