const express = require('express');
const router = express.Router();
const {
    getWaitlists,
    getWaitlistById,
    createWaitlist,
    cancelWaitlist
} = require('../controllers/waitlistController');
const auth = require('../middleware/auth');

router.get('/', auth, getWaitlists);
router.get('/:id', auth, getWaitlistById);
router.post('/', auth, createWaitlist);
router.put('/:id/cancel', auth, cancelWaitlist);

module.exports = router;