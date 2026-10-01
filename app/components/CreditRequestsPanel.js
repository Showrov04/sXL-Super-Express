'use client';

import { useEffect, useState } from 'react';

export default function CreditRequestsPanel() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [notes, setNotes] = useState({});
  const [limits, setLimits] = useState({});
  const [terms, setTerms] = useState({});
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setError('');
    setMsg('');
    const token = localStorage.getItem('sxl_token');

    try {
      const res = await fetch('/api/admin/credit-requests', {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to load requests.');
        setLoading(false);
        return;
      }
      setRequests(data.requests || []);
      setLoading(false);
    } catch (err) {
      setError('Connection error.');
      setLoading(false);
    }
  }

  async function handleAction(userId, action) {
    const confirmMsg = action === 'approve'
      ? 'Approve this credit request?'
      : 'Reject this credit request?';
    if (!window.confirm(confirmMsg)) return;

    // For approve, require a limit
    if (action === 'approve') {
      const limit = parseFloat(limits[userId]);
      if (!limit || limit <= 0) {
        window.alert('Please enter a credit limit before approving.');
        return;
      }
    }

    setActionLoading(userId + ':' + action);
    setMsg('');
    const token = localStorage.getItem('sxl_token');

    try {
      const res = await fetch('/api/admin/credit-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          userId,
          action,
          creditLimit: parseFloat(limits[userId]) || 0,
          creditTermsDays: parseInt(terms[userId], 10) || 30,
          adminNote: notes[userId] || '',
        }),
      });
      const data = await res.json();

      if (!data.success) {
        window.alert('Error: ' + (data.error || 'Failed'));
        setActionLoading('');
        return;
      }

      setMsg('✅ Request ' + (action === 'approve' ? 'approved' : 'rejected') + ' successfully.');
      setActionLoading('');
      setTimeout(loadRequests, 500);
    } catch (err) {
      window.alert('Error: ' + err.message);
      setActionLoading('');
    }
  }

  function formatDate(d) {
    if (!d) return '-';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(d); }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <StatCard num={requests.length} label="Pending Requests" color="#FF6B00" />
      </div>

      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button onClick={loadRequests} style={{
          padding: '10px 20px', background: 'transparent', color: '#003366',
          border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit'
        }}>🔄 Refresh</button>
      </div>

      {msg && (
        <div style={{ background: '#D4EDDA', color: '#155724', borderLeft: '4px solid #28A745', borderRadius: '8px', padding: '12px 16px', marginBottom: '15px', fontSize: '0.9rem' }}>
          {msg}
        </div>
      )}

      {error && <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '10px', padding: '15px 20px', marginBottom: '20px' }}>❌ {error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '45px', height: '45px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 15px' }} />
          <p style={{ color: '#6C757D' }}>Loading credit requests...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {requests.length === 0 ? (
            <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>
              No pending credit requests. ✅
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {requests.map((r, i) => (
                <div key={i} style={{
                  background: 'white', borderRadius: '12px', padding: '24px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderLeft: '5px solid #FF6B00'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', marginBottom: '20px' }}>
                    <div>
                      <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#003366', marginBottom: '4px' }}>
                        {r.companyName || 'Unknown Company'}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6C757D' }}>
                        {r.contactPerson} • {r.email} • {r.phone}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: '#999', marginTop: '4px' }}>
                        Submitted: {formatDate(r.submittedAt)}
                      </div>
                    </div>
                    <div style={{
                      background: '#FFF3CD', color: '#856404', padding: '6px 14px',
                      borderRadius: '20px', fontWeight: 700, fontSize: '0.75rem',
                      textTransform: 'uppercase', whiteSpace: 'nowrap'
                    }}>
                      Pending Review
                    </div>
                  </div>

                  {/* Two columns: Company + Bank */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div style={{ background: '#F8F9FA', padding: '16px', borderRadius: '10px' }}>
                      <div style={{ fontWeight: 800, color: '#003366', fontSize: '0.9rem', marginBottom: '10px' }}>
                        🏢 Company Information
                      </div>
                      <div style={{ fontSize: '0.85rem', lineHeight: 1.9, color: '#343A40' }}>
                        <div><b>Name:</b> {r.companyName}</div>
                        <div><b>BIN:</b> {r.companyBin || '-'}</div>
                        <div><b>Address:</b> {r.companyAddress || '-'}</div>
                        <div><b>City:</b> {r.companyCity || '-'}</div>
                        <div><b>State:</b> {r.companyState || '-'}</div>
                        <div><b>Country:</b> {r.companyCountry || '-'}</div>
                      </div>
                    </div>

                    <div style={{ background: '#F8F9FA', padding: '16px', borderRadius: '10px' }}>
                      <div style={{ fontWeight: 800, color: '#003366', fontSize: '0.9rem', marginBottom: '10px' }}>
                        🏦 Bank Information
                      </div>
                      <div style={{ fontSize: '0.85rem', lineHeight: 1.9, color: '#343A40' }}>
                        <div><b>Bank:</b> {r.bankName || '-'}</div>
                        <div><b>Account Holder:</b> {r.bankAccountName || '-'}</div>
                        <div><b>Account #:</b> {r.bankAccountNumber || '-'}</div>
                        <div><b>SWIFT/IBAN:</b> {r.bankSwift || '-'}</div>
                        <div><b>Branch:</b> {r.bankBranch || '-'}</div>
                      </div>
                    </div>
                  </div>

                  {/* Approval fields */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#343A40' }}>
                        Credit Limit (USD) *
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="e.g., 5000"
                        value={limits[r.userId] || ''}
                        onChange={(e) => setLimits({ ...limits, [r.userId]: e.target.value })}
                        style={{
                          width: '100%', padding: '10px 14px', fontSize: '0.9rem',
                          border: '2px solid #E9ECEF', borderRadius: '8px',
                          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#343A40' }}>
                        Payment Terms (days)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="180"
                        placeholder="30"
                        value={terms[r.userId] || '30'}
                        onChange={(e) => setTerms({ ...terms, [r.userId]: e.target.value })}
                        style={{
                          width: '100%', padding: '10px 14px', fontSize: '0.9rem',
                          border: '2px solid #E9ECEF', borderRadius: '8px',
                          outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div style={{ marginBottom: '18px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#343A40' }}>
                      Admin note (optional — shown to customer on rejection)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g., Insufficient business history"
                      value={notes[r.userId] || ''}
                      onChange={(e) => setNotes({ ...notes, [r.userId]: e.target.value })}
                      style={{
                        width: '100%', padding: '10px 14px', fontSize: '0.9rem',
                        border: '2px solid #E9ECEF', borderRadius: '8px',
                        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleAction(r.userId, 'approve')}
                      disabled={actionLoading === r.userId + ':approve'}
                      style={{
                        padding: '12px 24px', background: '#28A745', color: 'white',
                        border: 'none', borderRadius: '8px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        opacity: actionLoading === r.userId + ':approve' ? 0.6 : 1
                      }}
                    >
                      {actionLoading === r.userId + ':approve' ? 'Approving...' : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => handleAction(r.userId, 'reject')}
                      disabled={actionLoading === r.userId + ':reject'}
                      style={{
                        padding: '12px 24px', background: 'transparent', color: '#DC3545',
                        border: '2px solid #DC3545', borderRadius: '8px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        opacity: actionLoading === r.userId + ':reject' ? 0.6 : 1
                      }}
                    >
                      {actionLoading === r.userId + ':reject' ? 'Rejecting...' : '✗ Reject'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function StatCard({ num, label, color }) {
  return (
    <div style={{ background: 'white', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderLeft: '4px solid ' + color }}>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#003366' }}>{num}</div>
      <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#6C757D', marginTop: '5px' }}>{label}</div>
    </div>
  );
}
