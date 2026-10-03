'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BillingPanel from '../components/BillingPanel';
import CancellationPanel from '../components/CancellationPanel';
import CreditRequestsPanel from '../components/CreditRequestsPanel';

const COL_W_TRACKING = 160;
const COL_W_MODE = 105;
const COL_W_ROUTE = 170;
const FROZEN_LEFT_TRACKING = 0;
const FROZEN_LEFT_MODE = COL_W_TRACKING;
const FROZEN_LEFT_ROUTE = COL_W_TRACKING + COL_W_MODE;

const TH_STYLE = {
  padding: '14px 12px',
  textAlign: 'left',
  fontWeight: 700,
  color: '#003366',
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  background: '#E9ECEF',
  borderBottom: '2px solid #D0D6DB',
  whiteSpace: 'nowrap'
};

const TD_STYLE = {
  padding: '10px 12px',
  borderBottom: '1px solid #F1F3F5',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  height: '48px',
  verticalAlign: 'middle'
};

const FROZEN_SHADOW = '2px 0 5px -2px rgba(0,0,0,0.08)';

export default function AdminPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [adminTab, setAdminTab] = useState('shipments');

  useEffect(() => {
    const stored = localStorage.getItem('sxl_user');
    if (!stored) { router.push('/login'); return; }
    try {
      const u = JSON.parse(stored);
      if (u.role !== 'admin' && u.role !== 'staff') { router.push('/dashboard'); return; }
      setUser(u);
    } catch (e) { router.push('/login'); }
  }, [router]);

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

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '30px 20px 60px' }}>
        <h1 style={{ fontSize: '2rem', color: '#003366', fontWeight: 800, marginBottom: '25px' }}>
          Admin Panel
        </h1>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '25px', borderBottom: '2px solid #E9ECEF' }}>
          <TopTab active={adminTab === 'shipments'} onClick={() => setAdminTab('shipments')} label="📦 Management Shipment" />
          <TopTab active={adminTab === 'shippers'} onClick={() => setAdminTab('shippers')} label="🚚 Management Shipper" />
          <TopTab active={adminTab === 'billing'} onClick={() => setAdminTab('billing')} label="💰 Financial & Billing" />
          <TopTab active={adminTab === 'cancellations'} onClick={() => setAdminTab('cancellations')} label="⚠️ Cancellation Requests" />
          <TopTab active={adminTab === 'credit'} onClick={() => setAdminTab('credit')} label="💳 Credit Requests" />
        </div>

        {adminTab === 'shipments' && <ShipmentsPanel />}
        {adminTab === 'shippers' && <ShippersPanel />}
        {adminTab === 'billing' && <BillingPanel />}
        {adminTab === 'cancellations' && <CancellationPanel />}
        {adminTab === 'credit' && <CreditRequestsPanel />}
      </div>

      <Footer />
    </>
  );
}

function TopTab({ active, onClick, label }) {
  return (
    <button onClick={onClick} style={{
      cursor: 'pointer', padding: '12px 22px', borderRadius: '10px 10px 0 0',
      fontWeight: 700, fontSize: '0.9rem', border: 'none',
      background: active ? '#FF6B00' : '#E9ECEF',
      color: active ? 'white' : '#003366',
      fontFamily: 'inherit', whiteSpace: 'nowrap'
    }}>
      {label}
    </button>
  );
}

/* ============================================================
   SHIPMENTS PANEL
   ============================================================ */
