import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import api from '../api/axios';

/* ── 3D Floating Logo Component ── */
function ZenithLogo({ size = 'large' }) {
  const isLarge = size === 'large';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      gap: isLarge ? '14px' : '10px',
      marginBottom: isLarge ? 'var(--sp-8)' : 0,
    }}>
      {/* 3D animated diamond icon */}
      <div style={{
        width: isLarge ? 52 : 36,
        height: isLarge ? 52 : 36,
        background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
        borderRadius: isLarge ? '16px' : '10px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: isLarge ? '1.5rem' : '1rem',
        color: '#fff',
        boxShadow: '0 6px 24px var(--clr-primary-glow)',
        animation: 'float 4s ease-in-out infinite, glowPulse 3s ease-in-out infinite',
        transform: 'perspective(400px) rotateY(-5deg) rotateX(5deg)',
        transformStyle: 'preserve-3d',
      }}>
        ◆
      </div>
      <span style={{
        fontSize: isLarge ? '1.8rem' : '1.2rem',
        fontWeight: 800,
        background: 'linear-gradient(135deg, var(--clr-text) 30%, var(--clr-primary) 70%, var(--clr-accent))',
        backgroundSize: '200% auto',
        animation: 'gradientShift 4s ease infinite',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        letterSpacing: '-0.03em',
      }}>
        Zenith
      </span>
    </div>
  );
}

export { ZenithLogo };

