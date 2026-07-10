const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDb } = require('../db/database');

const router = express.Router();
const jwtSecret = process.env.JWT_SECRET || 'task-management-dev-secret';

// ─────────────────────────────────────────────
// POST /api/auth/register
// Body: { username, password }
// ─────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const db = await getDb();
    const { email, first_name, last_name, password } = req.body;

    // ── Validation ──────────────────────────
    if (!email || !first_name || !last_name || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email.' });
    }
    const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).{8,16}$/;
    if (!pwdRegex.test(password)) {
      return res.status(400).json({ error: 'Password must be 8-16 chars, with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.' });
    }

    // ── Duplicate check ──────────────────────
    const existing = db.get(
      'SELECT id FROM users WHERE email = ?',
      email.trim()
    );
    if (existing) {
      return res.status(409).json({ error: 'Email already exists.' });
    }

    // ── Hash & insert ────────────────────────
    const hashed = await bcrypt.hash(password, 10);
    const result = db.run(
      'INSERT INTO users (email, first_name, last_name, password) VALUES (?, ?, ?, ?)',
      email.trim(),
      first_name.trim(),
      last_name.trim(),
      hashed
    );
    const userId = result.lastInsertRowid;

    // ── Issue JWT ────────────────────────────
    const token = jwt.sign(
      { id: userId, email: email.trim() },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      message: 'User registered successfully.',
      token,
      user: { id: userId, email: email.trim(), first_name: first_name.trim(), last_name: last_name.trim() },
    });
  } catch (err) {
    console.error('Register error:', err.message, err.stack);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ─────────────────────────────────────────────
// POST /api/auth/login
// Body: { username, password }
// ─────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const db = await getDb();
    const { email, password } = req.body;

    // ── Validation ──────────────────────────
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    // ── Look up user ─────────────────────────
    const user = db.get(
      'SELECT * FROM users WHERE email = ?',
      email.trim()
    );
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // ── Verify password ──────────────────────
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    // ── Issue JWT ────────────────────────────
    const token = jwt.sign(
      { id: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful.',
      token,
      user: { id: user.id, email: user.email, first_name: user.first_name, last_name: user.last_name },
    });
  } catch (err) {
    console.error('Login error:', err.message, err.stack);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
