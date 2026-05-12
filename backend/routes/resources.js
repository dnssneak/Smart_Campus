const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const auth = require('../middleware/auth');

router.use(auth);

router.get('/', resourceController.getAllResources);
router.get('/venue/:venueId', resourceController.getResourcesByVenue);
router.get('/search', resourceController.searchVenuesByResources);
router.get('/utilization', resourceController.getResourceUtilization);

// FR-RA-01: Real-time availability
router.get('/availability', resourceController.checkResourceAvailability);

// FR-RA-02: Auto-allocate
router.post('/allocate', resourceController.autoAllocateResources);

// FR-RA-06: Manual override
router.put('/override/:assignmentId', resourceController.manualOverrideAllocation);

// Current assignments
router.get('/assignments', resourceController.getCurrentAssignments);

module.exports = router;