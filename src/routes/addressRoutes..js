const express = require('express');
const AddressController = require('../address/controllers/AddressController');
const { authenticate, authorize } = require('../middlewares/authMiddleware');
const router = express.Router();


router.use(authenticate);

router.post('/', AddressController.createAddress);
router.get('/', AddressController.getUserAddresses);
router.get('/default', AddressController.getDefaultAddress);
router.get('/suggestions', AddressController.getAddressSuggestions);
router.post('/validate', AddressController.validateAddress);
router.get('/:addressId', AddressController.getAddressById);
router.put('/:addressId', AddressController.updateAddress);
router.delete('/:addressId', AddressController.deleteAddress);
router.patch('/:addressId/default', AddressController.setDefaultAddress);
router.get('/:addressId/landmarks', AddressController.findNearbyLandmarks);


router.get('/admin/search', authorize(['admin']), AddressController.searchAddresses);

module.exports = router;