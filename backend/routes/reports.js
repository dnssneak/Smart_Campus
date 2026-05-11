const express = require('express');
const router = express.Router();
const {
    getDashboardStats,
    getEventStatusBreakdown,
    getEventsByCategory,
    getVenueUtilization
} = require('../controllers/reportController');
const auth = require('../middleware/auth');

router.get('/dashboard', auth, getDashboardStats);
router.get('/event-status', auth, getEventStatusBreakdown);
router.get('/events-by-category', auth, getEventsByCategory);
router.get('/venue-utilization', auth, getVenueUtilization);

module.exports = router;