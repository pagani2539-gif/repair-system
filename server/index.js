const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');
const db = require('./database/init'); // This will also ensure tables are created

const app = express();
const PORT = process.env.PORT || 5221;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  }
}));

// Import Routes
const repairRoutes = require('./routes/repairs');
const inventoryRoutes = require('./routes/inventory');
const withdrawalRoutes = require('./routes/withdrawals');
const transactionRoutes = require('./routes/transactions');
const poRoutes = require('./routes/purchaseOrders');
const searchRoutes = require('./routes/search');
const stationRoutes = require('./routes/stations');
const settingsRoutes = require('./routes/settings');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const errorHandler = require('./middlewares/errorHandler');
const { requireAuth } = require('./middlewares/auth');

// Public auth routes — must be mounted BEFORE the global auth guard
app.use('/api/auth', authRoutes);

// All other API routes require authentication
app.use('/api/repairs', requireAuth, repairRoutes);
app.use('/api/inventory', requireAuth, inventoryRoutes);
app.use('/api/withdrawals', requireAuth, withdrawalRoutes);
app.use('/api/transactions', requireAuth, transactionRoutes);
app.use('/api/purchase-orders', requireAuth, poRoutes);
app.use('/api/search', requireAuth, searchRoutes);
app.use('/api/stations', requireAuth, stationRoutes);
app.use('/api/settings', requireAuth, settingsRoutes);
app.use('/api/users', requireAuth, usersRoutes);

// Health check endpoint
app.get('/api', (req, res) => {
  res.json({ message: 'Repair System API is running' });
});

// Mount central error handler
app.use(errorHandler);

console.log('Routes mounted on /api/repairs, /api/inventory, /api/withdrawals, /api/purchase-orders');

// Serve static frontend files in production if dist folder exists
const distPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  console.log('Serving production frontend from client/dist');
  app.get('*', (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  // Simple check in development/API-only mode
  app.get('/', (req, res) => {
    res.json({ message: 'Repair System API is running (Development Mode)' });
  });
}

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
