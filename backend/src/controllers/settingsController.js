const { GlobalSetting } = require('../models');

// Get Global Settings
async function getGlobalSettings(req, res) {
  try {
    let settings = await GlobalSetting.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = await GlobalSetting.create({
        id: 1,
        booking_start_time: null,
        booking_end_time: null
      });
    }
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Error fetching global settings:', error);
    return res.status(500).json({ error: 'Failed to fetch global settings', details: error.message });
  }
}

// Update Global Settings
async function updateGlobalSettings(req, res) {
  try {
    const { booking_start_time, booking_end_time } = req.body;
    let settings = await GlobalSetting.findOne({ where: { id: 1 } });
    if (!settings) {
      settings = await GlobalSetting.create({
        id: 1,
        booking_start_time,
        booking_end_time
      });
    } else {
      await settings.update({
        booking_start_time,
        booking_end_time,
        updated_at: new Date()
      });
    }
    return res.json({ success: true, settings });
  } catch (error) {
    console.error('Error updating global settings:', error);
    return res.status(500).json({ error: 'Failed to update global settings', details: error.message });
  }
}

module.exports = {
  getGlobalSettings,
  updateGlobalSettings
};
