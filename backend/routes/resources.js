const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all resources (facilities and equipment)
router.get('/', resourceController.getAllResources);

// Get resources by venue
router.get('/venue/:venueId', resourceController.getResourcesByVenue);

// Search venues by required resources
router.get('/search', resourceController.searchVenuesByResources);

// Get resource utilization statistics
router.get('/utilization', resourceController.getResourceUtilization);

module.exports = router;
