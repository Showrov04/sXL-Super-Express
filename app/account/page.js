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

  const [editMode, setEditMode] = useState(false);
  const [countries, setCountries] = useState([]);

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

  const [backup, setBackup] = useState(null);

  const [creditApproved, setCreditApproved] = useState(false);
  const [creditLimit, setCreditLimit] = useState(0);
  const [creditTermsDays, setCreditTermsDays] = useState(30);
  const [creditStatus, setCreditStatus] = useState(null);
  const [creditNote, setCreditNote] = useState('');

  const [showCreditForm, setShowCreditForm] = useState(false);
  const [creditSubmitting, setCreditSubmitting] = useState(false);
  const [creditMsg, setCreditMsg] = useState('');
  const [creditFormError, setCreditFormError] = useState('');
  const [bankName, setBankName] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankSwift, setBankSwift] = useState('');
  const [bankBranch, setBankBranch] = useState('');

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

    fetch('/api/countries')
      .then((r) => r.json())
      .then((d) => setCountries(d.countries || []))
      .catch(() => setCountries([]));

    loadProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      setCreditApproved(p.creditApproved === true);
      setCreditLimit(p.creditLimit || 0);
      setCreditTermsDays(p.creditTermsDays || 30);
      setCreditStatus(p.creditStatus || null);
      setCreditNote(p.creditNote || '');

      setBankName(p.bankName || '');
      setBankAccountName(p.bankAccountName || '');
      setBankAccountNumber(p.bankAccountNumber || '');
      setBankSwift(p.bankSwift || '');
      setBankBranch(p.bankBranch || '');

      setLoading(false);
    } catch (err) {
      setError('Connection error.');
      setLoading(false);
    }
  }

  function startEdit() {
    setBackup({
      companyName, contactPerson, phone,
      companyAddress, companyCity, companyState, companyCountry, companyBin,
    });
    setEditMode(true);
    setSuccessMsg('');
    setError('');
  }

  function cancelEdit() {
    if (backup) {
      setCompanyName(backup.companyName || '');
      setContactPerson(backup.contactPerson || '');
      setPhone(backup.phone || '');
      setCompanyAddress(backup.companyAddress || '');
      setCompanyCity(backup.companyCity || '');
      setCompanyState(backup.companyState || '');
      setCompanyCountry(backup.companyCountry || '');
      setCompanyBin(backup.companyBin || '');
    }
    setEditMode(false);
    setError('');
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
      setEditMode(false);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError('Connection error.');
      setSaving(false);
    }
  }

  async function handleCreditSubmit(e) {
    e.preventDefault();
    setCreditFormError('');
    setCreditMsg('');

    if (!companyName.trim()) { setCreditFormError('Company name is required.'); return; }
    if (!companyAddress.trim()) { setCreditFormError('Company address is required.'); return; }
    if (!companyCountry.trim()) { setCreditFormError('Country is required.'); return; }
    if (!companyBin.trim()) { setCreditFormError('BIN is required.'); return; }
    if (!bankName.trim()) { setCreditFormError('Bank name is required.'); return; }
    if (!bankAccountName.trim()) { setCreditFormError('Account holder name is required.'); return; }
    if (!bankAccountNumber.trim()) { setCreditFormError('Account number is required.'); return; }

    setCreditSubmitting(true);
    const token = localStorage.getItem('sxl_token');

    try {
      const res = await fetch('/api/customer/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          action: 'submitCredit',
          companyName: companyName.trim(),
          companyAddress: companyAddress.trim(),
          companyCity: companyCity.trim(),
          companyState: companyState.trim(),
          companyCountry: companyCountry.trim(),
          companyBin: companyBin.trim(),
          bankName: bankName.trim(),
          bankAccountName: bankAccountName.trim(),
          bankAccountNumber: bankAccountNumber.trim(),
          bankSwift: bankSwift.trim(),
          bankBranch: bankBranch.trim(),
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setCreditFormError(data.error || 'Submission failed.');
        setCreditSubmitting(false);
        return;
      }

      setCreditMsg(data.message || 'Submitted successfully.');
      setCreditSubmitting(false);
      setShowCreditForm(false);
      setTimeout(loadProfile, 800);
    } catch (err) {
      setCreditFormError('Connection error.');
      setCreditSubmitting(false);
    }
  }

  async function handlePasswordChange(e) {
    e.preventDefault();
    setPwdMsg('');
    if (!curPwd || !newPwd || !newPwd2) { setPwdMsg('All password fields are required.'); return; }
    if (newPwd !== newPwd2) { setPwdMsg('New passwords do not match.'); return; }
    if (newPwd.length < 6) { setPwdMsg('Password must be at least 6 characters.'); return; }
    setPwdLoading(true);
    setTimeout(() => {
      setPwdMsg('Password change coming soon. Please contact admin.');
      setPwdLoading(false);
      setCurPwd(''); setNewPwd(''); setNewPwd2('');
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

  const readOnlyStyle = {
    ...inputStyle,
    background: '#F8F9FA',
    color: '#343A40',
    border: '2px solid #F1F3F5'
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
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
            flexWrap: 'wrap', gap: '12px',
            marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #F1F3F5'
          }}>
            <div>
              <h2 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>🚚 Shipper Information</h2>
              <p style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '4px', marginBottom: 0 }}>
                {editMode ? 'Editing — make your changes and save' : 'Click Edit to modify your details'}
              </p>
            </div>

            {!editMode && (
              <button onClick={startEdit} style={{
                padding: '10px 20px', background: '#FF6B00', color: 'white',
                border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem',
                cursor: 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                ✏️ Edit
              </button>
            )}
          </div>

          {error && (
            <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem' }}>{error}</div>
          )}
          {successMsg && (
            <div style={{ background: '#D4EDDA', color: '#155724', borderLeft: '4px solid #28A745', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem' }}>{successMsg}</div>
          )}

          <form onSubmit={handleSave}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px' }}>
              <div>
                <label style={labelStyle}>Account ID</label>
                <input type="text" value={userId} disabled style={readOnlyStyle} />
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input type="email" value={email} disabled style={readOnlyStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px' }}>
              <div>
                <label style={labelStyle}>Company Name *</label>
                <input type="text" value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  disabled={!editMode}
                  style={editMode ? inputStyle : readOnlyStyle} />
              </div>
              <div>
                <label style={labelStyle}>Contact Person *</label>
                <input type="text" value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  disabled={!editMode}
                  style={editMode ? inputStyle : readOnlyStyle} />
              </div>
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Phone *</label>
              <input type="tel" value={phone}
                onChange={(e) => setPhone(e.target.value)}
                disabled={!editMode}
                style={editMode ? inputStyle : readOnlyStyle} />
            </div>

            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Full Address</label>
              <textarea value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                disabled={!editMode}
                style={{
                  ...(editMode ? inputStyle : readOnlyStyle),
                  minHeight: '80px',
                  resize: editMode ? 'vertical' : 'none'
                }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px' }}>
              <div>
                <label style={labelStyle}>City</label>
                <input type="text" value={companyCity}
                  onChange={(e) => setCompanyCity(e.target.value)}
                  disabled={!editMode}
                  style={editMode ? inputStyle : readOnlyStyle} />
              </div>
              <div>
                <label style={labelStyle}>State</label>
                <input type="text" value={companyState}
                  onChange={(e) => setCompanyState(e.target.value)}
                  disabled={!editMode}
                  style={editMode ? inputStyle : readOnlyStyle} />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
              <div>
                <label style={labelStyle}>Country</label>
                <select
                  value={companyCountry}
                  onChange={(e) => setCompanyCountry(e.target.value)}
                  disabled={!editMode}
                  style={editMode ? inputStyle : readOnlyStyle}>
                  <option value="">-- Select Country --</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>BIN</label>
                <input type="text" value={companyBin}
                  onChange={(e) => setCompanyBin(e.target.value)}
                  disabled={!editMode}
                  style={editMode ? inputStyle : readOnlyStyle} />
              </div>
            </div>

            {editMode && (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="submit" disabled={saving} style={{
                  padding: '14px 30px', background: '#FF6B00', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem',
                  cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: 'inherit'
                }}>
                  {saving ? 'Saving...' : '💾 Save Changes'}
                </button>
                <button type="button" onClick={cancelEdit} disabled={saving} style={{
                  padding: '14px 30px', background: 'transparent', color: '#003366',
                  border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, fontSize: '1rem',
                  cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  Cancel
                </button>
              </div>
            )}
          </form>
        </div>

        {/* ============================================================
            CREDIT ACCOUNT
        ============================================================ */}
        <div style={{
          background: 'white', borderRadius: '12px', padding: '30px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '20px',
          borderLeft: creditApproved ? '5px solid #28A745'
            : creditStatus === 'pending' ? '5px solid #FFC107'
            : creditStatus === 'rejected' ? '5px solid #DC3545'
            : '5px solid #6C757D'
        }}>
          <div style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #F1F3F5' }}>
            <h2 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>💳 Credit Account</h2>
            <p style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '4px', marginBottom: 0 }}>
              Pay invoices within {creditTermsDays} days after delivery
            </p>
          </div>

          {creditMsg && (
            <div style={{ background: '#D4EDDA', color: '#155724', borderLeft: '4px solid #28A745', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem' }}>
              {creditMsg}
            </div>
          )}

          {creditApproved && (
            <div style={{ background: '#E8F7EF', border: '2px solid #28A745', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.8rem' }}>✅</span>
                <div style={{ fontWeight: 800, color: '#155724', fontSize: '1.1rem' }}>Credit Account Active</div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '15px' }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#155724', fontWeight: 700, letterSpacing: '0.5px' }}>Credit Limit</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#003366', marginTop: '4px' }}>USD {Number(creditLimit).toFixed(2)}</div>
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#155724', fontWeight: 700, letterSpacing: '0.5px' }}>Payment Terms</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#003366', marginTop: '4px' }}>Net {creditTermsDays} days</div>
                </div>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#343A40', marginTop: '15px', marginBottom: 0 }}>
                You can now select <b>Credit Account</b> as a payment type when booking shipments.
              </p>
            </div>
          )}

          {!creditApproved && creditStatus === 'pending' && (
            <div style={{ background: '#FFF3CD', border: '2px solid #FFC107', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.8rem' }}>🟡</span>
                <div style={{ fontWeight: 800, color: '#856404', fontSize: '1.1rem' }}>Request Under Review</div>
              </div>
              <p style={{ fontSize: '0.9rem', color: '#343A40', margin: 0 }}>
                Our team is reviewing your credit account request. You&apos;ll be notified by email within 1-2 business days.
              </p>
            </div>
          )}

          {!creditApproved && creditStatus === 'rejected' && (
            <div style={{ background: '#F8D7DA', border: '2px solid #DC3545', borderRadius: '12px', padding: '20px', marginBottom: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '1.8rem' }}>🔴</span>
                <div style={{ fontWeight: 800, color: '#721C24', fontSize: '1.1rem' }}>Request Not Approved</div>
              </div>
              {creditNote && (
                <p style={{ fontSize: '0.9rem', color: '#343A40', marginBottom: '10px' }}>
                  <b>Reason from our team:</b> <i>{creditNote}</i>
                </p>
              )}
              <button onClick={() => setShowCreditForm(true)} style={{
                marginTop: '10px', padding: '10px 20px', background: '#DC3545', color: 'white',
                border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
              }}>
                Reapply for Credit Account
              </button>
            </div>
          )}

          {!creditApproved && !creditStatus && !showCreditForm && (
            <div>
              <p style={{ color: '#343A40', fontSize: '0.95rem', marginBottom: '15px' }}>
                Apply for a credit account to simplify your payment process. Once approved, you can:
              </p>
              <ul style={{ color: '#6C757D', fontSize: '0.9rem', lineHeight: 1.9, paddingLeft: '20px', marginBottom: '20px' }}>
                <li>Book shipments without prepayment</li>
                <li>Pay invoices within {creditTermsDays} days after delivery</li>
                <li>Receive a consolidated monthly statement</li>
              </ul>
              <button onClick={() => setShowCreditForm(true)} style={{
                padding: '14px 30px', background: '#FF6B00', color: 'white',
                border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem',
                cursor: 'pointer', fontFamily: 'inherit'
              }}>
                📝 Apply for Credit Account
              </button>
            </div>
          )}

          {!creditApproved && showCreditForm && (
            <form onSubmit={handleCreditSubmit} style={{ marginTop: '20px' }}>
              <div style={{ background: '#FFF5EB', borderLeft: '4px solid #FF6B00', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.85rem', color: '#6C757D' }}>
                Please provide the following details. Our team will review your application within 1-2 business days.
              </div>

              {creditFormError && (
                <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem' }}>
                  {creditFormError}
                </div>
              )}

              <h3 style={{ color: '#003366', fontSize: '1rem', marginBottom: '15px', marginTop: '20px' }}>🏢 Company Information</h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px' }}>
                <div>
                  <label style={labelStyle}>Company Name *</label>
                  <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>BIN *</label>
                  <input type="text" value={companyBin} onChange={(e) => setCompanyBin(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Company Full Address *</label>
                <textarea value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }} />
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

              <div style={{ marginBottom: '20px' }}>
                <label style={labelStyle}>Country *</label>
                <select value={companyCountry} onChange={(e) => setCompanyCountry(e.target.value)} style={inputStyle}>
                  <option value="">-- Select Country --</option>
                  {countries.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                </select>
              </div>

              <h3 style={{ color: '#003366', fontSize: '1rem', marginBottom: '15px', marginTop: '25px' }}>🏦 Bank Information</h3>

              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Bank Name *</label>
                <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ marginBottom: '18px' }}>
                <label style={labelStyle}>Account Holder Name *</label>
                <input type="text" value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '18px' }}>
                <div>
                  <label style={labelStyle}>Account Number *</label>
                  <input type="text" value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>SWIFT / IBAN</label>
                  <input type="text" value={bankSwift} onChange={(e) => setBankSwift(e.target.value)} style={inputStyle} />
                </div>
              </div>

              <div style={{ marginBottom: '25px' }}>
                <label style={labelStyle}>Branch</label>
                <input type="text" value={bankBranch} onChange={(e) => setBankBranch(e.target.value)} style={inputStyle} />
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="submit" disabled={creditSubmitting} style={{
                  padding: '14px 30px', background: '#FF6B00', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem',
                  cursor: creditSubmitting ? 'not-allowed' : 'pointer',
                  opacity: creditSubmitting ? 0.6 : 1, fontFamily: 'inherit'
                }}>
                  {creditSubmitting ? 'Submitting...' : '📤 Submit Request'}
                </button>
                <button type="button" onClick={() => setShowCreditForm(false)} disabled={creditSubmitting} style={{
                  padding: '14px 30px', background: 'transparent', color: '#003366',
                  border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, fontSize: '1rem',
                  cursor: 'pointer', fontFamily: 'inherit'
                }}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* ============================================================
            CHANGE PASSWORD
        ============================================================ */}
        <div style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #F1F3F5' }}>
            <h2 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>🔒 Change Password</h2>
          </div>

          {pwdMsg && (
            <div style={{ background: '#FFF3CD', color: '#856404', borderLeft: '4px solid #FFC107', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem' }}>
              {pwdMsg}
            </div>
          )}

          <form onSubmit={handlePasswordChange}>
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>Current Password</label>
              <input type="password" value={curPwd} onChange={(e) => setCurPwd(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '18px' }}>
              <label style={labelStyle}>New Password (min 6 chars)</label>
              <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} style={inputStyle} />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Confirm New Password</label>
              <input type="password" value={newPwd2} onChange={(e) => setNewPwd2(e.target.value)} style={inputStyle} />
            </div>
            <button type="submit" disabled={pwdLoading} style={{
              padding: '14px 30px', background: '#003366', color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem',
              cursor: pwdLoading ? 'not-allowed' : 'pointer',
              opacity: pwdLoading ? 0.6 : 1, fontFamily: 'inherit'
            }}>
              {pwdLoading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>

      <Footer />
    </>
  );
}
