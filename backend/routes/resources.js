const express = require('express');
const router = express.Router();
const resourceController = require('../controllers/resourceController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All routes require authentication
router.use(auth);

// ============================================================================
// Resource Discovery & Information
// ============================================================================

// Get all resources across campus
router.get('/', resourceController.getAllResources);

// Get resources available at a specific venue
router.get('/venue/:venueId', resourceController.getResourcesByVenue);

// ============================================================================
// FR-RA-01: Real-time Resource Availability Tracking
// ============================================================================
router.get('/availability', resourceController.checkResourceAvailability);

// ============================================================================
// FR-RA-02: Automatic Resource Allocation
// FR-RA-03: Prevent Resource Overbooking (enforced by DB trigger)
// FR-RA-04: Optimize allocation using assignment algorithms
// FR-RA-05: Support resource prioritization
// ============================================================================
router.post('/allocate', resourceController.autoAllocateResources);

// ============================================================================
// FR-RA-06: Manual Override Allocation (Admin only)
// ============================================================================
router.put('/override/:assignmentId', roleCheck(['admin', 'staff']), resourceController.manualOverrideAllocation);

// ============================================================================
// Assignment Management
// ============================================================================

// Get current resource assignments (with filters)
router.get('/assignments', resourceController.getCurrentAssignments);

// Get assignment history including overrides
router.get('/assignments/:assignmentId/history', resourceController.getAssignmentHistory);

module.exports = router;
