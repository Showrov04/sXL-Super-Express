'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BillingPanel from '../components/BillingPanel';
import CancellationPanel from '../components/CancellationPanel';
import CreditRequestsPanel from '../components/CreditRequestsPanel';

const COL_W_TRACKING = 170;
const COL_W_MODE = 105;
const COL_W_ROUTE = 170;
const FROZEN_LEFT_TRACKING = 0;
const FROZEN_LEFT_MODE = COL_W_TRACKING;
const FROZEN_LEFT_ROUTE = COL_W_TRACKING + COL_W_MODE;

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

// Helper to render service chip
function ServiceChip({ value }) {
  const v = String(value || '').toLowerCase();
  if (v === 'sxl') {
    return (
      <span style={{
        background: '#E8F7EF', color: '#155724', padding: '4px 10px',
        borderRadius: '12px', fontWeight: 700, fontSize: '0.68rem',
        whiteSpace: 'nowrap', display: 'inline-block'
      }}>
        ✅ sXL
      </span>
    );
  }
  if (v === 'consignee') {
    return (
      <span style={{
        background: '#FFF5EB', color: '#8B4500', padding: '4px 10px',
        borderRadius: '12px', fontWeight: 700, fontSize: '0.68rem',
        whiteSpace: 'nowrap', display: 'inline-block'
      }}>
        👤 Consignee
      </span>
    );
  }
  return <span style={{ color: '#ADB5BD', fontStyle: 'italic' }}>—</span>;
}

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
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [counts, setCounts] = useState({ active: 0, awaiting: 0, paid: 0, cancelled: 0, total: 0 });
  const [shipperList, setShipperList] = useState([]);
  const [error, setError] = useState('');

  const [colFilters, setColFilters] = useState({
    tracking: [], mode: [], shipper: [], route: [], status: [], payment: [],
    customs: [], delivery: [],
  });
  const [openFilter, setOpenFilter] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);
  const filterDropdownRef = useRef(null);

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

  const [filesModal, setFilesModal] = useState(null);

  useEffect(() => {
    loadShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, shipperFilter]);

  useEffect(() => {
    setColFilters({ tracking: [], mode: [], shipper: [], route: [], status: [], payment: [], customs: [], delivery: [] });
    setOpenFilter(null);
    setFilterSearch('');
    setShowDownloadMenu(false);
  }, [tab]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(e.target)) {
        setShowDownloadMenu(false);
      }
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setOpenFilter(null);
        setFilterSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
      setCounts(data.counts || { active: 0, awaiting: 0, paid: 0, cancelled: 0, total: 0 });

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

  function getColumnValue(s, col) {
    if (col === 'tracking') return s.trackingNumber || '';
    if (col === 'mode') return s.shipmentType || s.shipMode || '';
    if (col === 'shipper') return s.senderName || '';
    if (col === 'route') return (s.origin || '') + ' → ' + (s.destination || '');
    if (col === 'status') return s.status || '';
    if (col === 'payment') return s.paymentStatus || '';
    if (col === 'customs') return s.customService || '';
    if (col === 'delivery') return s.deliveryService || '';
    return '';
  }

  const filtered = useMemo(() => {
    let list = shipments;
    Object.entries(colFilters).forEach(([col, values]) => {
      if (values.length > 0) {
        list = list.filter((s) => values.includes(getColumnValue(s, col)));
      }
    });
    return list;
  }, [shipments, colFilters]);

  function getUniqueValues(col) {
    const set = new Set();
    shipments.forEach((s) => {
      const v = getColumnValue(s, col);
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }

  function toggleFilterValue(col, value) {
    setColFilters((prev) => {
      const current = prev[col] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [col]: next };
    });
  }

  function clearColumn(col) {
    setColFilters((prev) => ({ ...prev, [col]: [] }));
  }

  function clearAllFilters() {
    setColFilters({ tracking: [], mode: [], shipper: [], route: [], status: [], payment: [], customs: [], delivery: [] });
  }

  const hasAnyFilter = Object.values(colFilters).some((arr) => arr.length > 0);

  const summaryAmount = useMemo(() => {
    if (tab === 'active' || tab === 'cancelled') return null;
    let total = 0;
    filtered.forEach((s) => {
      total += parseFloat(s.shippingCost) || 0;
    });
    return Math.round(total * 100) / 100;
  }, [filtered, tab]);

  async function handleDownload(format) {
    setShowDownloadMenu(false);
    const token = localStorage.getItem('sxl_token');
    if (!token) return;

    const params = new URLSearchParams({ scope: 'admin', tab: tab });
    if (shipperFilter) params.set('shipper', shipperFilter);

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
    setQuStatus(s.status || '');
    setQuEta(s.estimatedDelivery || '');
    setQuNotes('');
    setQuMsg('');
    setQuLocation('');
    setQuFetchingLocation(true);

    try {
      const token = localStorage.getItem('sxl_token');
      const res = await fetch('/api/admin/shipments/tracking-history?tn=' + encodeURIComponent(s.trackingNumber), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();
      if (data.success && data.location) setQuLocation(data.location);
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

  function openFiles(s) {
    const docs = s.uploadedDocuments || {};
    const invoices = Array.isArray(docs.invoices) ? docs.invoices : [];
    const packingLists = Array.isArray(docs.packingLists) ? docs.packingLists : [];
    setFilesModal({ trackingNumber: s.trackingNumber, senderName: s.senderName, invoices, packingLists });
  }

  function hasFiles(s) {
    const docs = s.uploadedDocuments || {};
    const inv = Array.isArray(docs.invoices) ? docs.invoices.length : 0;
    const pl = Array.isArray(docs.packingLists) ? docs.packingLists.length : 0;
    return inv + pl > 0;
  }

  function formatBytes(bytes) {
    const n = Number(bytes) || 0;
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    return (n / (1024 * 1024)).toFixed(2) + ' MB';
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

  function HeaderCell({ col, label, width, frozenLeft, hasShadow }) {
    const isFilterable = ['tracking', 'mode', 'shipper', 'route', 'status', 'payment', 'customs', 'delivery'].includes(col);
    const activeCount = (colFilters[col] || []).length;
    const isOpen = openFilter === col;

    return (
      <th style={{
        padding: 0, textAlign: 'left', fontWeight: 700, color: '#003366',
        fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px',
        background: isOpen ? '#DDE3E9' : '#E9ECEF', borderBottom: '2px solid #D0D6DB',
        whiteSpace: 'nowrap', width, minWidth: width,
        position: 'sticky', top: 0,
        zIndex: frozenLeft !== undefined ? 22 : 20,
        ...(frozenLeft !== undefined ? { left: frozenLeft } : {}),
        ...(hasShadow ? { boxShadow: FROZEN_SHADOW } : {})
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px' }}>
          <span>{label}{activeCount > 0 && <span style={{ marginLeft: '6px', color: '#FF6B00' }}>({activeCount})</span>}</span>
          {isFilterable && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpenFilter(isOpen ? null : col); setFilterSearch(''); }}
              style={{
                padding: '2px 6px',
                background: activeCount > 0 ? '#FF6B00' : 'transparent',
                border: 'none', borderRadius: '4px', cursor: 'pointer',
                color: activeCount > 0 ? 'white' : '#003366',
                fontSize: '0.7rem', fontWeight: 700, fontFamily: 'inherit', lineHeight: 1
              }}
            >
              ▼
            </button>
          )}
        </div>

        {isOpen && (
          <div
            ref={filterDropdownRef}
            style={{
              position: 'absolute', top: '100%',
              left: frozenLeft !== undefined ? frozenLeft : 'auto',
              right: frozenLeft !== undefined ? 'auto' : 0,
              minWidth: '200px', background: 'white',
              border: '1px solid #D0D6DB', borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)', zIndex: 200,
              padding: '8px', marginTop: '4px',
              textTransform: 'none', letterSpacing: 'normal',
              fontSize: '0.85rem', color: '#343A40', fontWeight: 500
            }}
          >
            <input
              type="text"
              placeholder="Search values..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              style={{ width: '100%', padding: '6px 10px', border: '1px solid #E9ECEF', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', marginBottom: '8px' }}
            />
            <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '8px' }}>
              {getUniqueValues(col)
                .filter((v) => !filterSearch || v.toLowerCase().includes(filterSearch.toLowerCase()))
                .map((v) => {
                  const checked = (colFilters[col] || []).includes(v);
                  return (
                    <label key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 8px', cursor: 'pointer', borderRadius: '4px', background: checked ? '#FFF5EB' : 'transparent' }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleFilterValue(col, v)} style={{ width: '14px', height: '14px', accentColor: '#FF6B00', cursor: 'pointer' }} />
                      <span style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
                    </label>
                  );
                })}
            </div>
            <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #F1F3F5', paddingTop: '8px' }}>
              <button onClick={() => clearColumn(col)} style={{ flex: 1, padding: '6px 10px', background: '#F8F9FA', color: '#343A40', border: '1px solid #E9ECEF', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
              <button onClick={() => { setOpenFilter(null); setFilterSearch(''); }} style={{ flex: 1, padding: '6px 10px', background: '#003366', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
            </div>
          </div>
        )}
      </th>
    );
  }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <StatCard num={counts.total} label="Total" color="#FF6B00" />
        <StatCard num={counts.active} label="Active" color="#CCE5FF" />
        <StatCard num={counts.awaiting} label="Awaiting Payment" color="#FFE5B4" />
        <StatCard num={counts.paid} label="Paid & Completed" color="#D4EDDA" />
        <StatCard num={counts.cancelled || 0} label="Cancelled" color="#E9ECEF" />
      </div>

      {summaryAmount !== null && !loading && !error && (
        <div style={{
          background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          padding: '20px 25px', marginBottom: '20px', borderLeft: '5px solid #FF6B00',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px'
        }}>
          <div>
            <div style={{ fontWeight: 800, color: '#003366', fontSize: '1.1rem' }}>
              {tab === 'awaiting' ? '💵 Accounts Receivable' : '✅ Collected Revenue'}
            </div>
            <div style={{ color: '#6C757D', fontSize: '0.85rem' }}>
              {filtered.length} shipment{filtered.length !== 1 ? 's' : ''}
              {shipperFilter ? ` for ${shipperFilter}` : ''}
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FF6B00' }}>
            USD {Number(summaryAmount).toFixed(2)}
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '15px', marginBottom: '20px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={shipperFilter} onChange={(e) => setShipperFilter(e.target.value)} style={{ padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', minWidth: '180px' }}>
          <option value="">All Shippers</option>
          {shipperList.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>

        {hasAnyFilter && (
          <button onClick={clearAllFilters} style={{ padding: '10px 16px', background: '#FFF5EB', color: '#FF6B00', border: '2px solid #FF6B00', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✕ Clear Filters ({Object.values(colFilters).reduce((n, arr) => n + arr.length, 0)})
          </button>
        )}

        <div style={{ position: 'relative', marginLeft: 'auto' }} ref={downloadMenuRef}>
          <button onClick={() => setShowDownloadMenu(!showDownloadMenu)} style={{ padding: '10px 16px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '6px' }}>
            ⬇ Download All ▾
          </button>
          {showDownloadMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '6px', background: 'white', border: '1px solid #E9ECEF', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', zIndex: 100, minWidth: '160px', overflow: 'hidden' }}>
              <button onClick={() => handleDownload('pdf')} style={{ display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, color: '#003366', borderBottom: '1px solid #F1F3F5' }}>📄 PDF (.pdf)</button>
              <button onClick={() => handleDownload('csv')} style={{ display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, color: '#003366' }}>📊 Excel / CSV (.csv)</button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <TabButton active={tab === 'active'} onClick={() => setTab('active')} label="🔵 Active Shipment" count={counts.active} badgeBg="#CCE5FF" badgeColor="#004085" />
        <TabButton active={tab === 'awaiting'} onClick={() => setTab('awaiting')} label="🟡 Awaiting Payment" count={counts.awaiting} badgeBg="#FFE5B4" badgeColor="#8B4500" />
        <TabButton active={tab === 'paid'} onClick={() => setTab('paid')} label="🟢 Paid & Completed" count={counts.paid} badgeBg="#D4EDDA" badgeColor="#155724" />
        <TabButton active={tab === 'cancelled'} onClick={() => setTab('cancelled')} label="⚫ Cancelled" count={counts.cancelled || 0} badgeBg="#E9ECEF" badgeColor="#495057" />
      </div>

      {tab === 'active' && (
        <form id="quick-update-panel" onSubmit={handleQuickUpdate} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '20px', borderLeft: '5px solid #FF6B00' }}>
          <h3 style={{ color: '#003366', fontSize: '1.1rem', marginBottom: '12px' }}>⚡ Quick Update Status</h3>

          {quCurrentStatus && (
            <div style={{ background: '#FFF5EB', border: '1px solid #FF6B00', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '0.9rem', color: '#8B4500' }}>
              <b>Current Status:</b> <span style={{ fontWeight: 700 }}>{quCurrentStatus}</span>
              {quTn && <span style={{ marginLeft: '12px', color: '#6C757D' }}>• Tracking: <b>{quTn}</b></span>}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tracking Number *</label>
              <input type="text" value={quTn} onChange={(e) => setQuTn(e.target.value)} placeholder="e.g., SM0310202612" style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>New Status *</label>
              <select value={quStatus} onChange={(e) => setQuStatus(e.target.value)} style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }}>
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
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Location {quFetchingLocation && <span style={{ color: '#FF6B00', fontSize: '0.7rem' }}>(loading...)</span>}</label>
              <input type="text" value={quLocation} onChange={(e) => setQuLocation(e.target.value)} placeholder="City, Country" style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Estimated Delivery</label>
              <input type="date" value={quEta} onChange={(e) => setQuEta(e.target.value)} style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Notes</label>
            <input type="text" value={quNotes} onChange={(e) => setQuNotes(e.target.value)} placeholder="Optional" style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
          </div>
          <button type="submit" disabled={quLoading} style={{ marginTop: '12px', padding: '12px 24px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: quLoading ? 'not-allowed' : 'pointer', opacity: quLoading ? 0.6 : 1, fontFamily: 'inherit' }}>
            {quLoading ? 'Updating...' : '✅ Update Status'}
          </button>
          {quMsg && (
            <div style={{ marginTop: '10px', padding: '10px 15px', borderRadius: '8px', fontSize: '0.9rem', background: quMsg.startsWith('✅') ? '#D4EDDA' : '#F8D7DA', color: quMsg.startsWith('✅') ? '#155724' : '#721C24' }}>
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
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E9ECEF', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'auto', maxHeight: '70vh', position: 'relative' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem', minWidth: '1900px', tableLayout: 'fixed', width: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                <tr>
                  <HeaderCell col="tracking" label="Tracking #" width={COL_W_TRACKING} frozenLeft={FROZEN_LEFT_TRACKING} />
                  <HeaderCell col="mode" label="Mode" width={COL_W_MODE} frozenLeft={FROZEN_LEFT_MODE} />
                  <HeaderCell col="route" label="Route" width={COL_W_ROUTE} frozenLeft={FROZEN_LEFT_ROUTE} hasShadow={true} />
                  <HeaderCell col="shipper" label="Shipper" width={140} />
                  <HeaderCell col="none" label="Recipient" width={140} />
                  <HeaderCell col="status" label="Status" width={125} />
                  <HeaderCell col="none" label="Booking Wt" width={100} />
                  <HeaderCell col="none" label="Actual Wt" width={95} />
                  <HeaderCell col="none" label="Cost" width={110} />
                  <HeaderCell col="payment" label="Payment" width={110} />
                  <HeaderCell col="customs" label="Customs" width={110} />
                  <HeaderCell col="delivery" label="Delivery" width={110} />
                  <HeaderCell col="none" label="Booked" width={110} />
                  <HeaderCell col="none" label="ETA" width={120} />
                  <HeaderCell col="none" label="Actions" width={300} />
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
                  const rowHasFiles = hasFiles(s);

                  return (
                    <tr key={i} style={{ background: rowBg }}>
                      <td style={{ ...frozenTd, left: FROZEN_LEFT_TRACKING, width: COL_W_TRACKING, minWidth: COL_W_TRACKING, fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366' }}>{s.trackingNumber}</td>
                      <td style={{ ...frozenTd, left: FROZEN_LEFT_MODE, width: COL_W_MODE, minWidth: COL_W_MODE }}>{s.shipmentType || s.shipMode || '-'}</td>
                      <td style={{ ...frozenTd, left: FROZEN_LEFT_ROUTE, width: COL_W_ROUTE, minWidth: COL_W_ROUTE, boxShadow: FROZEN_SHADOW }}>{s.origin || '-'} → {s.destination || '-'}</td>
                      <td style={{ ...TD_STYLE, width: 140 }}>{s.senderName || '-'}</td>
                      <td style={{ ...TD_STYLE, width: 140 }}>{s.recipientName || '-'}</td>
                      <td style={{ ...TD_STYLE, width: 125 }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s.status}</span>
                      </td>
                      <td style={{ ...TD_STYLE, width: 100 }}>{s.bookingWeight ? s.bookingWeight + ' kg' : '-'}</td>
                      <td style={{ ...TD_STYLE, width: 95 }}>{s.actualWeight ? s.actualWeight + ' kg' : <span style={{ color: '#ADB5BD', fontStyle: 'italic' }}>TBA</span>}</td>
                      <td style={{ ...TD_STYLE, width: 110 }}>
                        {hasCost
                          ? <span style={{ fontWeight: 700, color: '#003366' }}>{Number(s.shippingCost).toFixed(2)} {s.currency}</span>
                          : <span style={{ color: '#ADB5BD', fontStyle: 'italic', fontWeight: 700 }}>TBA</span>}
                      </td>
                      <td style={{ ...TD_STYLE, width: 110 }}>
                        <span style={{ background: pc.bg, color: pc.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{s.paymentStatus || 'Unpaid'}</span>
                      </td>
                      <td style={{ ...TD_STYLE, width: 110 }}><ServiceChip value={s.customService} /></td>
                      <td style={{ ...TD_STYLE, width: 110 }}><ServiceChip value={s.deliveryService} /></td>
                      <td style={{ ...TD_STYLE, width: 110 }}>{formatDate(s.bookedAt)}</td>
                      <td style={{ ...TD_STYLE, width: 120 }}>
                        <span style={{ color: '#FF6B00', fontWeight: 800 }}>
                          {s.estimatedDelivery ? formatDate(s.estimatedDelivery) : 'Pending'}
                        </span>
                      </td>
                      <td style={{ ...TD_STYLE, width: 300 }}>
                        {tab === 'active' && (
                          <button onClick={() => handleUseRow(s)} style={{ padding: '5px 10px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', marginRight: '4px' }}>📋 Use</button>
                        )}
                        {rowHasFiles && (
                          <button onClick={() => openFiles(s)} style={{ padding: '5px 10px', background: '#8B5CF6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', marginRight: '4px' }}>📎 Files</button>
                        )}
                        {isSelfDelivery && (
                          <button onClick={() => handleSendWarehouse(s.trackingNumber)} disabled={sendingWh === s.trackingNumber} style={{ padding: '5px 10px', background: '#003366', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', opacity: sendingWh === s.trackingNumber ? 0.6 : 1, whiteSpace: 'nowrap' }}>
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

      {filesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', maxWidth: '600px', width: '100%', maxHeight: '85vh', overflowY: 'auto', borderRadius: '16px', padding: '30px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div>
                <h2 style={{ color: '#003366', fontSize: '1.25rem', margin: 0 }}>📎 Uploaded Documents</h2>
                <div style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '4px' }}>{filesModal.trackingNumber} · {filesModal.senderName}</div>
              </div>
              <button onClick={() => setFilesModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6C757D' }}>✕</button>
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, color: '#003366', fontSize: '0.95rem', marginBottom: '10px' }}>📄 Invoices ({filesModal.invoices.length})</div>
              {filesModal.invoices.length === 0 ? (
                <div style={{ color: '#ADB5BD', fontSize: '0.85rem', fontStyle: 'italic' }}>No invoice files</div>
              ) : (
                filesModal.invoices.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8F9FA', borderRadius: '8px', marginBottom: '6px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px', fontSize: '0.85rem' }}>
                      📄 {f.name} <span style={{ color: '#6C757D' }}>({formatBytes(f.size)})</span>
                    </div>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', background: '#003366', color: 'white', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>Download</a>
                  </div>
                ))
              )}
            </div>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ fontWeight: 700, color: '#003366', fontSize: '0.95rem', marginBottom: '10px' }}>📋 Packing Lists ({filesModal.packingLists.length})</div>
              {filesModal.packingLists.length === 0 ? (
                <div style={{ color: '#ADB5BD', fontSize: '0.85rem', fontStyle: 'italic' }}>No packing list files</div>
              ) : (
                filesModal.packingLists.map((f, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#F8F9FA', borderRadius: '8px', marginBottom: '6px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px', fontSize: '0.85rem' }}>
                      📋 {f.name} <span style={{ color: '#6C757D' }}>({formatBytes(f.size)})</span>
                    </div>
                    <a href={f.url} target="_blank" rel="noopener noreferrer" style={{ padding: '6px 14px', background: '#003366', color: 'white', borderRadius: '6px', fontWeight: 700, fontSize: '0.75rem', textDecoration: 'none', whiteSpace: 'nowrap' }}>Download</a>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setFilesModal(null)} style={{ padding: '12px 24px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Close</button>
            </div>
          </div>
        </div>
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
            <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>No shippers yet.</div>
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
                          <span style={{ background: isActive ? '#D4EDDA' : '#F8D7DA', color: isActive ? '#155724' : '#721C24', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.75rem' }}>{s.status}</span>
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
    <button onClick={onClick} style={{ cursor: 'pointer', padding: '12px 22px', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', border: '2px solid ' + (active ? '#FF6B00' : '#E9ECEF'), background: active ? '#FFF5EB' : 'white', color: active ? '#FF6B00' : '#343A40', fontFamily: 'inherit' }}>
      {label}{' '}
      <span style={{ background: active ? '#FF6B00' : badgeBg, color: active ? 'white' : badgeColor, padding: '2px 8px', borderRadius: '10px', marginLeft: '6px', fontSize: '0.8rem' }}>{count}</span>
    </button>
  );
}
