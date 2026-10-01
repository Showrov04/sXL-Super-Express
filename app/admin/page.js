'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';
import BillingPanel from '../components/BillingPanel';
import CancellationPanel from '../components/CancellationPanel';
import CreditRequestsPanel from '../components/CreditRequestsPanel';

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
      cursor: 'pointer',
      padding: '12px 22px',
      borderRadius: '10px 10px 0 0',
      fontWeight: 700,
      fontSize: '0.9rem',
      border: 'none',
      background: active ? '#FF6B00' : '#E9ECEF',
      color: active ? 'white' : '#003366',
      fontFamily: 'inherit',
      whiteSpace: 'nowrap'
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
  const [shipperList, setShipperList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [counts, setCounts] = useState({ active: 0, awaiting: 0, paid: 0, total: 0 });
  const [error, setError] = useState('');

  const [quTn, setQuTn] = useState('');
  const [quStatus, setQuStatus] = useState('Booked');
  const [quLocation, setQuLocation] = useState('');
  const [quEta, setQuEta] = useState('');
  const [quNotes, setQuNotes] = useState('');
  const [quMsg, setQuMsg] = useState('');
  const [quLoading, setQuLoading] = useState(false);

  useEffect(() => {
    loadShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, shipperFilter]);

  async function loadShipments() {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('sxl_token');
    if (!token) return;

    try {
      const params = new URLSearchParams({ tab });
      if (shipperFilter) params.set('shipper', shipperFilter);
      if (search) params.set('search', search);

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

  async function handleQuickUpdate(e) {
    e.preventDefault();
    setQuMsg('');
    if (!quTn.trim()) { setQuMsg('Please enter a tracking number.'); return; }

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
      setQuTn(''); setQuLocation(''); setQuEta(''); setQuNotes('');
      setQuLoading(false);
      setTimeout(loadShipments, 500);
    } catch (err) { setQuMsg('❌ Connection error.'); setQuLoading(false); }
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

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <StatCard num={counts.total} label="Total" color="#FF6B00" />
        <StatCard num={counts.active} label="Active" color="#CCE5FF" />
        <StatCard num={counts.awaiting} label="Awaiting Payment" color="#FFE5B4" />
        <StatCard num={counts.paid} label="Paid & Completed" color="#D4EDDA" />
      </div>

      <form onSubmit={handleSearch} style={{
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
        marginBottom: '20px', background: 'white', padding: '15px',
        borderRadius: '10px', boxShadow: '0 4px 20px rgba(0
