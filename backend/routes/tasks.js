const express = require('express');
const { getDb } = require('../db/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// All task routes require authentication
router.use(authMiddleware);

// GET /api/tasks — Fetch all tasks for logged-in user (optional ?status= filter)
router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const { status } = req.query;
    const validStatuses = ['todo', 'in_progress', 'completed'];

    let tasks;
    if (status && validStatuses.includes(status)) {
      tasks = db.all(
        'SELECT * FROM tasks WHERE user_id = ? AND status = ? ORDER BY id DESC',
        req.user.id,
        status
      );
    } else {
      tasks = db.all(
        'SELECT * FROM tasks WHERE user_id = ? ORDER BY id DESC',
        req.user.id
      );
    }

    res.json({ tasks });
  } catch (err) {
    console.error('GET /tasks error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/tasks — Create a new task
router.post('/', async (req, res) => {
  try {
    const db = await getDb();
    const { title, description, status, priority } = req.body;

    if (!title || title.trim().length === 0) {
      return res.status(400).json({ error: 'Task title is required.' });
    }

    const validStatuses = ['todo', 'in_progress', 'completed'];
    const taskStatus = validStatuses.includes(status) ? status : 'todo';
    
    const validPriorities = ['High', 'Medium', 'Low'];
    const taskPriority = validPriorities.includes(priority) ? priority : 'Medium';

    const result = db.run(
      'INSERT INTO tasks (user_id, title, description, status, priority) VALUES (?, ?, ?, ?, ?)',
      req.user.id,
      title.trim(),
      description?.trim() || null,
      taskStatus,
      taskPriority
    );

    const newTask = db.get('SELECT * FROM tasks WHERE id = ?', result.lastInsertRowid);

    res.status(201).json({ message: 'Task created successfully.', task: newTask });
  } catch (err) {
    console.error('POST /tasks error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/tasks/:id — Update an existing task
router.put('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const taskId = parseInt(req.params.id, 10);
    const { title, description, status, priority } = req.body;

    // Check task exists and belongs to user
    const existingTask = db.get(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      taskId,
      req.user.id
    );

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    const validStatuses = ['todo', 'in_progress', 'completed'];
    const validPriorities = ['High', 'Medium', 'Low'];
    
    const updatedTitle       = title?.trim()                                             || existingTask.title;
    const updatedDescription = description !== undefined ? (description?.trim() || null) : existingTask.description;
    const updatedStatus      = status && validStatuses.includes(status) ? status         : existingTask.status;
    const updatedPriority    = priority && validPriorities.includes(priority) ? priority : existingTask.priority;

    if (!updatedTitle) {
      return res.status(400).json({ error: 'Task title cannot be empty.' });
    }

    db.run(
      'UPDATE tasks SET title = ?, description = ?, status = ?, priority = ? WHERE id = ? AND user_id = ?',
      updatedTitle,
      updatedDescription,
      updatedStatus,
      updatedPriority,
      taskId,
      req.user.id
    );

    const updatedTask = db.get('SELECT * FROM tasks WHERE id = ?', taskId);
    res.json({ message: 'Task updated successfully.', task: updatedTask });
  } catch (err) {
    console.error('PUT /tasks/:id error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/tasks/:id — Delete a task
router.delete('/:id', async (req, res) => {
  try {
    const db = await getDb();
    const taskId = parseInt(req.params.id, 10);

    const existingTask = db.get(
      'SELECT * FROM tasks WHERE id = ? AND user_id = ?',
      taskId,
      req.user.id
    );

    if (!existingTask) {
      return res.status(404).json({ error: 'Task not found.' });
    }

    db.run('DELETE FROM tasks WHERE id = ? AND user_id = ?', taskId, req.user.id);
    res.json({ message: 'Task deleted successfully.' });
  } catch (err) {
    console.error('DELETE /tasks/:id error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
