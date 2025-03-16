const express = require('express');
const router = express.Router();

// Import all route modules
const userRoutes = require('./user.routes');
const companyRoutes = require('./company.routes');
const jobRoutes = require('./job.routes');
const applicationRoutes = require('./application.routes');
const chatRoutes = require('./chat.routes');
const graphqlRoutes = require('./graphql.routes');
const adminRoutes = require('./admin.routes');

// Health check route
router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is up and running',
    timestamp: new Date().toISOString()
  });
});

// Register all routes
router.use('/users', userRoutes);
router.use('/companies', companyRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/chats', chatRoutes);
router.use('/graphql', graphqlRoutes);
router.use('/admin', adminRoutes);

module.exports = router;