import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ZenithLogo } from './AuthPage';
import api from '../api/axios';

/* ─────────── helpers ─────────── */
const STATUS_LABELS = { todo: 'To Do', in_progress: 'In Progress', completed: 'Completed' };
const STATUS_BADGE  = { todo: 'badge-todo', in_progress: 'badge-progress', completed: 'badge-done' };
const STATUS_DOT    = { todo: 'var(--clr-todo)', in_progress: 'var(--clr-progress)', completed: 'var(--clr-done)' };
const PRIORITY_COLORS = { Low: '#10b981', Medium: '#f59e0b', High: '#ef4444' };
const PRIORITY_EMOJI  = { Low: '🟢', Medium: '🟡', High: '🔴' };

/* ─────────── Task Modal (Add / Edit) ─────────── */
function TaskModal({ task, onClose, onSave }) {
  const isEdit = Boolean(task?.id);
  const [form, setForm]       = useState({
    title:       task?.title       || '',
    description: task?.description || '',
    status:      task?.status      || 'todo',
    priority:    task?.priority    || 'Medium',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('Title is required.'); return; }
    setLoading(true);
    try {
      await onSave(form);
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save task.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <h3>{isEdit ? '✏️ Edit Task' : '◆ New Task'}</h3>
          <button className="btn-icon" onClick={onClose} title="Close" id="modal-close-btn">✕</button>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>⚠ {error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="task-title">Title *</label>
            <input
              id="task-title"
              name="title"
              className={`form-input${!form.title && error ? ' error' : ''}`}
              placeholder="What needs to be done?"
              value={form.title}
              onChange={handleChange}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-description">Description</label>
            <textarea
              id="task-description"
              name="description"
              className="form-textarea"
              placeholder="Add more details (optional)"
              value={form.description}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-status">Status</label>
            <select
              id="task-status"
              name="status"
              className="form-select"
              value={form.status}
              onChange={handleChange}
            >
              <option value="todo">📋 To Do</option>
              <option value="in_progress">⚡ In Progress</option>
              <option value="completed">✅ Completed</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="task-priority">Priority</label>
            <select
              id="task-priority"
              name="priority"
              className="form-select"
              value={form.priority}
              onChange={handleChange}
            >
              <option value="Low">🟢 Low</option>
              <option value="Medium">🟡 Medium</option>
              <option value="High">🔴 High</option>
            </select>
          </div>

          <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose} id="modal-cancel-btn">Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading} id="modal-save-btn">
              {loading ? <><span className="spinner" /> Saving…</> : (isEdit ? 'Save Changes' : '+ Add Task')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─────────── Confirm Delete Modal ─────────── */
function ConfirmModal({ taskTitle, onConfirm, onCancel }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-box" style={{ maxWidth: 380 }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--sp-6)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: 'var(--sp-4)' }}>🗑️</div>
          <h3 style={{ marginBottom: 'var(--sp-2)' }}>Delete Task?</h3>
          <p style={{ color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
            "<strong style={{ color: 'var(--clr-text)' }}>{taskTitle}</strong>" will be permanently removed.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          <button className="btn btn-ghost btn-full" onClick={onCancel} id="confirm-cancel-btn">Cancel</button>
          <button className="btn btn-danger btn-full" onClick={onConfirm} id="confirm-delete-btn">Delete</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── 3D Task Card ─────────── */
function TaskCard({ task, onEdit, onDelete, index }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -4;
    const rotateY = ((x - centerX) / centerX) * 4;
    card.style.transform = `perspective(600px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform = 'perspective(600px) rotateX(0deg) rotateY(0deg) translateY(0)';
  };

  return (
    <div
      ref={cardRef}
      id={`task-card-${task.id}`}
      className="task-card"
      style={{
        animation: `cardEnter 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) ${index * 0.06}s both`,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Status accent line */}
      <div className="task-card-accent" style={{ background: STATUS_DOT[task.status] }} />

      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: 'var(--sp-4)', marginTop: 'var(--sp-2)',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4 style={{
            marginBottom: task.description ? 'var(--sp-2)' : 'var(--sp-3)',
            color: task.status === 'completed' ? 'var(--clr-text-muted)' : 'var(--clr-text)',
            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
            wordBreak: 'break-word',
          }}>
            {task.title}
          </h4>
          {task.description && (
            <p style={{
              fontSize: '0.85rem', color: 'var(--clr-text-muted)',
              marginBottom: 'var(--sp-3)', lineHeight: 1.5, wordBreak: 'break-word',
            }}>
              {task.description}
            </p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <span className={`badge ${STATUS_BADGE[task.status]}`}>
              {STATUS_LABELS[task.status]}
            </span>
            <span className="badge" style={{ background: 'var(--clr-surface-2)', color: PRIORITY_COLORS[task.priority] || '#f59e0b', border: `1px solid ${PRIORITY_COLORS[task.priority] || '#f59e0b'}44` }}>
              {PRIORITY_EMOJI[task.priority] || '🟡'} {task.priority || 'Medium'}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 'var(--sp-1)', flexShrink: 0 }}>
          <button
            className="btn-icon"
            onClick={() => onEdit(task)}
            title="Edit task"
            id={`edit-task-${task.id}`}
            style={{ fontSize: '0.85rem' }}
          >
            ✏️
          </button>
          <button
            className="btn-icon"
            onClick={() => onDelete(task)}
            title="Delete task"
            id={`delete-task-${task.id}`}
            style={{ fontSize: '0.85rem' }}
          >
            🗑️
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─────────── Skeleton Card ─────────── */
function SkeletonCard() {
  return (
    <div style={{
      background: 'var(--clr-surface)',
      border: '1px solid var(--clr-border)',
      borderRadius: 'var(--radius-lg)',
      padding: 'var(--sp-5)',
    }}>
      <div className="skeleton" style={{ height: 16, width: '60%', marginBottom: 10 }} />
      <div className="skeleton" style={{ height: 12, width: '80%', marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 12, width: '40%' }} />
    </div>
  );
}

/* ─────────── 3D Stat Card ─────────── */
function StatCard({ label, count, color, emoji }) {
  return (
    <div className="stat-card" style={{ borderColor: `${color}22` }}>
      <div style={{
        width: 46, height: 46,
        background: `${color}18`,
        borderRadius: 'var(--radius-md)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '1.3rem',
        flexShrink: 0,
        transition: 'transform var(--transition-spring)',
      }}>
        {emoji}
      </div>
      <div>
        <div style={{ fontSize: '1.6rem', fontWeight: 800, color, lineHeight: 1, letterSpacing: '-0.02em' }}>{count}</div>
        <div style={{ fontSize: '0.76rem', color: 'var(--clr-text-muted)', marginTop: 2, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

/* ─────────── Main Dashboard ─────────── */
export default function Dashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const [tasks, setTasks]               = useState([]);
  const [filter, setFilter]             = useState('all');
  const [searchQuery, setSearchQuery]   = useState('');
  const [sortBy, setSortBy]             = useState('newest');
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTask, setEditTask]         = useState(null);
  const [deleteTask, setDeleteTask]     = useState(null);
  const [toast, setToast]               = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  };

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = filter !== 'all' ? { status: filter } : {};
      const { data } = await api.get('/tasks', { params });
      setTasks(data.tasks);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError('Failed to load tasks. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  /* CRUD handlers */
  const handleAdd = async (form) => {
    const { data } = await api.post('/tasks', form);
    setTasks(prev => [data.task, ...prev]);
    showToast('◆ Task created!');
  };

  const handleEdit = async (form) => {
    const { data } = await api.put(`/tasks/${editTask.id}`, form);
    setTasks(prev => prev.map(t => t.id === editTask.id ? data.task : t));
    showToast('✔ Task updated!');
  };

  const handleDelete = async () => {
    if (!deleteTask) return;
    await api.delete(`/tasks/${deleteTask.id}`);
    setTasks(prev => prev.filter(t => t.id !== deleteTask.id));
    setDeleteTask(null);
    showToast('🗑 Task deleted.');
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  /* Derived stats */
  const stats = {
    todo:        tasks.filter(t => t.status === 'todo').length,
    in_progress: tasks.filter(t => t.status === 'in_progress').length,
    completed:   tasks.filter(t => t.status === 'completed').length,
  };

  const filteredTasks = tasks.filter(t => {
    if (searchQuery.trim() === '') return true;
    const q = searchQuery.toLowerCase();
    return t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q));
  }).sort((a, b) => {
    if (sortBy === 'newest') return b.id - a.id;
    if (sortBy === 'oldest') return a.id - b.id;
    return 0;
  });

  return (
    <div style={{ minHeight: '100vh' }}>
      {/* ── Header ── */}
      <header style={{
        borderBottom: '1px solid var(--clr-border)',
        backdropFilter: 'blur(20px) saturate(1.5)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
        position: 'sticky', top: 0, zIndex: 100,
        background: 'color-mix(in srgb, var(--clr-bg) 88%, transparent)',
      }}>
        <div style={{
          maxWidth: 1100, margin: '0 auto',
          padding: 'var(--sp-4) var(--sp-6)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          {/* Logo */}
          <ZenithLogo size="small" />

          {/* User + Theme Toggle + Logout */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
            {/* User chip */}
            <div style={{
              display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
              padding: 'var(--sp-2) var(--sp-4)',
              background: 'var(--clr-surface)',
              borderRadius: 'var(--radius-full)',
              border: '1px solid var(--clr-border)',
            }}>
              <div style={{
                width: 28, height: 28,
                background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: '#fff',
              }}>
                {user?.first_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
              </div>
              <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--clr-text)' }}>
                {user?.first_name ? `${user.first_name} ${user.last_name}` : user?.email}
              </span>
            </div>

            {/* Dark / Light Mode Toggle */}
            <button
              id="theme-toggle-btn"
              className="theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              <span className="theme-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
              {theme === 'dark' ? 'Light' : 'Dark'}
            </button>

            <button
              id="logout-btn"
              className="btn btn-ghost btn-sm"
              onClick={handleLogout}
            >
              ↩ Logout
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: 'var(--sp-8) var(--sp-6)' }}>
        {/* Page Title */}
        <div style={{
          marginBottom: 'var(--sp-8)',
          animation: 'slideUp 0.5s ease both',
        }}>
          <h1 style={{ marginBottom: 'var(--sp-2)' }}>My Tasks</h1>
          <p>Manage and track all your tasks in one place.</p>
        </div>

        {/* Stats Row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
          gap: 'var(--sp-4)',
          marginBottom: 'var(--sp-8)',
        }}>
          <StatCard label="To Do"       count={stats.todo}        color="var(--clr-todo)"     emoji="📋" />
          <StatCard label="In Progress" count={stats.in_progress} color="var(--clr-progress)"  emoji="⚡" />
          <StatCard label="Completed"   count={stats.completed}   color="var(--clr-done)"      emoji="✅" />
          <StatCard label="Total"       count={tasks.length}      color="var(--clr-accent)"    emoji="📊" />
        </div>

        {/* Toolbar: Filter + Add */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 'var(--sp-6)', flexWrap: 'wrap', gap: 'var(--sp-4)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <label htmlFor="filter-select" style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', fontWeight: 500 }}>Filter:</label>
              <select id="filter-select" className="form-select" value={filter} onChange={e => setFilter(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
                <option value="all">All Tasks</option>
                <option value="todo">📋 To Do</option>
                <option value="in_progress">⚡ In Progress</option>
                <option value="completed">✅ Completed</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <label htmlFor="sort-select" style={{ fontSize: '0.85rem', color: 'var(--clr-text-muted)', fontWeight: 500 }}>Sort:</label>
              <select id="sort-select" className="form-select" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: 'auto', minWidth: 140 }}>
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <input 
                type="text" 
                className="form-input" 
                placeholder="🔍 Search tasks..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                style={{ width: '200px' }}
              />
            </div>
          </div>

          <button
            id="add-task-btn"
            className="btn btn-primary"
            onClick={() => setShowAddModal(true)}
          >
            + New Task
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
            ⚠ {error}
            <button className="btn btn-ghost btn-sm" onClick={fetchTasks} style={{ marginLeft: 'var(--sp-4)' }}>
              Retry
            </button>
          </div>
        )}

        {/* Tasks Grid */}
        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 'var(--sp-4)' }}>
            {[1,2,3,4,5,6].map(i => <SkeletonCard key={i} />)}
          </div>
        ) : filteredTasks.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: 'var(--sp-12)',
            color: 'var(--clr-text-muted)',
            animation: 'fadeIn 0.5s ease',
          }}>
            <div style={{
              fontSize: '4rem', marginBottom: 'var(--sp-4)', opacity: 0.4,
              animation: 'float 3s ease-in-out infinite',
            }}>📋</div>
            <h3 style={{ marginBottom: 'var(--sp-2)', color: 'var(--clr-text-muted)', fontWeight: 600 }}>
              {filter !== 'all' ? `No ${STATUS_LABELS[filter]} tasks` : 'No tasks yet'}
            </h3>
            <p style={{ fontSize: '0.9rem', marginBottom: 'var(--sp-6)' }}>
              {filter !== 'all' ? 'Try a different filter or create a new task.' : 'Create your first task to get started.'}
            </p>
            <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
              + Create Task
            </button>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: 'var(--sp-4)',
          }}>
            {filteredTasks.map((task, i) => (
              <TaskCard
                key={task.id}
                task={task}
                index={i}
                onEdit={setEditTask}
                onDelete={setDeleteTask}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── Modals ── */}
      {showAddModal && (
        <TaskModal
          task={null}
          onClose={() => setShowAddModal(false)}
          onSave={handleAdd}
        />
      )}

      {editTask && (
        <TaskModal
          task={editTask}
          onClose={() => setEditTask(null)}
          onSave={handleEdit}
        />
      )}

      {deleteTask && (
        <ConfirmModal
          taskTitle={deleteTask.title}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTask(null)}
        />
      )}

      {/* ── Toast Notification ── */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 'var(--sp-6)', right: 'var(--sp-6)',
          background: 'var(--clr-surface-2)',
          border: '1px solid var(--clr-border-hover)',
          borderRadius: 'var(--radius-lg)',
          padding: 'var(--sp-3) var(--sp-5)',
          color: 'var(--clr-text)',
          fontWeight: 500,
          fontSize: '0.9rem',
          boxShadow: 'var(--shadow-lg)',
          animation: 'slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          zIndex: 2000,
          backdropFilter: 'blur(12px)',
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}
