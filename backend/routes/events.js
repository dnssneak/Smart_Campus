const express = require('express');
const router = express.Router();
const {
    createEvent,
    getEvents,
    getEventById,
    updateEvent,
    deleteEvent,
    updateStatus
} = require('../controllers/eventController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

// All routes require auth
router.post('/', auth, createEvent);
router.get('/', auth, getEvents);
router.get('/:id', auth, getEventById);
router.put('/:id', auth, updateEvent);
router.delete('/:id', auth, deleteEvent);

// Admin only
router.put('/:id/status', auth, roleCheck(['admin']), updateStatus);

module.exports = router;