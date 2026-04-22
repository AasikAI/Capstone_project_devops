const Profile = require('../models/profile.model');
const logger = require('../config/logger');

// GET /api/profiles/me
const getMyProfile = async (req, res) => {
  try {
    let profile = await Profile.findOne({ userId: req.user.id });
    if (!profile) {
      // Auto-create profile on first access
      profile = await Profile.create({
        userId: req.user.id,
        email: req.user.email,
        firstName: req.user.firstName || '',
        lastName: req.user.lastName || '',
      });
    }
    res.status(200).json({ success: true, data: { profile } });
  } catch (err) {
    logger.error(`Get profile error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to fetch profile' });
  }
};

// PUT /api/profiles/me
const updateMyProfile = async (req, res) => {
  try {
    const allowedFields = ['firstName', 'lastName', 'phone', 'dateOfBirth', 'gender', 'avatarUrl', 'preferences'];
    const updates = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user.id },
      { $set: updates },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(200).json({ success: true, message: 'Profile updated', data: { profile } });
  } catch (err) {
    logger.error(`Update profile error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to update profile' });
  }
};

// POST /api/profiles/me/addresses
const addAddress = async (req, res) => {
  try {
    const { street, city, state, postalCode, country, label, isDefault } = req.body;
    if (!street || !city || !state || !postalCode) {
      return res.status(400).json({ success: false, message: 'Street, city, state, and postal code are required' });
    }
    const profile = await Profile.findOne({ userId: req.user.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    // If new address is default, unset existing defaults
    if (isDefault) profile.addresses.forEach((a) => { a.isDefault = false; });

    profile.addresses.push({ street, city, state, postalCode, country: country || 'India', label: label || 'Home', isDefault: isDefault || false });
    await profile.save();
    res.status(201).json({ success: true, message: 'Address added', data: { addresses: profile.addresses } });
  } catch (err) {
    logger.error(`Add address error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to add address' });
  }
};

// DELETE /api/profiles/me/addresses/:addressId
const deleteAddress = async (req, res) => {
  try {
    const profile = await Profile.findOne({ userId: req.user.id });
    if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });

    const addressIndex = profile.addresses.findIndex((a) => a._id.toString() === req.params.addressId);
    if (addressIndex < 0) return res.status(404).json({ success: false, message: 'Address not found' });

    profile.addresses.splice(addressIndex, 1);
    await profile.save();
    res.status(200).json({ success: true, message: 'Address deleted', data: { addresses: profile.addresses } });
  } catch (err) {
    logger.error(`Delete address error: ${err.message}`);
    res.status(500).json({ success: false, message: 'Failed to delete address' });
  }
};

module.exports = { getMyProfile, updateMyProfile, addAddress, deleteAddress };
