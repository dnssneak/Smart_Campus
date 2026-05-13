const express = require('express');
const router = express.Router();
const authenticate = require('../middleware/auth');
const demandPredictionController = require('../controllers/demandPredictionController');

/**
 * Demand Prediction & Recommendation Routes
 * All routes require authentication
 */

// FR-DP-01 & FR-DP-02: Get booking analytics (peak hours, high-demand venues, frequently booked days)
router.get('/analytics', authenticate, demandPredictionController.getBookingAnalytics);

// FR-DP-03: Recommend suitable venues based on requirements
router.post('/recommend-venues', authenticate, demandPredictionController.recommendVenues);

// FR-DP-03: Recommend less congested time slots for a venue
router.get('/recommend-slots', authenticate, demandPredictionController.recommendTimeSlots);

// FR-DP-04: Get optimal schedule suggestions based on analytics
router.get('/suggestions', authenticate, demandPredictionController.getOptimalScheduleSuggestions);

module.exports = router;
