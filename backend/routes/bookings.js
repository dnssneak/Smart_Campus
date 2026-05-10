const express = require('express');
const router = express.Router();
const {
    createBooking,
    getBookings,
    getBookingById,
    approveBooking,
    cancelBooking
} = require('../controllers/bookingController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/', auth, createBooking);
router.get('/', auth, getBookings);
router.get('/:id', auth, getBookingById);
router.put('/:id/approve', auth, roleCheck(['admin']), approveBooking);
router.put('/:id/cancel', auth, cancelBooking);

module.exports = router;