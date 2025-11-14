// Load environment variables FIRST before any other imports
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./db');

// Set default values for required environment variables
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'your-super-secret-jwt-key-change-this-in-production';
  console.log('Warning: Using default JWT_SECRET. Please set a secure JWT_SECRET in your .env file.');
}

// Import routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const patientsRoutes = require('./routes/patients');
const doctorsRoutes = require('./routes/doctors');
const appointmentsRoutes = require('./routes/appointments');
const prescriptionsRoutes = require('./routes/prescriptions');
const examsRoutes = require('./routes/exams');
const moodEntriesRoutes = require('./routes/mood-entries');
const doctorNotesRoutes = require('./routes/doctorNotes');
const lgpdRoutes = require('./routes/lgpd');
const adminRoutes = require('./routes/admin');

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

// Connect to database
connectDB().then(() => {
  console.log("Database connection has been attempted.");
});

// Basic root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Serenitas backend is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Health check endpoint with database and storage connectivity checks
app.get('/health', async (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    checks: {
      database: 'unknown',
      storage: 'unknown'
    }
  };

  try {
    // Check database connectivity
    const { supabase } = require('./config/supabase');
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (error) {
      healthCheck.checks.database = 'disconnected';
      healthCheck.status = 'unhealthy';
      healthCheck.error = error.message;
    } else {
      healthCheck.checks.database = 'connected';
    }

    // Check Supabase Storage connectivity
    try {
      const { data: buckets, error: storageError } = await supabase
        .storage
        .listBuckets();

      if (storageError) {
        healthCheck.checks.storage = 'disconnected';
        healthCheck.status = 'degraded';
      } else {
        healthCheck.checks.storage = 'connected';
      }
    } catch (storageErr) {
      healthCheck.checks.storage = 'disconnected';
      healthCheck.status = 'degraded';
    }

    // Return appropriate status code
    const statusCode = healthCheck.status === 'healthy' ? 200 : 
                       healthCheck.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(healthCheck);
  } catch (error) {
    healthCheck.status = 'unhealthy';
    healthCheck.checks.database = 'error';
    healthCheck.error = error.message;
    res.status(503).json(healthCheck);
  }
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/patients', patientsRoutes);
app.use('/api/doctors', doctorsRoutes);
app.use('/api/appointments', appointmentsRoutes);
app.use('/api/prescriptions', prescriptionsRoutes);
app.use('/api/exams', examsRoutes);
app.use('/api/mood-entries', moodEntriesRoutes);
app.use('/api/doctor-notes', doctorNotesRoutes);
app.use('/api/lgpd', lgpdRoutes);
app.use('/api/admin', adminRoutes);

// Import error handlers
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// 404 handler (must be before error handler)
app.use('*', notFoundHandler);

// Global error handling middleware (must be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📊 Health check: http://localhost:${PORT}`);
  console.log(`🔗 API base: http://localhost:${PORT}/api`);
}); 