export default function AuthPage() {
  const [mode, setMode]       = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [form, setForm]       = useState({ email: '', password: '', first_name: '', last_name: '', confirm_password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate  = useNavigate();

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setForm({ email: '', password: '', first_name: '', last_name: '', confirm_password: '' });
  };

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (mode === 'signup') {
        const pwdRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d\s]).{8,16}$/;
        if (!pwdRegex.test(form.password)) {
          setError('Password must be 8-16 chars, with 1 uppercase, 1 lowercase, 1 number, and 1 special symbol.');
          setLoading(false);
          return;
        }
        if (form.password !== form.confirm_password) {
          setError('Passwords do not match.');
          setLoading(false);
          return;
        }
        const { data } = await api.post('/auth/register', {
          email: form.email,
          password: form.password,
          first_name: form.first_name,
          last_name: form.last_name,
        });
        login(data.token, data.user);
      } else {
        const { data } = await api.post('/auth/login', {
          email: form.email,
          password: form.password,
        });
        login(data.token, data.user);
      }
      navigate('/dashboard');
    } catch (err) {
      const backendMessage = err.response?.data?.error || err.response?.data?.message;
      const fallbackMessage = err.message === 'Network Error'
        ? 'Unable to reach the server. Please check the backend URL and try again.'
        : 'Something went wrong. Please try again.';
      setError(backendMessage || fallbackMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'var(--sp-4)',
      perspective: 'var(--perspective)',
    }}>
      {/* Theme toggle — top right */}
      <button
        id="auth-theme-toggle-btn"
        className="theme-toggle"
        onClick={toggleTheme}
        title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        style={{
          position: 'fixed', top: 'var(--sp-5)', right: 'var(--sp-5)', zIndex: 50,
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        <span className="theme-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
        {theme === 'dark' ? 'Light' : 'Dark'}
      </button>

      <div style={{
        width: '100%', maxWidth: '440px',
        animation: 'cardEnter 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)',
      }}>
        {/* Animated Logo */}
        <ZenithLogo size="large" />

        {/* Card */}
        <div className="glass-card" style={{ padding: 'var(--sp-8)' }}>
          {/* Tab toggle */}
          <div style={{
            display: 'flex',
            background: 'var(--clr-bg)',
            borderRadius: 'var(--radius-md)',
            padding: 4, marginBottom: 'var(--sp-8)', gap: 4,
          }}>
            <button
              style={{
                flex: 1, padding: 'var(--sp-3)', border: 'none',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all var(--transition-spring)',
                background: mode === 'login'
                  ? 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))'
                  : 'transparent',
                color: mode === 'login' ? '#fff' : 'var(--clr-text-muted)',
                boxShadow: mode === 'login' ? '0 2px 12px var(--clr-primary-glow)' : 'none',
                transform: mode === 'login' ? 'scale(1)' : 'scale(0.98)',
              }}
              onClick={() => switchMode('login')}
            >
              Login
            </button>
            <button
              style={{
                flex: 1, padding: 'var(--sp-3)', border: 'none',
                borderRadius: 'calc(var(--radius-md) - 2px)',
                fontFamily: 'var(--font-sans)', fontWeight: 600, fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all var(--transition-spring)',
                background: mode === 'signup'
                  ? 'linear-gradient(135deg, var(--clr-primary), var(--clr-primary-dark))'
                  : 'transparent',
                color: mode === 'signup' ? '#fff' : 'var(--clr-text-muted)',
                boxShadow: mode === 'signup' ? '0 2px 12px var(--clr-primary-glow)' : 'none',
                transform: mode === 'signup' ? 'scale(1)' : 'scale(0.98)',
              }}
              onClick={() => switchMode('signup')}
            >
              Sign Up
            </button>
          </div>

          <h2 style={{ marginBottom: 'var(--sp-2)', fontSize: '1.5rem', fontWeight: 700 }}>
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p style={{ marginBottom: 'var(--sp-6)', color: 'var(--clr-text-muted)', fontSize: '0.9rem' }}>
            {mode === 'login'
              ? 'Sign in to reach your Zenith'
              : 'Start your journey to peak productivity'}
          </p>

          {/* Error alert */}
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 'var(--sp-4)' }}>
              ⚠ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-5)' }} noValidate>
            {/* Conditional Signup Fields */}
            {mode === 'signup' && (
              <>
                <div style={{ display: 'flex', gap: 'var(--sp-4)' }}>
                  {/* First Name */}
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="auth-first-name">First Name</label>
                    <input
                      id="auth-first-name" name="first_name" type="text"
                      className="form-input" placeholder="First Name"
                      value={form.first_name} onChange={handleChange} required
                    />
                  </div>
                  {/* Last Name */}
                  <div className="form-group" style={{ flex: 1 }}>
                    <label className="form-label" htmlFor="auth-last-name">Last Name</label>
                    <input
                      id="auth-last-name" name="last_name" type="text"
                      className="form-input" placeholder="Last Name"
                      value={form.last_name} onChange={handleChange} required
                    />
                  </div>
                </div>

              </>
            )}

            {/* Email (Used for both Login & Signup) */}
            <div className="form-group">
              <label className="form-label" htmlFor="auth-email">Email</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 'var(--sp-4)', top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--clr-text-faint)',
                  fontSize: '0.95rem', pointerEvents: 'none',
                }}>✉️</span>
                <input
                  id="auth-email" name="email" type="email"
                  className="form-input" style={{ paddingLeft: '2.5rem' }}
                  placeholder="Enter your email"
                  value={form.email} onChange={handleChange}
                  autoComplete="email" required
                />
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <label className="form-label" htmlFor="auth-password">Password</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 'var(--sp-4)', top: '50%',
                  transform: 'translateY(-50%)', color: 'var(--clr-text-faint)',
                  fontSize: '0.95rem', pointerEvents: 'none',
                }}>🔒</span>
                <input
                  id="auth-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  style={{ paddingLeft: '2.5rem', paddingRight: '2.5rem' }}
                  placeholder={mode === 'signup' ? '8-16 chars, 1 uppercase, 1 special' : 'Enter your password'}
                  value={form.password}
                  onChange={handleChange}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  required
                />
                <button type="button" onClick={() => setShowPassword(prev => !prev)}
                  style={{
                    position: 'absolute', right: 'var(--sp-3)', top: '50%',
                    transform: 'translateY(-50%)', background: 'transparent', border: 'none',
                    cursor: 'pointer', fontSize: '1rem', color: 'var(--clr-text-faint)'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* Confirm Password (Signup only) */}
            {mode === 'signup' && (
              <div className="form-group">
                <label className="form-label" htmlFor="auth-confirm-password">Confirm Password</label>
                <div style={{ position: 'relative' }}>
                  <span style={{
                    position: 'absolute', left: 'var(--sp-4)', top: '50%',
                    transform: 'translateY(-50%)', color: 'var(--clr-text-faint)',
                    fontSize: '0.95rem', pointerEvents: 'none',
                  }}>🔒</span>
                  <input
                    id="auth-confirm-password" name="confirm_password" type={showConfirmPassword ? 'text' : 'password'}
                    className={`form-input ${form.confirm_password && form.password !== form.confirm_password ? 'error' : ''}`}
                    style={{
                      paddingLeft: '2.5rem',
                      paddingRight: '2.5rem',
                      borderColor: form.confirm_password && form.password !== form.confirm_password ? 'var(--clr-error)' : undefined,
                    }}
                    placeholder="Confirm your password"
                    value={form.confirm_password} onChange={handleChange} required
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(prev => !prev)}
                    style={{
                      position: 'absolute', right: 'var(--sp-3)', top: '50%',
                      transform: 'translateY(-50%)', background: 'transparent', border: 'none',
                      cursor: 'pointer', fontSize: '1rem', color: 'var(--clr-text-faint)'
                    }}
                    title={showConfirmPassword ? 'Hide password' : 'Show password'}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {form.confirm_password && form.password !== form.confirm_password && (
                  <div style={{ color: 'var(--clr-error)', fontSize: '0.8rem', marginTop: 'var(--sp-2)' }}>
                    Passwords do not match
                  </div>
                )}
              </div>
            )}

            <button
              id="auth-submit-btn"
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
            >
              {loading ? <><span className="spinner" /> Processing…</> : (
                mode === 'login' ? '→  Sign In' : '◆  Create Account'
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', color: 'var(--clr-text-muted)', fontSize: '0.85rem', marginTop: 'var(--sp-4)' }}>
            {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
            <button
              style={{
                color: 'var(--clr-primary)', background: 'none', border: 'none',
                cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                textDecoration: 'underline', fontFamily: 'var(--font-sans)',
              }}
              onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
            >
              {mode === 'login' ? 'Sign up' : 'Sign in'}
            </button>
          </p>

          {/* OR Divider */}
          <div style={{
            display: 'flex', alignItems: 'center', margin: 'var(--sp-6) 0',
            color: 'var(--clr-text-faint)', fontSize: '0.8rem', fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.05em'
          }}>
            <div style={{ flex: 1, height: 1, background: 'var(--clr-border)' }} />
            <span style={{ padding: '0 var(--sp-4)' }}>Or continue with</span>
            <div style={{ flex: 1, height: 1, background: 'var(--clr-border)' }} />
          </div>

          {/* Social Buttons */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
            <a href="https://accounts.google.com/signin" className="btn btn-ghost" style={{ padding: 'var(--sp-3)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} title="Continue with Google">
              <img src="https://upload.wikimedia.org/wikipedia/commons/c/c1/Google_%22G%22_logo.svg" alt="Google" style={{ width: 20, height: 20 }} />
            </a>
            <a href="https://www.facebook.com/login/" className="btn btn-ghost" style={{ padding: 'var(--sp-3)', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} title="Continue with Facebook">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            <a href="https://appleid.apple.com/sign-in" className="btn btn-ghost" style={{ padding: 'var(--sp-3)', fontSize: '1.2rem', color: 'var(--clr-text)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} title="Continue with Apple">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.19 2.31-.88 3.5-.8 1.95.14 3.19.95 3.99 2.28-3.32 2.01-2.79 6.27.46 7.41-.7 1.54-1.87 3.32-3.03 4.28zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
              </svg>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
