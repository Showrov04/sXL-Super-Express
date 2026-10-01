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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Unverified user state
  const [needsVerify, setNeedsVerify] = useState(null); // { userId, email }
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setResendMsg('');
    setNeedsVerify(null);

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
        // Special case — user needs to verify
        if (data.needsVerification) {
          setNeedsVerify({ userId: data.userId, email: data.email });
          setLoading(false);
          return;
        }
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

  async function handleResend() {
    if (!needsVerify) return;
    setResendMsg('');
    setResending(true);
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: needsVerify.userId }),
      });
      const data = await res.json();
      if (!data.success) {
        setResendMsg('❌ ' + (data.error || 'Failed to resend.'));
        setResending(false);
        return;
      }
      setResendMsg('✅ New code sent to ' + needsVerify.email);
      setResending(false);
    } catch (err) {
      setResendMsg('❌ Connection error.');
      setResending(false);
    }
  }

  function goToVerify() {
    if (!needsVerify) return;
    // Navigate to register page with the verify screen prefilled via query params
    // We'll just tell user to verify through the register page
    router.push('/register');
  }

  const inputStyle = {
    width: '100%',
    padding: '13px 15px',
    fontSize: '0.95rem',
    border: '2px solid #E9ECEF',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box'
  };

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

          {/* ====================== UNVERIFIED USER BANNER ====================== */}
          {needsVerify && (
            <div style={{
              padding: '18px 20px',
              background: '#FFF5EB',
              border: '2px solid #FF6B00',
              borderRadius: '10px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.5rem' }}>⚠️</span>
                <div style={{ fontWeight: 800, color: '#8B4500', fontSize: '0.95rem' }}>
                  Email Not Verified
                </div>
              </div>

              <p style={{ color: '#6C757D', fontSize: '0.85rem', marginBottom: '15px', lineHeight: 1.5 }}>
                Your account for <b>{needsVerify.email}</b> hasn&apos;t been verified yet.
                Please verify your email to continue.
              </p>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  onClick={goToVerify}
                  style={{
                    padding: '10px 18px',
                    background: '#FF6B00',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  Verify My Email
                </button>
                <button
                  onClick={handleResend}
                  disabled={resending}
                  style={{
                    padding: '10px 18px',
                    background: 'transparent',
                    color: '#003366',
                    border: '2px solid #E9ECEF',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '0.85rem',
                    cursor: resending ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  {resending ? 'Sending...' : 'Resend Code'}
                </button>
              </div>

              {resendMsg && (
                <div style={{
                  marginTop: '12px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  background: resendMsg.startsWith('✅') ? '#D4EDDA' : '#F8D7DA',
                  color: resendMsg.startsWith('✅') ? '#155724' : '#721C24'
                }}>
                  {resendMsg}
                </div>
              )}

              <p style={{ color: '#999', fontSize: '0.8rem', marginTop: '12px', marginBottom: 0 }}>
                💡 The verification screen will ask for the 6-digit code.
              </p>
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
                style={inputStyle}
              />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  style={{ ...inputStyle, paddingRight: '45px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '1.2rem',
                    padding: '4px',
                    color: '#6C757D',
                    lineHeight: 1
                  }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
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
                fontFamily: 'inherit'
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
