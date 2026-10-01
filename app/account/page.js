'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function AccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Profile fields
  const [userId, setUserId] = useState('');
  const [email, setEmail] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyCity, setCompanyCity] = useState('');
  const [companyState, setCompanyState] = useState('');
  const [companyCountry, setCompanyCountry] = useState('');
  const [companyBin, setCompanyBin] = useState('');

  // Password change
  const [curPwd, setCurPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [newPwd2, setNewPwd2] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('sxl_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    loadProfile();
  }, [router]);

  async function loadProfile() {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('sxl_token');
    if (!token) { router.push('/login'); return; }

    try {
      const res = await fetch('/api/customer/profile', {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to load profile.');
        setLoading(false);
        return;
      }

      const p = data.profile;
      setUserId(p.userId || '');
      setEmail(p.email || '');
      setCompanyName(p.companyName || '');
      setContactPerson(p.contactPerson || '');
      setPhone(p.phone || '');
      setCompanyAddress(p.companyAddress || '');
      setCompanyCity(p.companyCity || '');
      setCompanyState(p.companyState || '');
      setCompanyCountry(p.companyCountry || '');
      setCompanyBin(p.companyBin || '');

      setLoading(false);
    } catch (err) {
      setError('Connection error.');
      setLoading(false);
    }
  }

  async function handleSave(e) {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!companyName.trim() || !contactPerson.trim() || !phone.trim()) {
      setError('Company Name, Contact Person, and Phone are required.');
      return;
    }

    setSaving(true);
    const token = localStorage.getItem('sxl_token');

    try {
      const res = await fetch('/api/customer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          action: 'saveInfo',
          companyName: companyName.trim(),
          contactPerson: contactPerson.trim(),
          phone: phone.trim(),
          companyAddress: companyAddress.trim(),
          companyCity: companyCity.trim(),
          companyState: companyState.trim(),
          companyCountry: companyCountry.trim(),
          companyBin: companyBin.trim(),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Save failed.');
        setSaving(false);
        return;
      }

      // Update localStorage user name if contactPerson changed
      try {
        const stored = localStorage.getItem('sxl_user');
        if (stored) {
          const u = JSON.parse(stored);
          u.name = contactPerson.trim();
          u.phone = phone.trim();
          localStorage.setItem('sxl_user', JSON.stringify(u));
          window.dispatchEvent(new Event('sxl-auth-change'));
        }
      } catch (e) { /* silent */ }

      setSuccessMsg('Shipper information saved successfully.');
      setSaving(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError('Connection error.');
      setSaving(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwdMsg('');

    if (!curPwd || !newPwd || !newPwd2) {
      setPwdMsg('All password fields are required.');
      return;
    }
    if (newPwd !== newPwd2) {
      setPwdMsg('New passwords do not match.');
      return;
    }
    if (newPwd.length < 6) {
      setPwdMsg('Password must be at least 6 characters.');
      return;
    }

    setPwdLoading(true);
    // Simulated — password change API will come later
    setTimeout(() => {
      setPwdMsg('Password change coming soon. Please contact admin.');
      setPwdLoading(false);
      setCurPwd('');
      setNewPwd('');
      setNewPwd2('');
    }, 800);
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

  const labelStyle = {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: 600,
    color: '#343A40',
    marginBottom: '6px'
  };

  if (loading) {
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

  return (
    <>
      <Header />

      <div style={{ maxWidth: '800px', margin: '30px auto', padding: '0 20px 60px' }}>
        <div style={{ marginBottom: '20px' }}>
          <Link href="/dashboard" style={{
            display: 'inline-block', padding: '10px 18px',
            background: 'transparent', color: '#003366',
            border: '2px solid #E9ECEF', borderRadius: '8px',
            fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem'
          }}>
            ← Back to Dashboard
          </Link>
        </div>

        <h1 style={{ fontSize: '2rem', color: '#003366', fontWeight: 800, marginBottom: '25px' }}>
          My Account
        </h1>

        {/* ============================================================
            SHIPPER INFORMATION
        ============================================================ */}
        <div style={{
          background: 'white', borderRadius: '12px', padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '20px'
        }}>
          <div style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #F1F3F5' }}>
            <h2 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>🚚 Shipper Information</h2>
            <p style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '4px', marginBottom: 0 }}>
              Your company details used for shipments and invoices
            </p>
          </div>

          {error && (
            <div style={{
              background: '#F8D7DA', color: '#721C24',
              borderLeft: '4px solid #DC3545', borderRadius: '8px',
              padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem'
            }}>
              {error}
            </div>
          )}
          {successMsg && (
            <div style={{
              background: '#D4EDDA', color: '#155724',
              borderLeft: '4px solid #28A745', borderRadius: '8px',
              padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem'
            }}>
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSave}>
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Account ID</label>
              <input type="text" value={userId} disabled style={{ ...inputStyle, background: '#F1F3F5', color: '#6C757D' }} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Email (cannot change)</label>
              <input type="email" value={email} disabled style={{ ...inputStyle, background: '#F1F3F5', color: '#6C757D' }} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Company Name *</label>
              <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g., ABC Trading Ltd" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Contact Person *</label>
              <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} placeholder="Full name" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Phone *</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+852 0000 0000" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Full Address</label>
              <textarea
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Street, building, unit..."
                style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px' }}>
              <div>
                <label style={labelStyle}>City</label>
                <input type="text" value={companyCity} onChange={(e) => setCompanyCity(e.target.value)} style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <input type="text" value={companyState} onChange={(e) => setCompanyState(e.target.value)} style={inputStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Country</label>
              <input type="text" value={companyCountry} onChange={(e) => setCompanyCountry(e.target.value)} placeholder="e.g., Hong Kong" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>BIN (Business Identification Number)</label>
              <input type="text" value={companyBin} onChange={(e) => setCompanyBin(e.target.value)} placeholder="Optional for now" style={inputStyle} />
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                padding: '14px 30px',
                background: '#FF6B00',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.6 : 1,
                fontFamily: 'inherit'
              }}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        </div>

        {/* ============================================================
            CREDIT ACCOUNT — Placeholder (built in Step 2.3)
        ============================================================ */}
        <div style={{
          background: 'white', borderRadius: '12px', padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '20px',
          borderLeft: '5px solid #FFC107'
        }}>
          <div style={{ marginBottom: '12px' }}>
            <h2 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>💳 Credit Account</h2>
          </div>
          <p style={{ color: '#6C757D', fontSize: '0.9rem' }}>
            🚧 Coming in Step 2.3 — Apply for a credit account to pay invoices within 30 days.
          </p>
        </div>

        {/* ============================================================
            CHANGE PASSWORD
        ============================================================ */}
        <div style={{
          background: 'white', borderRadius: '12px', padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)'
        }}>
          <div style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #F1F3F5' }}>
            <h2 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>🔒 Change Password</h2>
          </div>

          {pwdMsg && (
            <div style={{
              background: '#FFF3CD', color: '#856404',
              borderLeft: '4px solid #FFC107', borderRadius: '8px',
              padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem'
            }}>
              {pwdMsg}
            </div>
          )}

          <form onSubmit={handlePasswordChange}>
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Current Password</label>
              <input type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} placeholder="Current password" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>New Password (min 6 chars)</label>
              <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="New password" style={inputStyle} />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} placeholder="Confirm new password" style={inputStyle} />
            </div>

            <button
              type="submit"
              disabled={pwdLoading}
              style={{
                padding: '14px 30px',
                background: '#003366',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '1rem',
                cursor: pwdLoading ? 'not-allowed' : 'pointer',
                opacity: pwdLoading ? 0.6 : 1,
                fontFamily: 'inherit'
              }}
            >
              {pwdLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
