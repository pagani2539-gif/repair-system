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

// Simple check
app.get('/', (req, res) => {
  res.json({ message: 'Repair System API is running' });
});

// Import Routes
const repairRoutes = require('./routes/repairs');
app.use('/api/repairs', repairRoutes);
console.log('Routes mounted on /api/repairs');

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
