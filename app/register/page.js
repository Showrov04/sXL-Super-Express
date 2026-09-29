'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySMS, setNotifySMS] = useState(true);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [notifyWeChat, setNotifyWeChat] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name || !email || !phone || !password) {
      setError('All fields marked * are required.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name, email, phone, password,
          notifyEmail, notifySMS, notifyWhatsApp, notifyWeChat
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      localStorage.setItem('sxl_token', data.token);
      localStorage.setItem('sxl_user', JSON.stringify(data.user));
      window.dispatchEvent(new Event('sxl-auth-change'));

      router.push('/dashboard');
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
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

  const passwordInputStyle = {
    ...inputStyle,
    paddingRight: '45px'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#343A40',
    marginBottom: '6px'
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
          maxWidth: '480px',
          width: '100%'
        }}>
          <h2 style={{ fontSize: '1.75rem', color: '#003366', marginBottom: '8px', textAlign: 'center', fontWeight: 800 }}>
            Create Account
          </h2>
          <p style={{ textAlign: 'center', color: '#6C757D', marginBottom: '30px', fontSize: '0.95rem' }}>
            Start shipping with sXL today
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
              <label style={labelStyle}>Full Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Email Address *</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Phone Number *</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+852 0000 0000" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Password * (min 6 chars)</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  style={passwordInputStyle}
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

            <div style={{ marginBottom: '20px' }}>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>
                Notification Preferences
              </label>
              {[
                { id: 'email', label: '📧 Email', value: notifyEmail, setter: setNotifyEmail },
                { id: 'sms', label: '📱 SMS', value: notifySMS, setter: setNotifySMS },
                { id: 'whatsapp', label: '💬 WhatsApp', value: notifyWhatsApp, setter: setNotifyWhatsApp },
                { id: 'wechat', label: '🟢 WeChat', value: notifyWeChat, setter: setNotifyWeChat },
              ].map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="checkbox"
                    id={'notif-' + p.id}
                    checked={p.value}
                    onChange={(e) => p.setter(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#FF6B00', cursor: 'pointer' }}
                  />
                  <label htmlFor={'notif-' + p.id} style={{ cursor: 'pointer', fontSize: '0.9rem', color: '#343A40' }}>
                    {p.label}
                  </label>
                </div>
              ))}
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
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#6C757D' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: '#FF6B00', fontWeight: 600 }}>
              Login here
            </Link>
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
