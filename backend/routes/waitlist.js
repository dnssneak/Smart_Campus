const express = require('express');
const router = express.Router();
const {
    addToWaitlist,
    getMyWaitlist,
    getAllWaitlist,
    processWaitlist,
    cancelWaitlist
} = require('../controllers/waitlistController');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');

router.post('/', auth, addToWaitlist);
router.get('/my', auth, getMyWaitlist);
router.get('/all', auth, roleCheck(['admin']), getAllWaitlist);
router.post('/process', auth, roleCheck(['admin']), processWaitlist);
router.put('/:id/cancel', auth, cancelWaitlist);

module.exports = router;