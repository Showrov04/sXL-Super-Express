'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Please enter email and password.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Login failed.');
        setLoading(false);
        return;
      }

      localStorage.setItem('sxl_token', data.token);
      localStorage.setItem('sxl_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('sxl-auth-change'));

      if (data.user.role === 'admin' || data.user.role === 'staff') {
        router.push('/admin');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  }

  return (
    <>
      <Header />

      <div style={{ minHeight: 'calc(100vh - 200px)', padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{
          background: 'white',
          borderRadius: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          padding: '40px 35px',
          maxWidth: '460px',
          width: '100%'
        }}>
          <h2 style={{ fontSize: '1.75rem', color: '#003366', marginBottom: '8px', textAlign: 'center', fontWeight: 800 }}>
            Welcome Back
          </h2>
          <p style={{ textAlign: 'center', color: '#6C757D', marginBottom: '30px', fontSize: '0.95rem' }}>
            Login to manage your shipments
          </p>

          {error && (
            <div style={{
              padding: '12px 16px',
              background: '#F8D7DA',
              color: '#721C24',
              borderLeft: '4px solid #DC3545',
              borderRadius: '8px',
              marginBottom: '20px',
              fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '13px 15px',
                  fontSize: '0.95rem',
                  border: '2px solid #E9ECEF',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '13px 15px',
                  fontSize: '0.95rem',
                  border: '2px solid #E9ECEF',
                  borderRadius: '8px',
                  outline: 'none',
                  transition: 'border-color 0.2s'
                }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '14px 26px',
                fontSize: '1rem',
                fontWeight: 700,
                border: 'none',
                borderRadius: '8px',
                background: '#FF6B00',
                color: 'white',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                transition: 'all 0.2s'
              }}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#6C757D' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={{ color: '#FF6B00', fontWeight: 600 }}>
              Sign up here
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
