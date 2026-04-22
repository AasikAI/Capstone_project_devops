const express = require('express');
const router = express.Router();
const { getMyProfile, updateMyProfile, addAddress, deleteAddress } = require('../controllers/profile.controller');
const { verifyToken } = require('../middleware/auth.middleware');

router.use(verifyToken);

router.get('/me', getMyProfile);
router.put('/me', updateMyProfile);
router.post('/me/addresses', addAddress);
router.delete('/me/addresses/:addressId', deleteAddress);

module.exports = router;
