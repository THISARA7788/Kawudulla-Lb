const express = require('express');
const cors = require('cors');
const path = require('path');
const dotenv = require('dotenv');
const connectDB = require('./config/db');

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Routes (specific routes must be registered before general /api/library)
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/library/fines', require('./routes/fines'));
app.use('/api/library/reports', require('./routes/reports'));
app.use('/api/library', require('./routes/quickLookup'));
app.use('/api/library', require('./routes/library'));
app.use('/api/notifications', require('./routes/notifications'));

// Test route
app.get('/api', (req, res) => {
  res.json({ message: 'MERN Auth API is running' });
});

// Serve React static files (from built frontend)
const buildPath = path.resolve(__dirname, '..', 'client', 'build');
app.use(express.static(buildPath));

// All non-API routes serve the React index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
