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

  // Verify state
  const [needsVerify, setNeedsVerify] = useState(null); // { userId, email }
  const [code, setCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setVerifyError('');
    setResendMsg('');

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

  async function handleVerify(e) {
    e.preventDefault();
    setVerifyError('');

    if (!code.trim() || code.trim().length !== 6) {
      setVerifyError('Please enter the 6-digit code from your email.');
      return;
    }

    setVerifyLoading(true);
    try {
      const res = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: needsVerify.userId, code: code.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setVerifyError(data.error || 'Verification failed.');
        setVerifyLoading(false);
        return;
      }

      // Success — save auth + redirect
      if (data.token && data.user) {
        localStorage.setItem('sxl_token', data.token);
        localStorage.setItem('sxl_user', JSON.stringify(data.user));
        window.dispatchEvent(new Event('sxl-auth-change'));
        router.push('/dashboard');
      } else {
        // Already verified previously — send to login
        router.push('/login?verified=1');
      }
    } catch (err) {
      setVerifyError('Connection error. Please try again.');
      setVerifyLoading(false);
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

  function resetToForm() {
    setNeedsVerify(null);
    setCode('');
    setVerifyError('');
    setResendMsg('');
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

          {/* ====================== FORM ====================== */}
          {!needsVerify && (
            <>
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
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)', background: 'transparent',
                        border: 'none', cursor: 'pointer', fontSize: '1.2rem',
                        padding: '4px', color: '#6C757D', lineHeight: 1
                      }}
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
            </>
          )}

          {/* ====================== VERIFY SCREEN ====================== */}
          {needsVerify && (
            <>
              <div style={{
                width: '64px', height: '64px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C33 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '2rem', margin: '0 auto 20px', color: 'white',
                boxShadow: '0 8px 20px rgba(255,107,0,0.3)'
              }}>
                ✉️
              </div>

              <h2 style={{ fontSize: '1.6rem', color: '#003366', marginBottom: '8px', textAlign: 'center', fontWeight: 800 }}>
                Verify Your Email
              </h2>

              <p style={{ textAlign: 'center', color: '#6C757D', marginBottom: '25px', fontSize: '0.9rem', lineHeight: 1.6 }}>
                Please enter the 6-digit code sent to<br />
                <b style={{ color: '#003366' }}>{needsVerify.email}</b>
              </p>

              {verifyError && (
                <div style={{
                  padding: '12px 16px',
                  background: '#F8D7DA',
                  color: '#721C24',
                  borderLeft: '4px solid #DC3545',
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '0.9rem'
                }}>
                  {verifyError}
                </div>
              )}

              {resendMsg && (
                <div style={{
                  padding: '12px 16px',
                  background: resendMsg.startsWith('✅') ? '#D4EDDA' : '#F8D7DA',
                  color: resendMsg.startsWith('✅') ? '#155724' : '#721C24',
                  borderLeft: '4px solid ' + (resendMsg.startsWith('✅') ? '#28A745' : '#DC3545'),
                  borderRadius: '8px',
                  marginBottom: '20px',
                  fontSize: '0.9rem'
                }}>
                  {resendMsg}
                </div>
              )}

              <form onSubmit={handleVerify}>
                <div style={{ marginBottom: '20px' }}>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '16px',
                      fontSize: '1.8rem',
                      fontWeight: 800,
                      letterSpacing: '8px',
                      textAlign: 'center',
                      border: '2px solid #FF6B00',
                      borderRadius: '10px',
                      outline: 'none',
                      fontFamily: 'Courier New, monospace',
                      boxSizing: 'border-box',
                      background: '#FFF5EB',
                      color: '#003366'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifyLoading || code.length !== 6}
                  style={{
                    width: '100%',
                    padding: '14px 26px',
                    fontSize: '1rem',
                    fontWeight: 700,
                    border: 'none',
                    borderRadius: '8px',
                    background: '#FF6B00',
                    color: 'white',
                    cursor: (verifyLoading || code.length !== 6) ? 'not-allowed' : 'pointer',
                    opacity: (verifyLoading || code.length !== 6) ? 0.6 : 1,
                    fontFamily: 'inherit'
                  }}
                >
                  {verifyLoading ? 'Verifying...' : 'Verify & Login'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#6C757D' }}>
                Didn&apos;t receive it?{' '}
                <button
                  onClick={handleResend}
                  disabled={resending}
                  style={{
                    background: 'transparent', border: 'none',
                    color: '#FF6B00', fontWeight: 700,
                    cursor: resending ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline', fontSize: '0.9rem',
                    fontFamily: 'inherit', padding: 0
                  }}
                >
                  {resending ? 'Sending...' : 'Resend Code'}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.85rem', color: '#999' }}>
                <button
                  onClick={resetToForm}
                  style={{
                    background: 'transparent', border: 'none',
                    color: '#6C757D', textDecoration: 'underline',
                    cursor: 'pointer', fontSize: '0.85rem',
                    fontFamily: 'inherit', padding: 0
                  }}
                >
                  ← Back to login
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}
