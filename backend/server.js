require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getDb } = require('./db/database');

const app = express();
const PORT = Number(process.env.PORT) || 5000;
// Default allowed origins for local development (including Vite dev server port 5174)
const defaultAllowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];
const configuredAllowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.ALLOWED_ORIGINS,
  'https://6a51273c9cb4280d556c6044--tmsystem63524.netlify.app',
  'https://tmsystem63524.netlify.app',
  'https://tmsystem.onrender.com'
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
  console.log(`📍 ${req.method} ${req.path}`);

  if (req.path === '/api/health' || req.path === '/') {
    return next();
  }

  if (!isInitialized) {
    console.log('⏳ Waiting for database initialization...');
    try {
      await initializeApp();
      console.log('✅ Database initialized');
    } catch (error) {
      console.error('❌ Database initialization error:', error.message);
      return res.status(503).json({ error: 'Database is unavailable right now. Please try again shortly.' });
    }
  }
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.json({ message: 'Server is running', env: process.env.NODE_ENV || 'development' });
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

function startServer(port, attempt = 1) {
  const server = app.listen(port, () => {
    console.log(`🚀 Server running at http://localhost:${port}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE' && attempt <= 10) {
      const nextPort = port + 1;
      console.warn(`⚠️ Port ${port} is busy. Trying ${nextPort}...`);
      server.close(() => startServer(nextPort, attempt + 1));
    } else {
      console.error(`❌ Failed to start server on port ${port}:`, err.message);
      process.exit(1);
    }
  });
}

if (require.main === module) {
  initializeApp()
    .then(() => startServer(PORT))
    .catch(err => {
      console.error('❌ Failed to initialize database:', err);
      process.exit(1);
    });
}

module.exports = app;
