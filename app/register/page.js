'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function RegisterPage() {
  const router = useRouter();

  // Two screens: 'form' → 'verify'
  const [screen, setScreen] = useState('form');

  // Form state
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
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

  // Verification state
  const [userId, setUserId] = useState('');
  const [verifyEmail, setVerifyEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [code, setCode] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState('');

  async function handleRegister(e) {
    e.preventDefault();
    setError('');

    if (!companyName.trim()) { setError('Company name is required.'); return; }
    if (!contactPerson.trim()) { setError('Contact person name is required.'); return; }
    if (!email.trim()) { setError('Email is required.'); return; }
    if (!phone.trim()) { setError('Phone is required.'); return; }
    if (!password) { setError('Password is required.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password,
          notifyEmail, notifySMS, notifyWhatsApp, notifyWeChat,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Registration failed.');
        setLoading(false);
        return;
      }

      // Move to verification screen
      setUserId(data.userId);
      setVerifyEmail(data.email);
      setEmailSent(data.emailSent);
      setScreen('verify');
      setLoading(false);
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
        body: JSON.stringify({ userId, code: code.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setVerifyError(data.error || 'Verification failed.');
        setVerifyLoading(false);
        return;
      }

      // Success — redirect to login
      router.push('/login?verified=1');
    } catch (err) {
      setVerifyError('Connection error. Please try again.');
      setVerifyLoading(false);
    }
  }

  async function handleResend() {
    setResendMsg('');
    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/resend-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!data.success) {
        setResendMsg('❌ ' + (data.error || 'Failed to resend.'));
        setResendLoading(false);
        return;
      }
      setResendMsg('✅ New code sent to ' + verifyEmail);
      setResendLoading(false);
    } catch (err) {
      setResendMsg('❌ Connection error.');
      setResendLoading(false);
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
          maxWidth: '500px',
          width: '100%'
        }}>

          {/* ====================== FORM SCREEN ====================== */}
          {screen === 'form' && (
            <>
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

              <form onSubmit={handleRegister}>
                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Company Name *</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g., ABC Trading Ltd" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Contact Person (Full Name) *</label>
                  <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="e.g., John Smith" style={inputStyle} />
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={labelStyle}>Email Address *</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" style={inputStyle} />
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
                        position: 'absolute', right: '12px', top: '50%',
                        transform: 'translateY(-50%)', background: 'transparent',
                        border: 'none', cursor: 'pointer', fontSize: '1.2rem',
                        padding: '4px', color: '#6C757D', lineHeight: 1
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
            </>
          )}

          {/* ====================== VERIFY SCREEN ====================== */}
          {screen === 'verify' && (
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

              <h2 style={{ fontSize: '1.75rem', color: '#003366', marginBottom: '8px', textAlign: 'center', fontWeight: 800 }}>
                Verify Your Email
              </h2>

              <p style={{ textAlign: 'center', color: '#6C757D', marginBottom: '25px', fontSize: '0.95rem', lineHeight: 1.6 }}>
                {emailSent
                  ? <>We sent a <b>6-digit code</b> to<br /><b style={{ color: '#003366' }}>{verifyEmail}</b></>
                  : <>We couldn&apos;t send the email to <b>{verifyEmail}</b>. Please click Resend below.</>}
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
                  <label style={{ ...labelStyle, textAlign: 'center', display: 'block', marginBottom: '12px' }}>
                    Enter 6-Digit Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    autoComplete="one-time-code"
                    inputMode="numeric"
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
                  {verifyLoading ? 'Verifying...' : 'Verify & Activate Account'}
                </button>
              </form>

              <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.9rem', color: '#6C757D' }}>
                Didn&apos;t receive the code?{' '}
                <button
                  onClick={handleResend}
                  disabled={resendLoading}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#FF6B00',
                    fontWeight: 700,
                    cursor: resendLoading ? 'not-allowed' : 'pointer',
                    textDecoration: 'underline',
                    fontSize: '0.9rem',
                    fontFamily: 'inherit',
                    padding: 0
                  }}
                >
                  {resendLoading ? 'Sending...' : 'Resend Code'}
                </button>
              </div>

              <div style={{ textAlign: 'center', marginTop: '15px', fontSize: '0.85rem', color: '#999' }}>
                Wrong email?{' '}
                <button
                  onClick={() => setScreen('form')}
                  style={{
                    background: 'transparent', border: 'none',
                    color: '#6C757D', textDecoration: 'underline',
                    cursor: 'pointer', fontSize: '0.85rem',
                    fontFamily: 'inherit', padding: 0
                  }}
                >
                  Go back
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
