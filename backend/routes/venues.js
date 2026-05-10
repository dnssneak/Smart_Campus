const express = require('express');
const router = express.Router();
const {
    getAllVenues,
    getVenueById,
    getVenueAvailability,
    createVenue,
    updateVenue,
    deleteVenue
} = require('../controllers/venueController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// Public routes (require auth)
router.get('/', auth, getAllVenues);
router.get('/:id', auth, getVenueById);
router.get('/:id/availability', auth, getVenueAvailability);

// Admin only routes
router.post('/', auth, roleCheck(['admin']), createVenue);
router.put('/:id', auth, roleCheck(['admin']), updateVenue);
router.delete('/:id', auth, roleCheck(['admin']), deleteVenue);

module.exports = router;    