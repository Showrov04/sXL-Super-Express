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
  const [toast, setToast] = useState('');

  const [colFilters, setColFilters] = useState({
    tracking: [], mode: [], shipper: [], route: [], status: [], payment: [],
  });
  const [openFilter, setOpenFilter] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');

  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const downloadMenuRef = useRef(null);
  const filterDropdownRef = useRef(null);

  // Status update modal
  const [statusModal, setStatusModal] = useState(null);
  const [suTracking, setSuTracking] = useState('');
  const [suCurrentStatus, setSuCurrentStatus] = useState('');
  const [suNewStatus, setSuNewStatus] = useState('');
  const [suLocation, setSuLocation] = useState('');
  const [suEta, setSuEta] = useState('');
  const [suNotes, setSuNotes] = useState('');
  const [suActualWeight, setSuActualWeight] = useState('');
  const [suActualCbm, setSuActualCbm] = useState('');
  const [suLoading, setSuLoading] = useState(false);
  const [suError, setSuError] = useState('');
  const [suFetchingLocation, setSuFetchingLocation] = useState(false);

  // Warehouse modal
  const [whModal, setWhModal] = useState(null);
  const [whFields, setWhFields] = useState({ name: '', address: '', city: '', state: '', country: '', phone: '', email: '', hours: '' });
  const [whLoading, setWhLoading] = useState(false);
  const [whError, setWhError] = useState('');
  const [whFetchingDefaults, setWhFetchingDefaults] = useState(false);

  const [filesModal, setFilesModal] = useState(null);

  // Edit Booking modal
  const [editModal, setEditModal] = useState(null);
  const [editFields, setEditFields] = useState({});
  const [editReason, setEditReason] = useState('');
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState('');

  useEffect(() => {
    loadShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, shipperFilter]);

  useEffect(() => {
    setColFilters({ tracking: [], mode: [], shipper: [], route: [], status: [], payment: [] });
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

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    const modalOpen = statusModal || whModal || filesModal || editModal;
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [statusModal, whModal, filesModal, editModal]);

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
    setColFilters({ tracking: [], mode: [], shipper: [], route: [], status: [], payment: [] });
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

  // ===== OPEN STATUS MODAL =====
  async function openStatusModal(s) {
    const hasBeenUpdated = !!s.lastUpdate && String(s.status || '').toLowerCase() !== 'booked';
    if (hasBeenUpdated) {
      const dateStr = formatDate(s.lastUpdate);
      const proceed = window.confirm('Status was last updated on ' + dateStr + '. Edit it?');
      if (!proceed) return;
    }

    setStatusModal({ shipment: s });
    setSuTracking(s.trackingNumber);
    setSuCurrentStatus(s.status || '');
    setSuNewStatus(s.status || '');
    setSuEta(s.estimatedDelivery || '');
    setSuNotes('');
    setSuError('');
    setSuLocation('');
    setSuActualWeight('');
    setSuActualCbm('');
    setSuFetchingLocation(true);

    try {
      const token = localStorage.getItem('sxl_token');
      const res = await fetch('/api/admin/shipments/tracking-history?tn=' + encodeURIComponent(s.trackingNumber), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();
      if (data.success && data.location) setSuLocation(data.location);
    } catch (e) { /* silent */ }

    setSuFetchingLocation(false);
  }

  function closeStatusModal() {
    setStatusModal(null);
    setSuTracking('');
    setSuCurrentStatus('');
    setSuNewStatus('');
    setSuLocation('');
    setSuEta('');
    setSuNotes('');
    setSuActualWeight('');
    setSuActualCbm('');
    setSuError('');
  }

  async function handleStatusUpdate() {
    setSuError('');
    if (!suNewStatus) { setSuError('Please select a new status.'); return; }

    setSuLoading(true);
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          action: 'updateStatus',
          trackingNumber: suTracking.trim(),
          newStatus: suNewStatus,
          location: suLocation,
          notes: suNotes,
          eta: suEta,
          actualWeight: suActualWeight,
          actualCbm: suActualCbm,
        }),
      });
      const data = await res.json();
      if (!data.success) { setSuError(data.error || 'Update failed.'); setSuLoading(false); return; }
      closeStatusModal();
      setSuLoading(false);
      setToast('✅ Status updated to "' + suNewStatus + '" for ' + suTracking);
      setTimeout(loadShipments, 500);
    } catch (err) { setSuError('Connection error.'); setSuLoading(false); }
  }

  // ===== OPEN EDIT BOOKING MODAL =====
  function openEditModal(s) {
    const alreadyEdited = String(s.status || '').toLowerCase() !== 'booked';
    if (alreadyEdited) {
      const proceed = window.confirm(
        'This booking has already moved past "Booked" status. Editing is normally locked after pickup.\n\nContinue editing?'
      );
      if (!proceed) return;
    }

    setEditModal({ shipment: s });
    setEditFields({
      shipperRef: s.shipperRef || '',
      shipmentDate: s.shipmentDate ? String(s.shipmentDate).slice(0, 10) : '',
      parcelType: s.parcelType || '',
      parcelTypeCustom: s.parcelTypeCustom || '',
      deliveryTimeline: s.deliveryTimeline || '',
      originCountry: s.originCountry || '',

      senderName: s.senderName || '',
      senderPhone: s.senderPhone || '',
      senderEmail: s.senderEmail || '',

      recipientName: s.recipientName || '',
      recipientPhone: s.recipientPhone || '',
      recipientEmail: s.recipientEmail || '',
      recipientBin: s.recipientBin || '',
      recipientAddress: s.recipientAddress || '',
      recipientCity: s.recipientCity || '',
      recipientState: s.recipientState || '',

      description: s.description || '',
      packages: s.packages != null ? String(s.packages) : '',
      totalWeight: s.bookingWeight != null ? String(s.bookingWeight) : '',
      totalCbm: s.actualCbm != null ? String(s.actualCbm) : '',
      hsCode: s.hsCode || '',
      dimLength: s.dimLength != null ? String(s.dimLength) : '',
      dimWidth: s.dimWidth != null ? String(s.dimWidth) : '',
      dimHeight: s.dimHeight != null ? String(s.dimHeight) : '',
      packagingType: s.packagingType || '',
      packagingTypeCustom: s.packagingTypeCustom || '',
      totalValue: s.totalValue != null ? String(s.totalValue) : '',
      valueCurrency: s.valueCurrency || 'USD',

      pickupAddress: s.pickupAddress || '',
      pickupCity: s.pickupCity || '',
      pickupState: s.pickupState || '',
      pickupCountry: s.pickupCountry || '',
      parcelReadyDate: s.parcelReadyDate ? String(s.parcelReadyDate).slice(0, 10) : '',
      parcelReadyTime: s.parcelReadyTime ? String(s.parcelReadyTime).slice(0, 5) : '',

      paymentTerms: s.paymentTerms || '',
      paymentMethod: s.paymentMethod || '',
      freightBillTo: s.freightBillTo || '',
      dutyTaxBillTo: s.dutyTaxBillTo || '',

      customService: s.customService || 'sxl',
      deliveryService: s.deliveryService || 'sxl',
      specialInstruction: s.specialInstruction || '',
    });
    setEditReason('');
    setEditError('');
  }

  function closeEditModal() {
    setEditModal(null);
    setEditFields({});
    setEditReason('');
    setEditError('');
    setEditSaving(false);
  }

  function setEditField(key, value) {
    setEditFields((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSaveEdit() {
    setEditError('');
    if (!editFields.senderName || !editFields.senderName.trim()) { setEditError('Sender name is required.'); return; }
    if (!editFields.recipientName || !editFields.recipientName.trim()) { setEditError('Recipient name is required.'); return; }
    if (!editFields.description || !editFields.description.trim()) { setEditError('Description is required.'); return; }

    setEditSaving(true);
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          action: 'editBooking',
          trackingNumber: editModal.shipment.trackingNumber,
          fields: editFields,
          changeReason: editReason.trim(),
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setEditError(data.error || 'Failed to save.');
        setEditSaving(false);
        return;
      }

      const tn = editModal.shipment.trackingNumber;
      closeEditModal();
      setEditSaving(false);

      if (data.noChanges) {
        setToast('ℹ️ No changes to save for ' + tn);
      } else if (data.publicChangeCount > 0) {
        setToast('✅ Booking updated for ' + tn + ' (' + data.publicChangeCount + ' change' + (data.publicChangeCount !== 1 ? 's' : '') + ')');
      } else {
        setToast('✅ Booking updated for ' + tn + ' (internal only)');
      }

      setTimeout(loadShipments, 500);
    } catch (err) {
      setEditError('Connection error: ' + err.message);
      setEditSaving(false);
    }
  }

  // ===== WAREHOUSE MODAL =====
  async function openWarehouseModal(s) {
    setWhModal({ trackingNumber: s.trackingNumber, senderName: s.senderName });
    setWhFields({ name: '', address: '', city: '', state: '', country: '', phone: '', email: '', hours: '' });
    setWhError('');
    setWhFetchingDefaults(true);

    try {
      const token = localStorage.getItem('sxl_token');
      const res = await fetch('/api/admin/send-warehouse', {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();
      if (data.success && data.warehouse) setWhFields(data.warehouse);
    } catch (e) { /* silent */ }

    setWhFetchingDefaults(false);
  }

  async function handleSendWarehouseEmail() {
    setWhError('');
    if (!whFields.name.trim()) { setWhError('Warehouse name is required.'); return; }
    if (!whFields.address.trim()) { setWhError('Warehouse address is required.'); return; }
    if (!whFields.country.trim()) { setWhError('Country is required.'); return; }

    setWhLoading(true);
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/send-warehouse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ trackingNumber: whModal.trackingNumber, warehouse: whFields }),
      });
      const data = await res.json();
      if (!data.success) { setWhError(data.error || 'Failed to send.'); setWhLoading(false); return; }
      setWhModal(null);
      setWhLoading(false);
      setToast('✅ Warehouse details sent to ' + whModal.senderName + '!');
      setTimeout(loadShipments, 500);
    } catch (err) { setWhError('Connection error: ' + err.message); setWhLoading(false); }
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

  function renderActualCell(s) {
    const mode = String(s.shipMode || '').toUpperCase();
    const isSeaRow = mode === 'SEA';

    if (isSeaRow) {
      const weight = s.actualWeight;
      const cbm = s.actualCbm;
      const hasWeight = weight !== null && weight !== undefined && parseFloat(weight) > 0;
      const hasCbm = cbm !== null && cbm !== undefined && parseFloat(cbm) > 0;
      if (!hasWeight && !hasCbm) {
        return <span style={{ color: '#ADB5BD', fontStyle: 'italic' }}>TBA</span>;
      }
      return (
        <div style={{ lineHeight: 1.4 }}>
          {hasWeight && <div style={{ color: '#0D6EFD', fontWeight: 700 }}>{parseFloat(weight).toFixed(2)} kg</div>}
          {hasCbm && <div style={{ color: '#0D6EFD', fontWeight: 700 }}>{parseFloat(cbm).toFixed(2)} CBM</div>}
        </div>
      );
    }

    const weight = s.actualWeight;
    const hasWeight = weight !== null && weight !== undefined && parseFloat(weight) > 0;
    if (!hasWeight) {
      return <span style={{ color: '#ADB5BD', fontStyle: 'italic' }}>TBA</span>;
    }
    return <span style={{ color: '#0D6EFD', fontWeight: 700 }}>{parseFloat(weight).toFixed(2)} kg</span>;
  }

  function HeaderCell({ col, label, width, frozenLeft, hasShadow }) {
    const isFilterable = ['tracking', 'mode', 'shipper', 'route', 'status', 'payment'].includes(col);
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
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: '#003366', color: 'white', borderRadius: '10px',
          padding: '14px 24px', fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 99999, maxWidth: '90%', textAlign: 'center'
        }}>
          {toast}
        </div>
      )}

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
                  <HeaderCell col="none" label="Actual Wt" width={130} />
                  <HeaderCell col="none" label="Cost" width={115} />
                  <HeaderCell col="payment" label="Payment" width={120} />
                  <HeaderCell col="none" label="Booked" width={120} />
                  <HeaderCell col="none" label="ETA" width={125} />
                  <HeaderCell col="none" label="Actions" width={520} />
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
                  const whSent = !!s.warehouseSentAt;
                  const wasUpdated = String(s.status || '').toLowerCase() !== 'booked';
                  const isActiveTab = tab === 'active';
                  const showWarehouseBtn = isActiveTab && isSelfDelivery;

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
                      <td style={{ ...TD_STYLE, width: 130 }}>{renderActualCell(s)}</td>
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
                      <td style={{ ...TD_STYLE, width: 520 }}>
                        {tab !== 'cancelled' && (
                          <>
                            {isActiveTab && (
                              <>
                                <button
                                  onClick={() => openStatusModal(s)}
                                  style={{
                                    padding: '5px 10px',
                                    background: wasUpdated ? '#E9ECEF' : '#FF6B00',
                                    color: wasUpdated ? '#495057' : 'white',
                                    border: 'none', borderRadius: '6px',
                                    fontWeight: 700, fontSize: '0.72rem',
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    marginRight: '4px', whiteSpace: 'nowrap'
                                  }}
                                >
                                  {wasUpdated ? '✅ Status Updated' : '🔄 Update Status'}
                                </button>

                                <button
                                  onClick={() => openEditModal(s)}
                                  style={{
                                    padding: '5px 10px',
                                    background: '#003366',
                                    color: 'white',
                                    border: 'none', borderRadius: '6px',
                                    fontWeight: 700, fontSize: '0.72rem',
                                    cursor: 'pointer', fontFamily: 'inherit',
                                    marginRight: '4px', whiteSpace: 'nowrap'
                                  }}
                                >
                                  ✏️ Edit Booking
                                </button>
                              </>
                            )}

                            {rowHasFiles && (
                              <button onClick={() => openFiles(s)} style={{ padding: '5px 10px', background: '#8B5CF6', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', marginRight: '4px' }}>📎 Files</button>
                            )}

                            {showWarehouseBtn && (
                              <>
                                <button
                                  onClick={() => openWarehouseModal(s)}
                                  style={{
                                    padding: '5px 10px',
                                    background: whSent ? '#28A745' : '#DC3545',
                                    color: 'white', border: 'none', borderRadius: '6px',
                                    fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer',
                                    fontFamily: 'inherit', marginRight: '4px', whiteSpace: 'nowrap'
                                  }}
                                >
                                  {whSent ? '✅ Warehouse Sent' : '📧 Send Warehouse'}
                                </button>
                                {whSent && (
                                  <button
                                    onClick={() => openWarehouseModal(s)}
                                    style={{
                                      padding: '5px 8px', background: 'transparent', color: '#003366',
                                      border: '1px solid #E9ECEF', borderRadius: '6px',
                                      fontWeight: 600, fontSize: '0.68rem', cursor: 'pointer',
                                      fontFamily: 'inherit', textDecoration: 'underline'
                                    }}
                                  >
                                    Resend
                                  </button>
                                )}
                              </>
                            )}
                          </>
                        )}
                        {tab === 'cancelled' && (
                          <span style={{ color: '#ADB5BD', fontStyle: 'italic' }}>—</span>
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

      {/* ============ STATUS UPDATE MODAL ============ */}
      {statusModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '20px', overflowY: 'auto'
        }}>
          <div style={{
            background: 'white', maxWidth: '640px', width: '100%',
            borderRadius: '16px', padding: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            marginTop: '40px', marginBottom: '40px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ color: '#003366', fontSize: '1.3rem', margin: 0 }}>🔄 Update Status</h2>
                <div style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '4px' }}>
                  {statusModal.shipment.trackingNumber} · {statusModal.shipment.shipperName}
                </div>
                <div style={{ color: '#003366', fontSize: '0.85rem', marginTop: '2px', fontWeight: 700 }}>
                  Route: {statusModal.shipment.origin || '—'} → {statusModal.shipment.destination || '—'} · Mode: {statusModal.shipment.shipmentType || statusModal.shipment.shipMode || '—'}
                </div>
              </div>
              <button onClick={closeStatusModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6C757D' }}>✕</button>
            </div>

            <div style={{ background: '#FFF5EB', border: '1px solid #FF6B00', borderRadius: '8px', padding: '10px 14px', marginBottom: '18px', fontSize: '0.9rem', color: '#8B4500' }}>
              <b>Current Status:</b> <span style={{ fontWeight: 700 }}>{suCurrentStatus}</span>
            </div>

            {suError && (
              <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', fontSize: '0.9rem' }}>
                {suError}
              </div>
            )}

            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>New Status *</label>
                <select value={suNewStatus} onChange={(e) => setSuNewStatus(e.target.value)}
                  style={{ width: '100%', padding: '12px 15px', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }}>
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
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>
                  Location {suFetchingLocation && <span style={{ color: '#FF6B00', fontSize: '0.72rem' }}>(loading last...)</span>}
                </label>
                <input type="text" value={suLocation} onChange={(e) => setSuLocation(e.target.value)} placeholder="City, Country"
                  style={{ width: '100%', padding: '12px 15px', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <div style={{ background: '#F8F9FA', border: '1px solid #E9ECEF', borderRadius: '10px', padding: '14px 16px' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#003366', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📦 Actual Measurements (optional)
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: statusModal && String(statusModal.shipment.shipMode || '').toUpperCase() === 'SEA' ? '1fr 1fr' : '1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#343A40', marginBottom: '5px' }}>Actual Weight (kg)</label>
                    <input type="number" step="0.01" value={suActualWeight} onChange={(e) => setSuActualWeight(e.target.value)} placeholder="e.g., 5.5"
                      style={{ width: '100%', padding: '11px 13px', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                  </div>
                  {statusModal && String(statusModal.shipment.shipMode || '').toUpperCase() === 'SEA' && (
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#343A40', marginBottom: '5px' }}>Actual Volume (CBM)</label>
                      <input type="number" step="0.01" value={suActualCbm} onChange={(e) => setSuActualCbm(e.target.value)} placeholder="e.g., 1.2"
                        style={{ width: '100%', padding: '11px 13px', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  )}
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6C757D', marginTop: '8px', fontStyle: 'italic' }}>
                  Leave blank to keep the current values.
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>Estimated Delivery</label>
                <input type="date" value={suEta} onChange={(e) => setSuEta(e.target.value)}
                  style={{ width: '100%', padding: '12px 15px', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>Notes</label>
                <input type="text" value={suNotes} onChange={(e) => setSuNotes(e.target.value)} placeholder="Optional"
                  style={{ width: '100%', padding: '12px 15px', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px', flexWrap: 'wrap' }}>
              <button onClick={closeStatusModal} disabled={suLoading}
                style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleStatusUpdate} disabled={suLoading}
                style={{ padding: '12px 24px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: suLoading ? 'not-allowed' : 'pointer', opacity: suLoading ? 0.6 : 1, fontFamily: 'inherit' }}>
                {suLoading ? 'Updating...' : '✅ Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ EDIT BOOKING MODAL ============ */}
      {editModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '20px'
        }}>
          <div style={{
            background: '#F8F9FA',
            maxWidth: '1000px', width: '100%',
            borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            marginTop: '20px', marginBottom: '20px',
            display: 'flex', flexDirection: 'column',
            maxHeight: 'calc(100vh - 40px)'
          }}>
            <div style={{
              background: 'white',
              borderRadius: '16px 16px 0 0',
              padding: '20px 28px',
              borderBottom: '1px solid #E9ECEF',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px',
              flexWrap: 'wrap',
              flexShrink: 0
            }}>
              <div>
                <h2 style={{ color: '#003366', fontSize: '1.35rem', margin: 0 }}>✏️ Edit Booking</h2>
                <div style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '4px' }}>
                  <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366' }}>
                    {editModal.shipment.trackingNumber}
                  </span>
                  {' · '}
                  {editModal.shipment.shipperName}
                  {' · '}
                  <span style={{ background: '#FFF3CD', color: '#856404', padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase' }}>
                    {editModal.shipment.status}
                  </span>
                </div>
                <div style={{ color: '#003366', fontSize: '0.82rem', marginTop: '4px', fontWeight: 700 }}>
                  Route: {editModal.shipment.origin || '—'} → {editModal.shipment.destination || '—'} · Mode: {editModal.shipment.shipmentType || editModal.shipment.shipMode || '—'}
                </div>
              </div>
              <button onClick={closeEditModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6C757D', lineHeight: 1 }}>✕</button>
            </div>

            <div style={{ background: '#FFF5EB', borderBottom: '1px solid #FF6B00', padding: '10px 28px', fontSize: '0.82rem', color: '#8B4500', flexShrink: 0 }}>
              ⚠️ Only customer-facing changes will be logged as <b>"Booking Edited"</b> on the tracking timeline. Internal changes (payment, billing) are saved silently.
            </div>

            <div style={{ overflowY: 'auto', padding: '20px 28px', flex: 1 }}>
              {editError && (
                <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', fontSize: '0.9rem' }}>
                  {editError}
                </div>
              )}

              {/* Reason for change — top of modal */}
              <div style={{
                background: 'white', borderRadius: '12px', padding: '18px 22px',
                marginBottom: '16px', border: '2px solid #FF6B00',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
              }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 800, color: '#FF6B00', marginBottom: '4px' }}>
                  📝 Reason for Change (optional)
                </div>
                <div style={{ fontSize: '0.78rem', color: '#6C757D', marginBottom: '12px' }}>
                  If you fill this in, it will appear on the customer's tracking timeline along with the changed fields.
                </div>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g., Customer requested switch to SEA due to lower cost"
                  style={{
                    width: '100%', padding: '11px 14px',
                    fontSize: '0.9rem', border: '2px solid #E9ECEF',
                    borderRadius: '8px', outline: 'none',
                    fontFamily: 'inherit', boxSizing: 'border-box',
                    minHeight: '60px', resize: 'vertical'
                  }}
                />
              </div>

              {/* Card 1 */}
              <EditCard title="📋 Reference & Mode">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <EditField label="Shipper Reference" value={editFields.shipperRef} onChange={(v) => setEditField('shipperRef', v)} />
                  <EditField label="Shipment Date" type="date" value={editFields.shipmentDate} onChange={(v) => setEditField('shipmentDate', v)} />
                </div>

                <div style={{ marginTop: '14px', padding: '12px 14px', background: '#F8F9FA', borderRadius: '8px', fontSize: '0.82rem', color: '#6C757D' }}>
                  <b style={{ color: '#003366' }}>Ship Mode:</b> {editModal.shipment.shipmentType || editModal.shipment.shipMode || '—'}
                  {editModal.shipment.seaLoadType && <> · <b style={{ color: '#003366' }}>Load:</b> {editModal.shipment.seaLoadType}</>}
                  {' · '}
                  <span style={{ fontStyle: 'italic' }}>Ship mode cannot be changed after booking.</span>
                </div>

                {String(editModal.shipment.shipMode || '').toUpperCase() === 'AIR' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#343A40', marginBottom: '5px' }}>Parcel Type</label>
                      <select value={editFields.parcelType || ''} onChange={(e) => setEditField('parcelType', e.target.value)}
                        style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                        <option value="">-- Select --</option>
                        <option>Document</option>
                        <option>No-Document (Sample)</option>
                        <option>Special Parcel</option>
                        <option>Others</option>
                      </select>
                    </div>
                    {editFields.parcelType === 'Others' && (
                      <EditField label="Parcel Type (custom)" value={editFields.parcelTypeCustom} onChange={(v) => setEditField('parcelTypeCustom', v)} />
                    )}
                  </div>
                )}

                {editFields.parcelType === 'Special Parcel' && (
                  <div style={{ marginTop: '14px' }}>
                    <EditField label="Delivery Timeline" value={editFields.deliveryTimeline} onChange={(v) => setEditField('deliveryTimeline', v)} />
                  </div>
                )}
              </EditCard>

              {/* Card 2 */}
              <EditCard title="📤 Sender (Shipper)">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <EditField label="Name *" value={editFields.senderName} onChange={(v) => setEditField('senderName', v)} />
                  <EditField label="Phone" value={editFields.senderPhone} onChange={(v) => setEditField('senderPhone', v)} />
                  <EditField label="Email" value={editFields.senderEmail} onChange={(v) => setEditField('senderEmail', v)} />
                </div>
              </EditCard>

              {/* Card 3 */}
              <EditCard title="📥 Recipient (Consignee)">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '14px' }}>
                  <EditField label="Name *" value={editFields.recipientName} onChange={(v) => setEditField('recipientName', v)} />
                  <EditField label="Phone" value={editFields.recipientPhone} onChange={(v) => setEditField('recipientPhone', v)} />
                  <EditField label="Email" value={editFields.recipientEmail} onChange={(v) => setEditField('recipientEmail', v)} />
                  <EditField label="BIN" value={editFields.recipientBin} onChange={(v) => setEditField('recipientBin', v)} />
                </div>
                <div style={{ marginTop: '14px' }}>
                  <EditField label="Full Address" value={editFields.recipientAddress} onChange={(v) => setEditField('recipientAddress', v)} textarea />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <EditField label="City" value={editFields.recipientCity} onChange={(v) => setEditField('recipientCity', v)} />
                  <EditField label="State" value={editFields.recipientState} onChange={(v) => setEditField('recipientState', v)} />
                </div>
              </EditCard>

              {/* Card 4 */}
              <EditCard title="📦 Shipment Details">
                <EditField label="Description of Goods *" value={editFields.description} onChange={(v) => setEditField('description', v)} textarea />

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px', marginTop: '14px' }}>
                  <EditField label="Packages" type="number" value={editFields.packages} onChange={(v) => setEditField('packages', v)} />
                  <EditField label="Weight (kg)" type="number" value={editFields.totalWeight} onChange={(v) => setEditField('totalWeight', v)} />
                  <EditField label="CBM" type="number" value={editFields.totalCbm} onChange={(v) => setEditField('totalCbm', v)} />
                  <EditField label="HS Code" value={editFields.hsCode} onChange={(v) => setEditField('hsCode', v)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <EditField label="Dim Length (cm)" type="number" value={editFields.dimLength} onChange={(v) => setEditField('dimLength', v)} />
                  <EditField label="Dim Width (cm)" type="number" value={editFields.dimWidth} onChange={(v) => setEditField('dimWidth', v)} />
                  <EditField label="Dim Height (cm)" type="number" value={editFields.dimHeight} onChange={(v) => setEditField('dimHeight', v)} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#343A40', marginBottom: '5px' }}>Packaging Type</label>
                    <select value={editFields.packagingType || ''} onChange={(e) => setEditField('packagingType', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                      <option value="">-- Select --</option>
                      <option>Carton</option>
                      <option>Pallet</option>
                      <option>Roll</option>
                      <option>Flyer</option>
                      <option>Bag / Sack</option>
                      <option>Others</option>
                    </select>
                  </div>
                  {editFields.packagingType === 'Others' && (
                    <EditField label="Packaging Type (custom)" value={editFields.packagingTypeCustom} onChange={(v) => setEditField('packagingTypeCustom', v)} />
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <EditField label="Total Value" type="number" value={editFields.totalValue} onChange={(v) => setEditField('totalValue', v)} />
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#343A40', marginBottom: '5px' }}>Value Currency</label>
                    <select value={editFields.valueCurrency || 'USD'} onChange={(e) => setEditField('valueCurrency', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                      <option>USD</option>
                      <option>HKD</option>
                      <option>CNY</option>
                      <option>BDT</option>
                    </select>
                  </div>
                </div>
              </EditCard>

              {/* Card 5 */}
              {editModal.shipment.pickupService !== false && (
                <EditCard title="🚚 Pickup Details">
                  <EditField label="Pickup Address" value={editFields.pickupAddress} onChange={(v) => setEditField('pickupAddress', v)} textarea />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginTop: '14px' }}>
                    <EditField label="City" value={editFields.pickupCity} onChange={(v) => setEditField('pickupCity', v)} />
                    <EditField label="State" value={editFields.pickupState} onChange={(v) => setEditField('pickupState', v)} />
                    <EditField label="Country" value={editFields.pickupCountry} onChange={(v) => setEditField('pickupCountry', v)} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                    <EditField label="Ready Date" type="date" value={editFields.parcelReadyDate} onChange={(v) => setEditField('parcelReadyDate', v)} />
                    <EditField label="Ready Time" type="time" value={editFields.parcelReadyTime} onChange={(v) => setEditField('parcelReadyTime', v)} />
                  </div>
                </EditCard>
              )}

              {/* Card 6 */}
              <EditCard title="💳 Payment & Billing (internal — not shown to customer)">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#343A40', marginBottom: '5px' }}>Payment Terms</label>
                    <select value={editFields.paymentTerms || ''} onChange={(e) => setEditField('paymentTerms', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                      <option value="">-- Select --</option>
                      <option>Prepaid</option>
                      <option>Collect</option>
                      <option>Credit Account</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#343A40', marginBottom: '5px' }}>Payment Method</label>
                    <select value={editFields.paymentMethod || ''} onChange={(e) => setEditField('paymentMethod', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                      <option value="">-- Select --</option>
                      <option>Bank Transfer</option>
                      <option>Cash</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#343A40', marginBottom: '5px' }}>Freight Bill To</label>
                    <select value={editFields.freightBillTo || ''} onChange={(e) => setEditField('freightBillTo', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                      <option value="">-- Select --</option>
                      <option>Shipper</option>
                      <option>Consignee</option>
                      <option>Third Party</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#343A40', marginBottom: '5px' }}>Duty & Taxes Bill To</label>
                    <select value={editFields.dutyTaxBillTo || ''} onChange={(e) => setEditField('dutyTaxBillTo', e.target.value)}
                      style={{ width: '100%', padding: '10px 14px', fontSize: '0.9rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                      <option value="">-- Select --</option>
                      <option>Shipper</option>
                      <option>Consignee</option>
                      <option>Third Party</option>
                    </select>
                  </div>
                </div>
              </EditCard>

              {/* Card 7 */}
              <EditCard title="🛠️ Services & Notes" highlight={true}>
                <div style={{ background: '#FFF5EB', borderLeft: '4px solid #FF6B00', borderRadius: '8px', padding: '10px 14px', fontSize: '0.82rem', color: '#8B4500', marginBottom: '16px' }}>
                  💡 If the shipper asks sXL to take over <b>Customs</b> or <b>Delivery</b>, switch the option below. Then go to <b>Financial &amp; Billing → Update Shipment Cost</b> to enter the new charge.
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#003366', marginBottom: '8px' }}>🛃 Customs Clearance</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <ServiceOption
                      value="sxl"
                      current={editFields.customService}
                      label="✅ Handled by sXL"
                      description="sXL manages customs clearance"
                      onChange={(v) => setEditField('customService', v)}
                    />
                    <ServiceOption
                      value="consignee"
                      current={editFields.customService}
                      label="⬜ Handled by Consignee"
                      description="Consignee is responsible for customs"
                      onChange={(v) => setEditField('customService', v)}
                    />
                  </div>
                </div>

                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#003366', marginBottom: '8px' }}>📦 Delivery Service</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    <ServiceOption
                      value="sxl"
                      current={editFields.deliveryService}
                      label="✅ Handled by sXL"
                      description="sXL delivers to the consignee"
                      onChange={(v) => setEditField('deliveryService', v)}
                    />
                    <ServiceOption
                      value="consignee"
                      current={editFields.deliveryService}
                      label="⬜ Handled by Consignee"
                      description="Consignee arranges own delivery"
                      onChange={(v) => setEditField('deliveryService', v)}
                    />
                  </div>
                </div>

                <EditField label="📝 Special Instructions" value={editFields.specialInstruction} onChange={(v) => setEditField('specialInstruction', v)} textarea />
              </EditCard>
            </div>

            <div style={{
              background: 'white',
              borderTop: '1px solid #E9ECEF',
              borderRadius: '0 0 16px 16px',
              padding: '16px 28px',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px',
              flexWrap: 'wrap',
              flexShrink: 0
            }}>
              <div style={{ fontSize: '0.8rem', color: '#6C757D' }}>
                Tracking: <b style={{ color: '#003366', fontFamily: 'Consolas, monospace' }}>{editModal.shipment.trackingNumber}</b>
              </div>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={closeEditModal} disabled={editSaving}
                  style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button onClick={handleSaveEdit} disabled={editSaving}
                  style={{ padding: '12px 28px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: editSaving ? 'not-allowed' : 'pointer', opacity: editSaving ? 0.6 : 1, fontFamily: 'inherit' }}>
                  {editSaving ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ WAREHOUSE MODAL ============ */}
      {whModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '20px', overflowY: 'auto'
        }}>
          <div style={{
            background: 'white', maxWidth: '640px', width: '100%',
            borderRadius: '16px', padding: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            marginTop: '40px', marginBottom: '40px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ color: '#003366', fontSize: '1.3rem', margin: 0 }}>📧 Send Warehouse Details</h2>
                <div style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '4px' }}>
                  To: <b>{whModal.senderName}</b> · Tracking: <b>{whModal.trackingNumber}</b>
                </div>
              </div>
              <button onClick={() => setWhModal(null)} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6C757D' }}>✕</button>
            </div>

            <div style={{ background: '#FFF5EB', borderLeft: '4px solid #FF6B00', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.85rem', color: '#8B4500' }}>
              ✏️ You can edit any field below. Changes apply to this email only.
              {whFetchingDefaults && <span style={{ marginLeft: '8px', fontStyle: 'italic' }}>(loading defaults...)</span>}
            </div>

            {whError && (
              <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', fontSize: '0.9rem' }}>
                {whError}
              </div>
            )}

            <div style={{ display: 'grid', gap: '14px' }}>
              <WhField label="Warehouse Name *" value={whFields.name} onChange={(v) => setWhFields({ ...whFields, name: v })} />
              <WhField label="Full Address *" value={whFields.address} onChange={(v) => setWhFields({ ...whFields, address: v })} textarea />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <WhField label="City" value={whFields.city} onChange={(v) => setWhFields({ ...whFields, city: v })} />
                <WhField label="State" value={whFields.state} onChange={(v) => setWhFields({ ...whFields, state: v })} />
              </div>
              <WhField label="Country *" value={whFields.country} onChange={(v) => setWhFields({ ...whFields, country: v })} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <WhField label="Phone" value={whFields.phone} onChange={(v) => setWhFields({ ...whFields, phone: v })} />
                <WhField label="Email" value={whFields.email} onChange={(v) => setWhFields({ ...whFields, email: v })} />
              </div>
              <WhField label="Operating Hours" value={whFields.hours} onChange={(v) => setWhFields({ ...whFields, hours: v })} placeholder="e.g., Mon–Fri 9am–6pm" />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px', flexWrap: 'wrap' }}>
              <button onClick={() => setWhModal(null)} disabled={whLoading}
                style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleSendWarehouseEmail} disabled={whLoading}
                style={{ padding: '12px 24px', background: '#DC3545', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: whLoading ? 'not-allowed' : 'pointer', opacity: whLoading ? 0.6 : 1, fontFamily: 'inherit' }}>
                {whLoading ? 'Sending...' : '📧 Send Email'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ FILES MODAL ============ */}
      {filesModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}>
          <div style={{ background: 'white', maxWidth: '600px', width: '100%', borderRadius: '16px', padding: '30px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', marginTop: '40px', marginBottom: '40px' }}>
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
   Edit modal helpers
   ============================================================ */
function EditCard({ title, children, highlight }) {
  return (
    <div style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px 22px',
      marginBottom: '16px',
      border: highlight ? '2px solid #FF6B00' : '1px solid #E9ECEF',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <div style={{
        fontSize: '0.95rem',
        fontWeight: 800,
        color: highlight ? '#FF6B00' : '#003366',
        marginBottom: '16px',
        paddingBottom: '10px',
        borderBottom: highlight ? '2px solid #FF6B00' : '1px solid #F1F3F5'
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ServiceOption({ value, current, label, description, onChange }) {
  const selected = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      style={{
        flex: 1, minWidth: '220px',
        padding: '14px 16px',
        border: '3px solid ' + (selected ? '#28A745' : '#E9ECEF'),
        background: selected ? '#E8F7EF' : 'white',
        borderRadius: '10px', cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left'
      }}
    >
      <div style={{ fontWeight: 800, color: selected ? '#155724' : '#343A40', fontSize: '0.92rem', marginBottom: '3px' }}>
        {label}
      </div>
      <div style={{ fontSize: '0.78rem', color: '#6C757D' }}>
        {description}
      </div>
    </button>
  );
}

function WhField({ label, value, onChange, textarea, placeholder }) {
  const baseStyle = {
    width: '100%', padding: '10px 14px', fontSize: '0.9rem',
    border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box'
  };
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#343A40', marginBottom: '5px' }}>{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...baseStyle, minHeight: '70px', resize: 'vertical' }} />
      ) : (
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={baseStyle} />
      )}
    </div>
  );
}

function EditField({ label, value, onChange, type = 'text', textarea = false }) {
  const baseStyle = {
    width: '100%', padding: '10px 14px', fontSize: '0.9rem',
    border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box'
  };
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#343A40', marginBottom: '5px' }}>{label}</label>
      {textarea ? (
        <textarea value={value || ''} onChange={(e) => onChange(e.target.value)} style={{ ...baseStyle, minHeight: '70px', resize: 'vertical' }} />
      ) : (
        <input type={type} value={value || ''} onChange={(e) => onChange(e.target.value)} style={baseStyle} />
      )}
    </div>
  );
}

/* ============================================================
   SHIPPERS PANEL
   ============================================================ */
function ShippersPanel() {
  const [loading, setLoading] = useState(true);
  const [shippers, setShippers] = useState([]);
  const [counts, setCounts] = useState({ total: 0, active: 0, suspended: 0 });
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const [colFilters, setColFilters] = useState({
    name: [], contact: [], email: [], phone: [], status: [],
  });
  const [openFilter, setOpenFilter] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');
  const filterDropdownRef = useRef(null);

  useEffect(() => { loadShippers(); }, []);

  useEffect(() => {
    function handleClickOutside(e) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(e.target)) {
        setOpenFilter(null);
        setFilterSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  function getColumnValue(s, col) {
    if (col === 'name') return s.name || '';
    if (col === 'contact') return s.contactPerson || '';
    if (col === 'email') return s.email || '';
    if (col === 'phone') return s.phone || '';
    if (col === 'status') return s.status || '';
    return '';
  }

  const filtered = useMemo(() => {
    let list = shippers;
    Object.entries(colFilters).forEach(([col, values]) => {
      if (values.length > 0) {
        list = list.filter((s) => values.includes(getColumnValue(s, col)));
      }
    });
    return list;
  }, [shippers, colFilters]);

  function getUniqueValues(col) {
    const set = new Set();
    shippers.forEach((s) => {
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
    setColFilters({ name: [], contact: [], email: [], phone: [], status: [] });
  }

  const hasAnyFilter = Object.values(colFilters).some((arr) => arr.length > 0);

  function FilterHeaderCell({ col, label, width }) {
    const isFilterable = ['name', 'contact', 'email', 'phone', 'status'].includes(col);
    const activeCount = (colFilters[col] || []).length;
    const isOpen = openFilter === col;

    return (
      <th style={{
        padding: 0, textAlign: 'left', fontWeight: 700, color: '#003366',
        fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px',
        background: isOpen ? '#DDE3E9' : '#E9ECEF', borderBottom: '2px solid #D0D6DB',
        whiteSpace: 'nowrap', width, minWidth: width,
        position: 'sticky', top: 0, zIndex: 20,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
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
              position: 'absolute', top: '100%', right: 0,
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
        <StatCard num={counts.total} label="Total Shippers" color="#FF6B00" />
        <StatCard num={counts.active} label="Active" color="#D4EDDA" />
        <StatCard num={counts.suspended} label="Suspended" color="#F8D7DA" />
      </div>

      <div style={{ marginBottom: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={loadShippers} style={{ padding: '10px 20px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Refresh</button>
        {hasAnyFilter && (
          <button onClick={clearAllFilters} style={{ padding: '10px 16px', background: '#FFF5EB', color: '#FF6B00', border: '2px solid #FF6B00', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✕ Clear Filters ({Object.values(colFilters).reduce((n, arr) => n + arr.length, 0)})
          </button>
        )}
      </div>

      {error && <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '10px', padding: '15px 20px', marginBottom: '20px' }}>❌ {error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '45px', height: '45px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 15px' }} />
          <p style={{ color: '#6C757D' }}>Loading shippers...</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>
          {shippers.length === 0 ? 'No shippers yet.' : 'No shippers match your filters.'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <>
          <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E9ECEF', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'auto', maxHeight: '70vh', position: 'relative' }}>
            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.9rem', minWidth: '900px', tableLayout: 'fixed' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                <tr>
                  <FilterHeaderCell col="none" label="Short Form" width={110} />
                  <FilterHeaderCell col="name" label="Name" width={200} />
                  <FilterHeaderCell col="contact" label="Contact" width={160} />
                  <FilterHeaderCell col="email" label="Email" width={220} />
                  <FilterHeaderCell col="phone" label="Phone" width={150} />
                  <FilterHeaderCell col="none" label="Country" width={100} />
                  <FilterHeaderCell col="status" label="Status" width={130} />
                  <FilterHeaderCell col="none" label="Actions" width={140} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const isActive = s.status === 'Active';
                  const rowBg = i % 2 === 0 ? '#FFFFFF' : '#FAFBFC';
                  return (
                    <tr key={i} style={{ background: rowBg }}>
                      <td style={{ ...TD_STYLE, width: 110, fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366' }}>{s.shortForm || '-'}</td>
                      <td style={{ ...TD_STYLE, width: 200 }}>{s.name || '-'}</td>
                      <td style={{ ...TD_STYLE, width: 160 }}>{s.contactPerson || '-'}</td>
                      <td style={{ ...TD_STYLE, width: 220 }}>{s.email || '-'}</td>
                      <td style={{ ...TD_STYLE, width: 150 }}>{s.phone || '-'}</td>
                      <td style={{ ...TD_STYLE, width: 100 }}>{s.country || '-'}</td>
                      <td style={{ ...TD_STYLE, width: 130 }}>
                        <span style={{ background: isActive ? '#D4EDDA' : '#F8D7DA', color: isActive ? '#155724' : '#721C24', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.75rem' }}>{s.status}</span>
                      </td>
                      <td style={{ ...TD_STYLE, width: 140, whiteSpace: 'nowrap' }}>
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

          <div style={{ marginTop: '12px', textAlign: 'right', fontSize: '0.85rem', color: '#6C757D' }}>
            Showing <b>{filtered.length}</b> of <b>{shippers.length}</b> shipper{shippers.length !== 1 ? 's' : ''}
          </div>
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
