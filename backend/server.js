require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;
const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  process.env.FRONTEND_URL,
  'https://6a50d3fb337dabcb1e0b11ae--taskmanagementsystem635.netlify.app'
].filter(Boolean);

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));
app.use(express.json());

let isInitialized = false;
let initPromise = null;

async function initializeApp() {
  if (isInitialized) return;

  if (!initPromise) {
    initPromise = getDb().then(() => {
      const authRoutes = require('./routes/auth');
      const taskRoutes = require('./routes/tasks');

      app.use('/api/auth', authRoutes);
      app.use('/api/tasks', taskRoutes);
      isInitialized = true;
    });
  }

  return initPromise;
}

app.use(async (req, res, next) => {
  try {
    await initializeApp();
    next();
  } catch (error) {
    next(error);
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found.' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error.' });
});

if (require.main === module) {
  initializeApp()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`🚀 Server running at http://localhost:${PORT}`);
      });
    })
    .catch(err => {
      console.error('❌ Failed to initialize database:', err);
      process.exit(1);
    });
}

module.exports = app;
