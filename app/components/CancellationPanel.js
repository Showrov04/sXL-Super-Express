'use client';

import { useEffect, useState } from 'react';

export default function CancellationPanel() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');
  const [notes, setNotes] = useState({}); // trackingNumber -> note
  const [msg, setMsg] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  async function loadRequests() {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('sxl_token');

    try {
      const res = await fetch('/api/admin/cancel', {
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

  async function handleAction(trackingNumber, action) {
    if (!window.confirm(action === 'approve' ? 'Approve this cancellation?' : 'Reject this cancellation?')) return;

    setActionLoading(trackingNumber + ':' + action);
    setMsg('');
    const token = localStorage.getItem('sxl_token');

    try {
      const res = await fetch('/api/admin/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          trackingNumber,
          action,
          adminNote: notes[trackingNumber] || '',
        }),
      });
      const data = await res.json();

      if (!data.success) {
        window.alert('Error: ' + (data.error || 'Failed'));
        setActionLoading('');
        return;
      }

      setMsg('Shipment ' + trackingNumber + ' → status: ' + data.newStatus);
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
          <p style={{ color: '#6C757D' }}>Loading requests...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {requests.length === 0 ? (
            <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>
              No pending cancellation requests. ✅
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              {requests.map((r, i) => (
                <div key={i} style={{
                  background: 'white', borderRadius: '12px', padding: '20px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderLeft: '5px solid #DC3545'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' }}>
                    <div>
                      <div style={{ fontFamily: 'Consolas, monospace', fontSize: '1.1rem', fontWeight: 800, color: '#003366', marginBottom: '4px' }}>
                        {r.trackingNumber}
                      </div>
                      <div style={{ fontSize: '0.85rem', color: '#6C757D' }}>
                        Requested: {formatDate(r.requestedAt)}
                      </div>
                    </div>
                    <div style={{
                      background: '#F8D7DA', color: '#721C24', padding: '6px 14px',
                      borderRadius: '20px', fontWeight: 700, fontSize: '0.75rem',
                      textTransform: 'uppercase'
                    }}>
                      Cancellation Requested
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '15px', fontSize: '0.88rem', lineHeight: 1.7 }}>
                    <div>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6C757D', fontWeight: 700, marginBottom: '2px' }}>Shipper</div>
                      <div><b>{r.senderName}</b></div>
                      <div>{r.senderEmail}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6C757D', fontWeight: 700, marginBottom: '2px' }}>Consignee</div>
                      <div><b>{r.recipientName}</b></div>
                      <div>{r.origin} → {r.destination}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#6C757D', fontWeight: 700, marginBottom: '2px' }}>Weight</div>
                      <div>{r.weight} kg</div>
                    </div>
                  </div>

                  <div style={{ background: '#FFF5EB', borderLeft: '4px solid #FF6B00', padding: '12px 15px', borderRadius: '8px', marginBottom: '15px', fontSize: '0.9rem' }}>
                    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#8B4500', fontWeight: 700, marginBottom: '4px' }}>Reason from customer</div>
                    <div style={{ color: '#343A40', fontStyle: 'italic' }}>"{r.reason || 'No reason given'}"</div>
                  </div>

                  <div style={{ marginBottom: '12px' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px', color: '#343A40' }}>
                      Admin note (optional)
                    </label>
                    <input
                      type="text"
                      value={notes[r.trackingNumber] || ''}
                      onChange={(e) => setNotes({ ...notes, [r.trackingNumber]: e.target.value })}
                      placeholder="e.g., Approved due to address issue"
                      style={{
                        width: '100%', padding: '10px 14px', fontSize: '0.9rem',
                        border: '2px solid #E9ECEF', borderRadius: '8px',
                        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => handleAction(r.trackingNumber, 'approve')}
                      disabled={actionLoading === r.trackingNumber + ':approve'}
                      style={{
                        padding: '12px 24px', background: '#DC3545', color: 'white',
                        border: 'none', borderRadius: '8px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        opacity: actionLoading === r.trackingNumber + ':approve' ? 0.6 : 1
                      }}>
                      {actionLoading === r.trackingNumber + ':approve' ? 'Approving...' : '✅ Approve Cancellation'}
                    </button>
                    <button
                      onClick={() => handleAction(r.trackingNumber, 'reject')}
                      disabled={actionLoading === r.trackingNumber + ':reject'}
                      style={{
                        padding: '12px 24px', background: 'transparent', color: '#003366',
                        border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                        opacity: actionLoading === r.trackingNumber + ':reject' ? 0.6 : 1
                      }}>
                      {actionLoading === r.trackingNumber + ':reject' ? 'Rejecting...' : '↩ Reject & Restore'}
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
