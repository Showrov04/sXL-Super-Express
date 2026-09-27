'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [error, setError] = useState('');

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notifyEmail, setNotifyEmail] = useState(true);
  const [notifySMS, setNotifySMS] = useState(true);
  const [notifyWhatsApp, setNotifyWhatsApp] = useState(true);
  const [notifyWeChat, setNotifyWeChat] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sxl_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    try {
      const u = JSON.parse(stored);
      setUser(u);
      setName(u.name || '');
      setPhone(u.phone || '');
    } catch (e) {
      router.push('/login');
    }
    setLoading(false);
  }, [router]);

  function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!name.trim() || !phone.trim()) {
      setError('Name and Phone are required.');
      return;
    }

    setSaving(true);
    const updated = { ...user, name: name.trim(), phone: phone.trim() };
    localStorage.setItem('sxl_user', JSON.stringify(updated));
    setUser(updated);
    window.dispatchEvent(new Event('sxl-auth-change'));
    setSuccessMsg('Profile updated successfully!');
    setSaving(false);
  }

  if (loading || !user) {
    return (
      <>
        <Header />
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ width: '45px', height: '45px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        <Footer />
      </>
    );
  }

  const inputStyle = {
    width: '100%', padding: '13px 15px', fontSize: '0.95rem',
    border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box'
  };
  const labelStyle = {
    display: 'block', fontSize: '0.85rem', fontWeight: 600,
    color: '#343A40', marginBottom: '6px'
  };

  return (
    <>
      <Header />

      <div style={{ maxWidth: '700px', margin: '40px auto', padding: '0 20px 60px' }}>
        <div style={{ marginBottom: '20px' }}>
          <Link href="/dashboard" style={{
            display: 'inline-block', padding: '10px 18px', background: 'transparent',
            color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px',
            fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem'
          }}>Back to Dashboard</Link>
        </div>

        <h1 style={{ fontSize: '2rem', color: '#003366', fontWeight: 800, marginBottom: '25px' }}>
          My Account
        </h1>

        <div style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <h3 style={{ color: '#003366', fontSize: '1.2rem', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5' }}>
            Profile Information
          </h3>

          {error && (
            <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}
          {successMsg && (
            <div style={{ background: '#D4EDDA', color: '#155724', borderLeft: '4px solid #28A745', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem' }}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Account ID</label>
              <input type="text" value={user.userId || ''} disabled style={{ ...inputStyle, background: '#F1F3F5', color: '#6C757D' }} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Email (cannot change)</label>
              <input type="email" value={user.email || ''} disabled style={{ ...inputStyle, background: '#F1F3F5', color: '#6C757D' }} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Full Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Phone *</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} style={inputStyle} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ ...labelStyle, marginBottom: '10px' }}>Notification Preferences</label>
              {[
                { id: 'email', label: 'Email', value: notifyEmail, setter: setNotifyEmail },
                { id: 'sms', label: 'SMS', value: notifySMS, setter: setNotifySMS },
                { id: 'whatsapp', label: 'WhatsApp', value: notifyWhatsApp, setter: setNotifyWhatsApp },
                { id: 'wechat', label: 'WeChat', value: notifyWeChat, setter: setNotifyWeChat },
              ].map((p) => (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                  <input type="checkbox" id={'notif-' + p.id} checked={p.value} onChange={(e) => p.setter(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#FF6B00', cursor: 'pointer' }} />
                  <label htmlFor={'notif-' + p.id} style={{ cursor: 'pointer', fontSize: '0.9rem' }}>{p.label}</label>
                </div>
              ))}
            </div>

            <button type="submit" disabled={saving} style={{
              width: '100%', padding: '14px 26px', background: '#FF6B00', color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem',
              cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1,
              fontFamily: 'inherit'
            }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        <div style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginTop: '20px' }}>
          <h3 style={{ color: '#003366', fontSize: '1.2rem', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5' }}>
            Change Password
          </h3>
          <div style={{ background: '#FFF5EB', borderLeft: '4px solid #FF6B00', padding: '15px', borderRadius: '8px', fontSize: '0.9rem', color: '#6C757D' }}>
            Password change feature is coming soon. Please contact admin to reset your password for now.
          </div>
        </div>
      </div>

      <Footer />
    </>
  );
}
