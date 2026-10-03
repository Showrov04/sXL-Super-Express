'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

// Frozen column widths (first 3 columns)
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

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [counts, setCounts] = useState({ active: 0, awaiting: 0, paid: 0, cancelled: 0, total: 0 });
  const [outstanding, setOutstanding] = useState(null);
  const [summary, setSummary] = useState({
    activeBilling: { total: 0, currency: 'USD', count: 0 },
    totalPaid: { total: 0, currency: 'USD', count: 0 },
  });
  const [error, setError] = useState('');

  // Column filters
  const [colFilters, setColFilters] = useState({
    tracking: [],
    mode: [],
    shipper: [],
    route: [],
    status: [],
    payment: [],
  });

  const [openFilter, setOpenFilter] = useState(null); // which column's filter dropdown is open
  const [filterSearch, setFilterSearch] = useState(''); // search text inside the dropdown

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);
  const filterDropdownRef = useRef(null);

  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('sxl_user');
    const token = localStorage.getItem('sxl_token');
    if (!stored || !token) { router.push('/login'); return; }
    try { setUser(JSON.parse(stored)); } catch (e) { router.push('/login'); }
  }, [router]);

  useEffect(() => {
    if (!user) return;
    loadData(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tab]);

  // Reset filters when tab changes
  useEffect(() => {
    setColFilters({ tracking: [], mode: [], shipper: [], route: [], status: [], payment: [] });
    setOpenFilter(null);
    setFilterSearch('');
    setShowDownloadMenu(false);
  }, [tab]);

  // Close download / filter dropdowns on outside click
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

  async function loadData(activeTab) {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('sxl_token');
    if (!token) { router.push('/login'); return; }

    try {
      const url = '/api/customer/shipments?tab=' + activeTab + '&_t=' + Date.now();
      const res = await fetch(url, {
        headers: { Authorization: 'Bearer ' + token },
        cache: 'no-store',
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
      setCounts(data.counts || { active: 0, awaiting: 0, paid: 0, cancelled: 0, total: 0 });
      setOutstanding(data.outstanding || null);
      setSummary(data.summary || {
        activeBilling: { total: 0, currency: 'USD', count: 0 },
        totalPaid: { total: 0, currency: 'USD', count: 0 },
      });
      setLoading(false);
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  }

  // Helper: get the value used for a given filter column
  function getColumnValue(s, col) {
    if (col === 'tracking') return s.trackingNumber || '';
    if (col === 'mode') return s.shipmentType || s.shipMode || '';
    if (col === 'shipper') return s.senderName || '';
    if (col === 'route') return (s.origin || '') + ' → ' + (s.destination || '');
    if (col === 'status') return s.status || '';
    if (col === 'payment') return s.paymentStatus || '';
    return '';
  }

  // Client-side filtered list with column filters
  const filtered = useMemo(() => {
    let list = shipments;

    // Apply each active column filter
    Object.entries(colFilters).forEach(([col, values]) => {
      if (values.length > 0) {
        list = list.filter((s) => values.includes(getColumnValue(s, col)));
      }
    });

    return list;
  }, [shipments, colFilters]);

  // Get unique values for a given filter column
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
    setColFilters({ tracking: [], mode: [], shipper: [], route: [], status: [], payment: [] });
  }

  const hasAnyFilter = Object.values(colFilters).some((arr) => arr.length > 0);

  async function handleDownload(format) {
    setShowDownloadMenu(false);
    const token = localStorage.getItem('sxl_token');
    if (!token) return;

    const params = new URLSearchParams({ scope: 'customer', tab: tab });
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

  async function submitCancel() {
    setCancelError('');
    if (!cancelReason.trim()) {
      setCancelError('Please provide a reason for cancellation.');
      return;
    }
    setCancelLoading(true);
    const token = localStorage.getItem('sxl_token');

    try {
      const res = await fetch('/api/customer/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ trackingNumber: cancelModal.trackingNumber, reason: cancelReason.trim() }),
      });
      const data = await res.json();

      if (!data.success) {
        setCancelError(data.error || 'Failed to submit request.');
        setCancelLoading(false);
        return;
      }

      setCancelModal(null);
      setCancelReason('');
      setCancelLoading(false);
      window.location.reload();
    } catch (err) {
      setCancelError('Connection error: ' + err.message);
      setCancelLoading(false);
    }
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
    if (s.includes('cancellation requested')) return { bg: '#FFE5B4', color: '#8B4500' };
    if (s.includes('cancelled')) return { bg: '#E9ECEF', color: '#495057' };
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

  const summaryCardConfig =
    tab === 'awaiting'
      ? { label: '💵 Total Outstanding', data: { total: outstanding?.total || 0, currency: outstanding?.currency || 'USD', count: outstanding?.count || 0 } }
      : tab === 'paid'
      ? { label: '✅ Total Paid', data: summary.totalPaid }
      : null;

  // ============ FILTER HEADER COMPONENT ============
  function HeaderCell({ col, label, width, frozenLeft, hasShadow }) {
    const isFilterable = ['tracking', 'mode', 'shipper', 'route', 'status', 'payment'].includes(col);
    const activeCount = (colFilters[col] || []).length;
    const isOpen = openFilter === col;

    return (
      <th style={{
        padding: 0,
        textAlign: 'left',
        fontWeight: 700,
        color: '#003366',
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        background: isOpen ? '#DDE3E9' : '#E9ECEF',
        borderBottom: '2px solid #D0D6DB',
        whiteSpace: 'nowrap',
        width,
        minWidth: width,
        position: 'sticky',
        top: 0,
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
                padding: '2px 6px', background: activeCount > 0 ? '#FF6B00' : 'transparent',
                border: 'none', borderRadius: '4px', cursor: 'pointer',
                color: activeCount > 0 ? 'white' : '#003366',
                fontSize: '0.7rem', fontWeight: 700, fontFamily: 'inherit', lineHeight: 1
              }}
            >
              ▼
            </button>
          )}
        </div>

        {/* Filter dropdown */}
        {isOpen && (
          <div
            ref={filterDropdownRef}
            style={{
              position: 'absolute',
              top: '100%',
              left: frozenLeft !== undefined ? frozenLeft : 'auto',
              right: frozenLeft !== undefined ? 'auto' : 0,
              minWidth: '200px',
              background: 'white',
              border: '1px solid #D0D6DB',
              borderRadius: '8px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              zIndex: 200,
              padding: '8px',
              marginTop: '4px',
              textTransform: 'none',
              letterSpacing: 'normal',
              fontSize: '0.85rem',
              color: '#343A40',
              fontWeight: 500
            }}
          >
            {/* Search box for long lists */}
            <input
              type="text"
              placeholder="Search values..."
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px',
                border: '1px solid #E9ECEF', borderRadius: '6px',
                fontSize: '0.8rem', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
                marginBottom: '8px'
              }}
            />
            <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '8px' }}>
              {getUniqueValues(col)
                .filter((v) => !filterSearch || v.toLowerCase().includes(filterSearch.toLowerCase()))
                .map((v) => {
                  const checked = (colFilters[col] || []).includes(v);
                  return (
                    <label
                      key={v}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px',
                        padding: '6px 8px', cursor: 'pointer',
                        borderRadius: '4px',
                        background: checked ? '#FFF5EB' : 'transparent'
                      }}
                      onMouseEnter={(e) => { if (!checked) e.currentTarget.style.background = '#F8F9FA'; }}
                      onMouseLeave={(e) => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFilterValue(col, v)}
                        style={{ width: '14px', height: '14px', accentColor: '#FF6B00', cursor: 'pointer' }}
                      />
                      <span style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
                    </label>
                  );
                })}
              {getUniqueValues(col).filter((v) => !filterSearch || v.toLowerCase().includes(filterSearch.toLowerCase())).length === 0 && (
                <div style={{ padding: '10px', color: '#6C757D', fontSize: '0.8rem', textAlign: 'center' }}>No matches</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #F1F3F5', paddingTop: '8px' }}>
              <button
                onClick={() => clearColumn(col)}
                style={{ flex: 1, padding: '6px 10px', background: '#F8F9FA', color: '#343A40', border: '1px solid #E9ECEF', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >Clear</button>
              <button
                onClick={() => { setOpenFilter(null); setFilterSearch(''); }}
                style={{ flex: 1, padding: '6px 10px', background: '#003366', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >Done</button>
            </div>
          </div>
        )}
      </th>
    );
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

      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '40px 20px', minHeight: '60vh' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '15px', marginBottom: '25px' }}>
          <div>
            <h1 style={{ fontSize: '2rem', color: '#003366', fontWeight: 800, marginBottom: '5px' }}>
              Welcome, {user.name || 'Customer'}
            </h1>
            <p style={{ color: '#6C757D', fontSize: '0.95rem' }}>
              Account ID: <b>{user.userId || '-'}</b>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <Link href="/book" style={{ padding: '12px 24px', background: '#FF6B00', color: 'white', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
              + New Booking
            </Link>
            <Link href="/account" style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>
              My Account
            </Link>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
          <TabButton active={tab === 'active'} onClick={() => setTab('active')} label="🔵 Active Shipment" count={counts.active} badgeBg="#CCE5FF" badgeColor="#004085" />
          <TabButton active={tab === 'awaiting'} onClick={() => setTab('awaiting')} label="🟡 Outstanding Payment" count={counts.awaiting} badgeBg="#FFE5B4" badgeColor="#8B4500" />
          <TabButton active={tab === 'paid'} onClick={() => setTab('paid')} label="🟢 Paid & Completed" count={counts.paid} badgeBg="#D4EDDA" badgeColor="#155724" />
          <TabButton active={tab === 'cancelled'} onClick={() => setTab('cancelled')} label="⚫ Cancelled" count={counts.cancelled} badgeBg="#E9ECEF" badgeColor="#495057" />
        </div>

        {summaryCardConfig && !loading && !error && (
          <div style={{
            background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            padding: '20px 25px', marginBottom: '20px', borderLeft: '5px solid #FF6B00',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px'
          }}>
            <div>
              <div style={{ fontWeight: 800, color: '#003366', fontSize: '1.1rem' }}>{summaryCardConfig.label}</div>
              <div style={{ color: '#6C757D', fontSize: '0.85rem' }}>
                {summaryCardConfig.data.count} shipment{summaryCardConfig.data.count !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FF6B00' }}>
              {summaryCardConfig.data.currency} {Number(summaryCardConfig.data.total).toFixed(2)}
            </div>
          </div>
        )}

        {!loading && !error && (
          <div style={{
            background: 'white', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
            padding: '15px', marginBottom: '20px',
            display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center'
          }}>
            {hasAnyFilter && (
              <button
                onClick={clearAllFilters}
                style={{ padding: '10px 16px', background: '#FFF5EB', color: '#FF6B00', border: '2px solid #FF6B00', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}
              >
                ✕ Clear Filters ({Object.values(colFilters).reduce((n, arr) => n + arr.length, 0)})
              </button>
            )}

            <div style={{ position: 'relative', marginLeft: 'auto' }} ref={downloadMenuRef}>
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
                  <button onClick={() => handleDownload('pdf')} style={{ display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, color: '#003366', borderBottom: '1px solid #F1F3F5' }}>📄 PDF (.pdf)</button>
                  <button onClick={() => handleDownload('csv')} style={{ display: 'block', width: '100%', padding: '12px 16px', textAlign: 'left', background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.85rem', fontWeight: 600, color: '#003366' }}>📊 Excel / CSV (.csv)</button>
                </div>
              )}
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ width: '45px', height: '45px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 15px' }} />
            <p style={{ color: '#6C757D' }}>Loading...</p>
          </div>
        )}

        {error && !loading && (
          <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '10px', padding: '15px 20px', marginBottom: '20px' }}>
            {error}
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
              <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem', minWidth: '1650px', tableLayout: 'fixed', width: '100%' }}>
                <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                  <tr>
                    <HeaderCell col="tracking" label="Tracking #" width={COL_W_TRACKING} frozenLeft={FROZEN_LEFT_TRACKING} />
                    <HeaderCell col="mode" label="Mode" width={COL_W_MODE} frozenLeft={FROZEN_LEFT_MODE} />
                    <HeaderCell col="route" label="Route" width={COL_W_ROUTE} frozenLeft={FROZEN_LEFT_ROUTE} hasShadow={true} />
                    <HeaderCell col="shipper" label="Shipper" width={150} />
                    <HeaderCell col="none" label="Recipient" width={150} />
                    <HeaderCell col="status" label="Status" width={140} />
                    <HeaderCell col="none" label="Booking Wt" width={110} />
                    <HeaderCell col="none" label="Actual Wt" width={105} />
                    <HeaderCell col="none" label="Cost" width={115} />
                    <HeaderCell col="payment" label="Payment" width={120} />
                    <HeaderCell col="none" label="Booked" width={120} />
                    <HeaderCell col="none" label="ETA" width={125} />
                    <HeaderCell col="none" label="Actions" width={230} />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s, i) => {
                    const sc = statusClass(s.status);
                    const pc = paymentClass(s.paymentStatus);
                    const statusLower = String(s.status).toLowerCase();
                    const isBooked = statusLower === 'booked';
                    const isCancellationPending = statusLower.includes('cancellation');
                    const isCancelled = statusLower === 'cancelled';
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
                        <td style={{ ...TD_STYLE, width: 140 }}>
                          <span style={{ background: sc.bg, color: sc.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s.status}</span>
                        </td>
                        <td style={{ ...TD_STYLE, width: 110 }}>{s.bookingWeight ? s.bookingWeight + ' kg' : '-'}</td>
                        <td style={{ ...TD_STYLE, width: 105 }}>{s.actualWeight ? s.actualWeight + ' kg' : <span style={{ color: '#ADB5BD', fontStyle: 'italic' }}>TBA</span>}</td>
                        <td style={{ ...TD_STYLE, width: 115 }}>
                          {hasCost
                            ? <span style={{ fontWeight: 700, color: '#003366' }}>{Number(s.shippingCost).toFixed(2)} {s.currency}</span>
                            : <span style={{ color: '#ADB5BD', fontStyle: 'italic', fontWeight: 700 }}>TBA</span>}
                        </td>
                        <td style={{ ...TD_STYLE, width: 120 }}>
                          <span style={{ background: pc.bg, color: pc.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{s.paymentStatus || 'Unpaid'}</span>
                        </td>
                        <td style={{ ...TD_STYLE, width: 120 }}>{formatDate(s.bookedAt)}</td>
                        <td style={{ ...TD_STYLE, width: 125 }}>
                          <span style={{ color: '#FF6B00', fontWeight: 800 }}>
                            {s.estimatedDelivery ? formatDate(s.estimatedDelivery) : 'Pending'}
                          </span>
                        </td>
                        <td style={{ ...TD_STYLE, width: 230 }}>
                          {tab === 'active' && (
                            <>
                              <Link href={'/track?tn=' + s.trackingNumber} style={{ padding: '5px 10px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', marginRight: '4px' }}>View</Link>
                              <a href={'/api/pdf/booking/' + s.trackingNumber} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 10px', background: '#00A86B', color: 'white', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', marginRight: '4px' }}>PDF</a>
                              {isBooked && (
                                <button onClick={() => { setCancelModal({ trackingNumber: s.trackingNumber }); setCancelReason(''); setCancelError(''); }} style={{ padding: '5px 10px', background: 'transparent', color: '#DC3545', border: '2px solid #DC3545', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
                              )}
                              {isCancellationPending && (
                                <span style={{ padding: '5px 10px', background: '#FFE5B4', color: '#8B4500', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, fontStyle: 'italic' }}>Pending</span>
                              )}
                            </>
                          )}
                          {tab === 'cancelled' && isCancelled && (
                            <span style={{ padding: '5px 10px', background: '#E9ECEF', color: '#495057', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, fontStyle: 'italic' }}>Cancelled</span>
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

      {cancelModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: 'white', maxWidth: '500px', width: '100%', borderRadius: '16px', padding: '30px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ color: '#003366', fontSize: '1.25rem', margin: 0 }}>Request Cancellation</h2>
              <button onClick={() => setCancelModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6C757D' }}>✕</button>
            </div>
            <div style={{ background: '#FFF5EB', padding: '12px 15px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.9rem', borderLeft: '3px solid #FF6B00' }}>
              Tracking: <b>{cancelModal.trackingNumber}</b>
            </div>
            <p style={{ color: '#6C757D', fontSize: '0.9rem', marginBottom: '15px' }}>Please tell us why you want to cancel this booking. Our admin team will review your request.</p>
            {cancelError && (
              <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '8px', padding: '12px 16px', marginBottom: '15px', fontSize: '0.85rem' }}>{cancelError}</div>
            )}
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, marginBottom: '6px' }}>Reason for Cancellation *</label>
            <textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="e.g., Incorrect address, changed mind, shipment delayed too long..." style={{ width: '100%', padding: '12px', fontSize: '0.9rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', minHeight: '100px', resize: 'vertical', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => setCancelModal(null)} disabled={cancelLoading} style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={submitCancel} disabled={cancelLoading} style={{ padding: '12px 24px', background: '#DC3545', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: cancelLoading ? 'not-allowed' : 'pointer', opacity: cancelLoading ? 0.6 : 1, fontFamily: 'inherit' }}>
                {cancelLoading ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
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
