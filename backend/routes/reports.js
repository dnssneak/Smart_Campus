const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getVenueUsageReport,
    getEventStatsReport,
    getUserActivityReport
} = require('../controllers/reportController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All reports require auth, some require admin
router.get('/dashboard', auth, getDashboardStats);
router.get('/venue-usage', auth, getVenueUsageReport);
router.get('/event-stats', auth, getEventStatsReport);
router.get('/user-activity', auth, roleCheck(['admin']), getUserActivityReport);

module.exports = router;