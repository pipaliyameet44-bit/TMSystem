require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb } = require('./db/database');

const app = express();
const PORT = process.env.PORT || 5000;
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
const configuredAllowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ALLOWED_ORIGINS,
  'https://6a50d3fb337dabcb1e0b11ae--taskmanagementsystem635.netlify.app'
]
  .flatMap(value => (value ? value.split(',').map(item => item.trim()).filter(Boolean) : []));
const allowedOrigins = [...new Set([...defaultAllowedOrigins, ...configuredAllowedOrigins])];

function isAllowedOrigin(origin) {
  if (!origin) return true;

  if (allowedOrigins.includes(origin)) return true;

  return /https:\/\/.*\.(vercel\.app|netlify\.app)$/i.test(origin);
}

// Middleware
app.use(cors({
  origin: (origin, callback) => {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

let isInitialized = false;
let initPromise = null;

async function initializeApp() {
  if (isInitialized) {
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        await getDb();
        console.log('✅ Database ready');
        isInitialized = true;
      } catch (err) {
        console.error('❌ Database initialization failed:', err.message);
        throw err;
      }
    })();
  }

  return initPromise;
}

// Mount auth and task routes
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
console.log('✅ Routes mounted: /api/auth, /api/tasks');

// Middleware to ensure database is initialized before handling requests
app.use(async (req, res, next) => {
  if (!isInitialized) {
    try {
      await initializeApp();
    } catch (error) {
      return next(error);
    }
  }
  next();
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
  console.error('🔴 Unhandled error:', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });
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
