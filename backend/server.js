const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
    origin: true,
    credentials: true
}));
app.use(express.json());

// Rate limiting - increased limits for development
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 500, // Increased from 100 to 500 requests per window
    message: { success: false, message: 'Too many requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

// Test route
app.get('/api/health', async (req, res) => {
    const supabase = require('./config/supabase');
    const { count, error } = await supabase
        .from('venues')
        .select('*', { count: 'exact', head: true });
    
    if (error) {
        return res.status(500).json({ 
            status: 'error', 
            message: 'Supabase connection failed',
            error: error.message 
        });
    }
    
    res.json({ 
        status: 'ok', 
        message: 'Supabase connected successfully',
        venues_count: count 
    });
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/venues', require('./routes/venues'));
app.use('/api/events', require('./routes/events'));
app.use('/api/bookings', require('./routes/bookings'));
app.use('/api/waitlists', require('./routes/waitlists'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/resources', require('./routes/resources'));
app.use('/api/demand-prediction', require('./routes/demandPrediction'));

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});
// 404 handler — return JSON instead of HTML
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found: ' + req.method + ' ' + req.originalUrl
    });
});