function ShipmentsPanel() {
  const [tab, setTab] = useState('active');
  const [shipperFilter, setShipperFilter] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterMode, setFilterMode] = useState('all');
  const [shipperList, setShipperList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [counts, setCounts] = useState({ active: 0, awaiting: 0, paid: 0, total: 0 });
  const [error, setError] = useState('');

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);

  const [quTn, setQuTn] = useState('');
  const [quCurrentStatus, setQuCurrentStatus] = useState('');
  const [quStatus, setQuStatus] = useState('');
  const [quLocation, setQuLocation] = useState('');
  const [quEta, setQuEta] = useState('');
  const [quNotes, setQuNotes] = useState('');
  const [quMsg, setQuMsg] = useState('');
  const [quLoading, setQuLoading] = useState(false);
  const [quFetchingLocation, setQuFetchingLocation] = useState(false);

  const [sendingWh, setSendingWh] = useState('');

  useEffect(() => {
    loadShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, shipperFilter]);

  useEffect(() => {
    setSearch('');
    setFilterStatus('all');
    setFilterMode('all');
    setShowDownloadMenu(false);
  }, [tab]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setShowDownloadMenu(false);
      }
    }
    if (showDownloadMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDownloadMenu]);

  async function loadShipments() {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('sxl_token');
    if (!token) return;

    try {
      const params = new URLSearchParams({ tab });
      if (shipperFilter) params.set('shipper', shipperFilter);

      const res = await fetch('/api/admin/shipments?' + params.toString(), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();

      if (!data.success) { setError(data.error || 'Failed to load.'); setLoading(false); return; }

      setShipments(data.shipments || []);
      setCounts(data.counts || { active: 0, awaiting: 0, paid: 0, total: 0 });

      const names = {};
      (data.shipments || []).forEach((s) => { if (s.senderName) names[s.senderName] = true; });
      setShipperList((prev) => {
        const merged = { ...Object.fromEntries(prev.map((n) => [n, true])) };
        Object.keys(names).forEach((n) => { merged[n] = true; });
        return Object.keys(merged).sort();
      });

      setLoading(false);
    } catch (err) { setError('Connection error.'); setLoading(false); }
  }

  function handleSearch(e) { e.preventDefault(); loadShipments(); }

  // Client-side filtered list
  const filtered = useMemo(() => {
    let list = shipments;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) =>
        String(s.trackingNumber || '').toLowerCase().includes(q) ||
        String(s.senderName || '').toLowerCase().includes(q) ||
        String(s.recipientName || '').toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'all') {
      list = list.filter((s) => String(s.status || '').toLowerCase() === filterStatus.toLowerCase());
    }
    if (filterMode !== 'all') {
      list = list.filter((s) => String(s.shipMode || '').toUpperCase() === filterMode.toUpperCase());
    }
    return list;
  }, [shipments, search, filterStatus, filterMode]);

  const statusOptions = useMemo(() => {
    const set = new Set(shipments.map((s) => s.status).filter(Boolean));
    return Array.from(set).sort();
  }, [shipments]);

  async function handleDownload(format) {
    setShowDownloadMenu(false);
    const token = localStorage.getItem('sxl_token');
    if (!token) return;

    const params = new URLSearchParams({ scope: 'admin', tab: tab });
    if (shipperFilter) params.set('shipper', shipperFilter);
    if (search.trim()) params.set('search', search.trim());

    const url = '/api/export/' + format + '?' + params.toString();

    try {
      const res = await fetch(url, { headers: { Authorization: 'Bearer ' + token } });
      if (!res.ok) { window.alert('Export failed: ' + res.status); return; }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      const ext = format === 'pdf' ? 'pdf' : 'csv';
      a.download = `sxl-${tab}-${new Date().toISOString().slice(0, 10)}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      window.alert('Download error: ' + err.message);
    }
  }

  async function handleUseRow(s) {
    setQuTn(s.trackingNumber);
    setQuCurrentStatus(s.status || '');
    setQuStatus(s.status || ''); // default to current status
    setQuEta(s.estimatedDelivery || '');
    setQuNotes('');
    setQuMsg('');
    setQuLocation('');
    setQuFetchingLocation(true);

    // Fetch last known location from tracking history
    try {
      const token = localStorage.getItem('sxl_token');
      const res = await fetch('/api/admin/shipments/tracking-history?tn=' + encodeURIComponent(s.trackingNumber), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();
      if (data.success && data.location) {
        setQuLocation(data.location);
      }
    } catch (e) { /* silent */ }

    setQuFetchingLocation(false);

    setTimeout(() => {
      const el = document.getElementById('quick-update-panel');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  async function handleQuickUpdate(e) {
    e.preventDefault();
    setQuMsg('');
    if (!quTn.trim()) { setQuMsg('Please enter a tracking number.'); return; }
    if (!quStatus) { setQuMsg('Please select a new status.'); return; }

    setQuLoading(true);
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          trackingNumber: quTn.trim(), newStatus: quStatus,
          location: quLocation, notes: quNotes, eta: quEta,
        }),
      });
      const data = await res.json();
      if (!data.success) { setQuMsg('❌ ' + (data.error || 'Update failed.')); setQuLoading(false); return; }
      setQuMsg('✅ Status updated to "' + quStatus + '"!');
      setQuTn(''); setQuCurrentStatus(''); setQuStatus(''); setQuLocation(''); setQuEta(''); setQuNotes('');
      setQuLoading(false);
      setTimeout(loadShipments, 500);
    } catch (err) { setQuMsg('❌ Connection error.'); setQuLoading(false); }
  }

  async function handleSendWarehouse(trackingNumber) {
    if (!window.confirm('Send warehouse details email for ' + trackingNumber + '?')) return;
    setSendingWh(trackingNumber);
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/send-warehouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ trackingNumber }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); setSendingWh(''); return; }
      window.alert('✅ Warehouse details sent to customer!');
      setSendingWh('');
      loadShipments();
    } catch (err) { window.alert('Error: ' + err.message); setSendingWh(''); }
  }

  function formatDate(d) {
    if (!d) return '-';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return String(d); }
  }

  function statusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('cancelled')) return { bg: '#E9ECEF', color: '#495057' };
    if (s.includes('cancellation requested')) return { bg: '#FFE5B4', color: '#8B4500' };
    if (s.includes('delivered')) return { bg: '#D4EDDA', color: '#155724' };
    if (s.includes('out for delivery')) return { bg: '#FFE5B4', color: '#8B4500' };
    if (s.includes('transit') || s.includes('picked')) return { bg: '#CCE5FF', color: '#004085' };
    if (s.includes('exception') || s.includes('failed')) return { bg: '#F8D7DA', color: '#721C24' };
    return { bg: '#FFF3CD', color: '#856404' };
  }

  function paymentClass(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'paid') return { bg: '#D4EDDA', color: '#155724' };
    return { bg: '#FFF3CD', color: '#856404' };
  }

  return (
    <div>
      {/* Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <StatCard num={counts.total} label="Total" color="#FF6B00" />
        <StatCard num={counts.active} label="Active" color="#CCE5FF" />
        <StatCard num={counts.awaiting} label="Awaiting Payment" color="#FFE5B4" />
        <StatCard num={counts.paid} label="Paid & Completed" color="#D4EDDA" />
      </div>

      {/* Filter Bar */}
      <div style={{
        background: 'white', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        padding: '15px', marginBottom: '20px',
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center'
      }}>
        <input
          type="text"
          placeholder="🔍 Search tracking, shipper, recipient..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: 1, minWidth: '220px', padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }}
        />
        <select
          value={shipperFilter}
          onChange={(e) => setShipperFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', minWidth: '160px' }}
        >
          <option value="">All Shippers</option>
          {shipperList.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{ padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', minWidth: '150px' }}
        >
          <option value="all">All Statuses</option>
          {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
          style={{ padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', minWidth: '120px' }}
        >
          <option value="all">All Modes</option>
          <option value="SEA">SEA</option>
          <option value="AIR">AIR</option>
        </select>
        <button
          onClick={() => { setSearch(''); setFilterStatus('all'); setFilterMode('all'); setShipperFilter(''); }}
          style={{ padding: '10px 16px', background: '#E9ECEF', color: '#003366', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          ✕ Clear
        </button>

        {/* Download Dropdown */}
        <div style={{ position: 'relative' }} ref={downloadMenuRef}>
          <button
            onClick={() => setShowDownloadMenu(!showDownloadMenu)}
            style={{
              padding: '10px 16px', background: '#003366', color: 'white',
              border: 'none', borderRadius: '8px', fontWeight: 700,
              fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px'
            }}
          >
            ⬇ Download All ▾
          </button>
          {showDownloadMenu && (
            <div style={{
              position: 'absolute', top: '100%', right: 0, marginTop: '6px',
              background: 'white', border: '1px solid #E9ECEF', borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '160px', overflow: 'hidden'
            }}>
              <button
                onClick={() => handleDownload('pdf')}
                style={{ display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, color: '#003366', borderBottom: '1px solid #F1F3F5' }}
              >
                📄 PDF (.pdf)
              </button>
              <button
                onClick={() => handleDownload('csv')}
                style={{ display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, color: '#003366' }}
              >
                📊 Excel / CSV (.csv)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-tabs */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <TabButton active={tab === 'active'} onClick={() => setTab('active')} label="🔵 Active Shipment" count={counts.active} badgeBg="#CCE5FF" badgeColor="#004085" />
        <TabButton active={tab === 'awaiting'} onClick={() => setTab('awaiting')} label="🟡 Awaiting Payment" count={counts.awaiting} badgeBg="#FFE5B4" badgeColor="#8B4500" />
        <TabButton active={tab === 'paid'} onClick={() => setTab('paid')} label="🟢 Paid & Completed" count={counts.paid} badgeBg="#D4EDDA" badgeColor="#155724" />
      </div>

      {/* Quick Update Panel */}
      {tab === 'active' && (
        <form id="quick-update-panel" onSubmit={handleQuickUpdate} style={{
          background: 'white', padding: '20px', borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '20px',
          borderLeft: '5px solid #FF6B00'
        }}>
          <h3 style={{ color: '#003366', fontSize: '1.1rem', marginBottom: '12px' }}>⚡ Quick Update Status</h3>

          {quCurrentStatus && (
            <div style={{
              background: '#FFF5EB', border: '1px solid #FF6B00',
              borderRadius: '8px', padding: '10px 14px', marginBottom: '14px',
              fontSize: '0.9rem', color: '#8B4500'
            }}>
              <b>Current Status:</b> <span style={{ fontWeight: 700 }}>{quCurrentStatus}</span>
              {quTn && <span style={{ marginLeft: '12px', color: '#6C757D' }}>• Tracking: <b>{quTn}</b></span>}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tracking Number *</label>
              <input type="text" value={quTn} onChange={(e) => setQuTn(e.target.value)} placeholder="e.g., SM0310202612"
                style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>New Status *</label>
              <select value={quStatus} onChange={(e) => setQuStatus(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }}>
                <option value="">-- Select New Status --</option>
                <option>Booked</option>
                <option>Picked Up</option>
                <option>In Transit</option>
                <option>Out for Delivery</option>
                <option>Delivered</option>
                <option>Exception</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Location {quFetchingLocation && <span style={{ color: '#FF6B00', fontSize: '0.7rem' }}>(loading...)</span>}
              </label>
              <input type="text" value={quLocation} onChange={(e) => setQuLocation(e.target.value)} placeholder="City, Country"
                style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Estimated Delivery</label>
              <input type="date" value={quEta} onChange={(e) => setQuEta(e.target.value)}
                style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Notes</label>
            <input type="text" value={quNotes} onChange={(e) => setQuNotes(e.target.value)} placeholder="Optional"
              style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
          </div>
          <button type="submit" disabled={quLoading} style={{
            marginTop: '12px', padding: '12px 24px', background: '#FF6B00', color: 'white',
            border: 'none', borderRadius: '8px', fontWeight: 700,
            cursor: quLoading ? 'not-allowed' : 'pointer', opacity: quLoading ? 0.6 : 1, fontFamily: 'inherit'
          }}>
            {quLoading ? 'Updating...' : '✅ Update Status'}
          </button>
          {quMsg && (
            <div style={{ marginTop: '10px', padding: '10px 15px', borderRadius: '8px', fontSize: '0.9rem',
              background: quMsg.startsWith('✅') ? '#D4EDDA' : '#F8D7DA',
              color: quMsg.startsWith('✅') ? '#155724' : '#721C24' }}>
              {quMsg}
            </div>
          )}
        </form>
      )}

      {error && <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '10px', padding: '15px 20px', marginBottom: '20px' }}>❌ {error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '45px', height: '45px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 15px' }} />
          <p style={{ color: '#6C757D' }}>Loading shipments...</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>
          {shipments.length === 0 ? 'No shipments in this category.' : 'No shipments match your filters.'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div style={{
            background: 'white', borderRadius: '12px', border: '1px solid #E9ECEF',
            boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'auto',
            maxHeight: '70vh', position: 'relative'
          }}>
            <table style={{
              borderCollapse: 'separate', borderSpacing: 0,
              fontSize: '0.85rem', minWidth: '1650px',
              tableLayout: 'fixed', width: '100%'
            }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 20, background: '#E9ECEF' }}>
                <tr>
                  <th style={{ ...TH_STYLE, width: COL_W_TRACKING, minWidth: COL_W_TRACKING, position: 'sticky', left: FROZEN_LEFT_TRACKING, zIndex: 22 }}>Tracking #</th>
                  <th style={{ ...TH_STYLE, width: COL_W_MODE, minWidth: COL_W_MODE, position: 'sticky', left: FROZEN_LEFT_MODE, zIndex: 22 }}>Mode</th>
                  <th style={{ ...TH_STYLE, width: COL_W_ROUTE, minWidth: COL_W_ROUTE, position: 'sticky', left: FROZEN_LEFT_ROUTE, zIndex: 22, boxShadow: FROZEN_SHADOW }}>Route</th>
                  <th style={{ ...TH_STYLE, width: 150, minWidth: 150 }}>Shipper</th>
                  <th style={{ ...TH_STYLE, width: 150, minWidth: 150 }}>Recipient</th>
                  <th style={{ ...TH_STYLE, width: 130, minWidth: 130 }}>Status</th>
                  <th style={{ ...TH_STYLE, width: 110, minWidth: 110 }}>Booking Wt</th>
                  <th style={{ ...TH_STYLE, width: 105, minWidth: 105 }}>Actual Wt</th>
                  <th style={{ ...TH_STYLE, width: 115, minWidth: 115 }}>Cost</th>
                  <th style={{ ...TH_STYLE, width: 110, minWidth: 110 }}>Payment</th>
                  <th style={{ ...TH_STYLE, width: 120, minWidth: 120 }}>Booked</th>
                  <th style={{ ...TH_STYLE, width: 125, minWidth: 125 }}>ETA</th>
                  <th style={{ ...TH_STYLE, width: 260, minWidth: 260 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const sc = statusClass(s.status);
                  const pc = paymentClass(s.paymentStatus);
                  const isSelfDelivery = s.pickupService === false;
                  const hasCost = s.shippingCost && parseFloat(s.shippingCost) > 0;
                  const rowBg = i % 2 === 0 ? '#FFFFFF' : '#FAFBFC';

                  const frozenTd = { ...TD_STYLE, background: rowBg, position: 'sticky', zIndex: 3 };

                  return (
                    <tr key={i} style={{ background: rowBg }}>
                      <td style={{ ...frozenTd, left: FROZEN_LEFT_TRACKING, width: COL_W_TRACKING, minWidth: COL_W_TRACKING, fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366' }}>{s.trackingNumber}</td>
                      <td style={{ ...frozenTd, left: FROZEN_LEFT_MODE, width: COL_W_MODE, minWidth: COL_W_MODE }}>{s.shipmentType || s.shipMode || '-'}</td>
                      <td style={{ ...frozenTd, left: FROZEN_LEFT_ROUTE, width: COL_W_ROUTE, minWidth: COL_W_ROUTE, boxShadow: FROZEN_SHADOW }}>{s.origin || '-'} → {s.destination || '-'}</td>

                      <td style={{ ...TD_STYLE, width: 150 }}>{s.senderName || '-'}</td>
                      <td style={{ ...TD_STYLE, width: 150 }}>{s.recipientName || '-'}</td>
                      <td style={{ ...TD_STYLE, width: 130 }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s.status}</span>
                      </td>
                      <td style={{ ...TD_STYLE, width: 110 }}>{s.bookingWeight ? s.bookingWeight + ' kg' : '-'}</td>
                      <td style={{ ...TD_STYLE, width: 105 }}>{s.actualWeight ? s.actualWeight + ' kg' : <span style={{ color: '#ADB5BD', fontStyle: 'italic' }}>TBA</span>}</td>
                      <td style={{ ...TD_STYLE, width: 115 }}>
                        {hasCost
                          ? <span style={{ fontWeight: 700, color: '#003366' }}>{Number(s.shippingCost).toFixed(2)} {s.currency}</span>
                          : <span style={{ color: '#ADB5BD', fontStyle: 'italic', fontWeight: 700 }}>TBA</span>}
                      </td>
                      <td style={{ ...TD_STYLE, width: 110 }}>
                        <span style={{ background: pc.bg, color: pc.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{s.paymentStatus || 'Unpaid'}</span>
                      </td>
                      <td style={{ ...TD_STYLE, width: 120 }}>{formatDate(s.bookedAt)}</td>
                      <td style={{ ...TD_STYLE, width: 125 }}>
                        <span style={{ color: '#FF6B00', fontWeight: 800 }}>
                          {s.estimatedDelivery ? formatDate(s.estimatedDelivery) : 'Pending'}
                        </span>
                      </td>
                      <td style={{ ...TD_STYLE, width: 260 }}>
                        {tab === 'active' && (
                          <button onClick={() => handleUseRow(s)} style={{
                            padding: '5px 10px', background: '#FF6B00', color: 'white', border: 'none',
                            borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', marginRight: '4px'
                          }}>📋 Use</button>
                        )}
                        {isSelfDelivery && (
                          <button onClick={() => handleSendWarehouse(s.trackingNumber)} disabled={sendingWh === s.trackingNumber} style={{
                            padding: '5px 10px', background: '#003366', color: 'white', border: 'none',
                            borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit',
                            opacity: sendingWh === s.trackingNumber ? 0.6 : 1, whiteSpace: 'nowrap'
                          }}>
                            {sendingWh === s.trackingNumber ? '...' : '📧 Send Warehouse'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '0.85rem', color: '#6C757D' }}>
            Showing <b>{filtered.length}</b> of <b>{shipments.length}</b> shipment{shipments.length !== 1 ? 's' : ''}
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   SHIPPERS PANEL — unchanged
   ============================================================ */
function ShippersPanel() {
  const [loading, setLoading] = useState(true);
  const [shippers, setShippers] = useState([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, suspended: 0 });
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => { loadShippers(); }, []);

  async function loadShippers() {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/shippers', { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      if (!data.success) { setError(data.error || 'Failed to load shippers.'); setLoading(false); return; }
      setShippers(data.shippers || []);
      setCounts(data.counts || { total: 0, active: 0, suspended: 0 });
      setLoading(false);
    } catch (err) { setError('Connection error.'); setLoading(false); }
  }

  async function toggleStatus(shipperID, newStatus) {
    const msg = newStatus === 'Suspended' ? 'Suspend this shipper?' : 'Activate this shipper?';
    if (!window.confirm(msg)) return;

    setActionLoading(shipperID);
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/shippers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ shipperID, newStatus }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); setActionLoading(''); return; }
      window.alert('Shipper ' + newStatus.toLowerCase() + ' successfully!');
      setActionLoading('');
      loadShippers();
    } catch (err) { window.alert('Error: ' + err.message); setActionLoading(''); }
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <StatCard num={counts.total} label="Total Shippers" color="#FF6B00" />
        <StatCard num={counts.active} label="Active" color="#D4EDDA" />
        <StatCard num={counts.suspended} label="Suspended" color="#F8D7DA" />
      </div>

      <div style={{ marginBottom: '15px' }}>
        <button onClick={loadShippers} style={{ padding: '10px 20px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Refresh</button>
      </div>

      {error && <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '10px', padding: '15px 20px', marginBottom: '20px' }}>❌ {error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '45px', height: '45px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 15px' }} />
          <p style={{ color: '#6C757D' }}>Loading shippers...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {shippers.length === 0 ? (
            <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>
              No shippers yet.
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem', minWidth: '900px' }}>
                <thead>
                  <tr style={{ background: '#F8F9FA' }}>
                    {['Short Form', 'Name', 'Contact', 'Email', 'Phone', 'Country', 'Status', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#343A40', fontSize: '0.78rem', textTransform: 'uppercase', borderBottom: '2px solid #E9ECEF' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shippers.map((s, i) => {
                    const isActive = s.status === 'Active';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F3F5' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366' }}>{s.shortForm || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>{s.name || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>{s.contactPerson || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>{s.email || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>{s.phone || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>{s.country || '-'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{
                            background: isActive ? '#D4EDDA' : '#F8D7DA',
                            color: isActive ? '#155724' : '#721C24',
                            padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.75rem'
                          }}>{s.status}</span>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {isActive ? (
                            <button disabled={actionLoading === s.shipperID} onClick={() => toggleStatus(s.shipperID, 'Suspended')} style={{ padding: '6px 12px', background: '#DC3545', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading === s.shipperID ? 0.6 : 1 }}>🚫 Suspend</button>
                          ) : (
                            <button disabled={actionLoading === s.shipperID} onClick={() => toggleStatus(s.shipperID, 'Active')} style={{ padding: '6px 12px', background: '#28A745', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'inherit', opacity: actionLoading === s.shipperID ? 0.6 : 1 }}>✅ Activate</button>
                          )}
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

function TabButton({ active, onClick, label, count, badgeBg, badgeColor }) {
  return (
    <button onClick={onClick} style={{
      cursor: 'pointer', padding: '12px 22px', borderRadius: '10px',
      fontWeight: 700, fontSize: '0.9rem',
      border: '2px solid ' + (active ? '#FF6B00' : '#E9ECEF'),
      background: active ? '#FFF5EB' : 'white',
      color: active ? '#FF6B00' : '#343A40',
      fontFamily: 'inherit'
    }}>
      {label}{' '}
      <span style={{ background: active ? '#FF6B00' : badgeBg, color: active ? 'white' : badgeColor, padding: '2px 8px', borderRadius: '10px', marginLeft: '6px', fontSize: '0.8rem' }}>{count}</span>
    </button>
  );
}
