const express = require('express');
const router = express.Router();
const ratingController = require('../rating/controller/RatingController');
const authenticate = require('../middlewares/authMiddleware');

router.use(authenticate);

router.post('/:productId', ratingController.rateProduct);
router.get('/:productId', ratingController.getProductRatings);
router.put('/:productId/:ratingId', ratingController.updateRating);
router.delete('/:productId/:ratingId', ratingController.deleteRating);
module.exports = router;
