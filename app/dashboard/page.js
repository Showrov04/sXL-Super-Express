'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [counts, setCounts] = useState({ active: 0, awaiting: 0, paid: 0, total: 0 });
  const [outstanding, setOutstanding] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('sxl_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    try {
      setUser(JSON.parse(stored));
    } catch (e) {
      router.push('/login');
    }
  }, [router]);

  useEffect(() => {
    if (!user) return;
    loadData(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab]);

  async function loadData(activeTab) {
    setLoading(true);
    setError('');

    const token = localStorage.getItem('sxl_token');
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const res = await fetch('/api/customer/shipments?tab=' + activeTab, {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();

      if (!data.success) {
        if (data.error === 'Session expired.') {
          localStorage.removeItem('sxl_token');
          localStorage.removeItem('sxl_user');
          router.push('/login');
          return;
        }
        setError(data.error || 'Failed to load shipments.');
        setLoading(false);
        return;
      }

      setShipments(data.shipments || []);
      setCounts(data.counts || { active: 0, awaiting: 0, paid: 0, total: 0 });
      setOutstanding(data.outstanding || null);
      setLoading(false);
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  }

  function formatDate(d) {
    if (!d) return '—';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return String(d); }
  }

  function statusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('delivered')) return { bg: '#D4EDDA', color: '#155724' };
    if (s.includes('out for delivery')) return { bg: '#FFE5B4', color: '#8B4500' };
    if (s.includes('transit') || s.includes('picked')) return { bg: '#CCE5FF', color: '#004085' };
    if (s.includes('exception') || s.includes('failed')) return { bg: '#F8D7DA', color: '#721C24' };
    return { bg: '#FFF3CD', color: '#856404' };
  }

  if (!user) {
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

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', minHeight: '60vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', color: '#003366', fontWeight: 800, marginBottom: '5px' }}>
              👋 Welcome, {user.name || 'Customer'}
            </h1>
            <p style={{ color: '#6C757D', fontSize: '0.95rem' }}>
              Account ID: <b>{user.userId || '—'}</b>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/book" style={{ padding: '12px 24px', background: '#FF6B00', color: 'white', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
              + New Booking
            </Link>
            <Link href="/account" style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
              ⚙️ My Account
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '25px' }}>
          <TabButton active={tab === 'active'} onClick={() => setTab('active')} label="🔵 Active Shipment" count={counts.active} badgeBg="#CCE5FF" badgeColor="#004085" />
          <TabButton active={tab === 'awaiting'} onClick={() => setTab('awaiting')} label="🟡 Outstanding Payment" count={counts.awaiting} badgeBg="#FFE5B4" badgeColor="#8B4500" />
          <TabButton active={tab === 'paid'} onClick={() => setTab('paid')} label="🟢 Paid & Completed" count={counts.paid} badgeBg="#D4EDDA" badgeColor="#155724" />
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '45px', height: '45px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 15px' }} />
            <p style={{ color: '#6C757D' }}>Loading...</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '10px', padding: '15px 20px', marginBottom: '20px' }}>
            ❌ {error}
          </div>
        )}

        {!loading && !error && tab === 'awaiting' && outstanding && (
          <>
            {outstanding.items.length === 0 ? (
              <div style={{ background: '#D4EDDA', color: '#155724', borderLeft: '4px solid #28A745', borderRadius: '10px', padding: '20px' }}>
                ✅ You have no outstanding payments. Thank you!
              </div>
            ) : (
              <>
                <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '20px', marginBottom: '15px', borderLeft: '5px solid #FFE5B4' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div>
                      <div style={{ fontWeight: 800, color: '#003366', fontSize: '1.1rem' }}>💰 Total Outstanding</div>
                      <div style={{ color: '#6C757D', fontSize: '0.85rem' }}>{outstanding.count} shipment(s) pending payment</div>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FF6B00' }}>
                      {outstanding.currency} {Number(outstanding.total).toFixed(2)}
                    </div>
                  </div>
                </div>
                {outstanding.items.map((it, i) => (
                  <div key={i} style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '20px', marginBottom: '15px', borderLeft: '5px solid #FFE5B4' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                      <div>
                        <div style={{ fontWeight: 800, color: '#003366', fontSize: '1.05rem' }}>{it.trackingNumber}</div>
                        <div style={{ color: '#6C757D', fontSize: '0.85rem' }}>{it.recipientName} • {it.destination}</div>
                      </div>
                      <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FF6B00' }}>
                        {it.currency} {Number(it.cost).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {!loading && !error && tab !== 'awaiting' && (
          <>
            {shipments.length === 0 ? (
              <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>
                No shipments in this category.
              </div>
            ) : (
              <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '700px' }}>
                  <thead>
                    <tr style={{ background: '#F8F9FA' }}>
                      {['Tracking #', 'Service', 'Route', 'Status', 'Cost', 'Payment', 'Booked', 'Actions'].map((h) => (
                        <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#343A40', fontSize: '0.8rem', textTransform: 'uppercase', borderBottom: '2px solid #E9ECEF' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {shipments.map((s, i) => {
                      const sc = statusClass(s.status);
                      return (
                        <tr key={i} style={{ borderBottom: '1px solid #F1F3F5' }}>
                          <td style={{ padding: '14px 16px', fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366' }}>{s.trackingNumber}</td>
                          <td style={{ padding: '14px 16px' }}>{s.serviceType || '—'}</td>
                          <td style={{ padding: '14px 16px' }}>{s.origin || '—'} → {s.destination || '—'}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ background: sc.bg, color: sc.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.75rem', textTransform: 'uppercase' }}>{s.status}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>{s.cost ? `${Number(s.cost).toFixed(2)} ${s.currency}` : '—'}</td>
                          <td style={{ padding: '14px 16px' }}>{s.paymentStatus || '—'}</td>
                          <td style={{ padding: '14px 16px' }}>{formatDate(s.bookedAt)}</td>
                          <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                            <Link href={'/track?tn=' + s.trackingNumber} style={{ padding: '6px 12px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' }}>
                              View
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      <Footer />
    </>
  );
}

function TabButton({ active, onClick, label, count, badgeBg, badgeColor }) {
  return (
    <button
      onClick={onClick}
      style={{
        cursor: 'pointer',
        padding: '12px 22px',
        borderRadius: '10px',
        fontWeight: 700,
        fontSize: '0.9rem',
        border: '2px solid ' + (active ? '#FF6B00' : '#E9ECEF'),
        background: active ? '#FFF5EB' : 'white',
        color: active ? '#FF6B00' : '#343A40',
        fontFamily: 'inherit'
      }}
    >
      {label}{' '}
      <span style={{
        background: active ? '#FF6B00' : badgeBg,
        color: active ? 'white' : badgeColor,
        padding: '2px 8px',
        borderRadius: '10px',
        marginLeft: '6px',
        fontSize: '0.8rem'
      }}>
        {count}
      </span>
    </button>
  );
}
