const express = require('express');
const loadEnv = require('./config/loadEnv');
const connectDB = require('./config/db');
const logger = require('./utils/logger');
const { errorHandler } = require('./utils/errorHandler');
const { requestLogger } = require('./utils/validation');

// Load environment variables
loadEnv();

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Enable CORS for frontend communication
const cors = require('cors');
const allowedOrigins = [
    process.env.VITE_FRONTEND_URL,
    process.env.VITE_AUTOMATION_API_URL,
    'http://127.0.0.1:4173',
    'http://localhost:4173',
    'http://127.0.0.1:3000',
    'http://localhost:3000'
].filter(Boolean);

app.use(cors({
    origin: (origin, callback) => {
        if (process.env.NODE_ENV !== 'production') {
            callback(null, true);
            return;
        }
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
            return;
        }
        callback(new Error(`CORS blocked: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date(),
        service: 'Insurance Module API'
    });
});

// API Documentation endpoint
app.get('/api/docs', (req, res) => {
    res.json({
        service: 'Parametric Insurance Module',
        version: '1.0.0',
        endpoints: {
            auth: '/auth',
            policies: '/policy',
            claims: '/claim'
        },
        documentation: 'See README.md for full API documentation'
    });
});

// Routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/policy', require('./routes/policyRoutes'));
app.use('/claim', require('./routes/claimRoutes'));
app.use('/risk', require('./routes/riskRoutes'));

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found',
        path: req.originalUrl
    });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Graceful shutdown
process.on('SIGINT', () => {
    logger.info('Server shutting down gracefully...');
    process.exit(0);
});

module.exports = app;
