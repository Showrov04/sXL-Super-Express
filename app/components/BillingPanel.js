'use client';

import { useEffect, useState, useRef, useMemo } from 'react';

/* ============================================================
 *  HELPERS
 * ============================================================ */
function formatDate(d) {
  if (!d) return '—';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { return '—'; }
}

function statusClass(s) {
  const v = String(s || '').toLowerCase();
  if (v.includes('delivered')) return { bg: '#D4EDDA', color: '#155724' };
  if (v.includes('out for delivery')) return { bg: '#FFE5B4', color: '#8B4500' };
  if (v.includes('transit') || v.includes('picked')) return { bg: '#CCE5FF', color: '#004085' };
  return { bg: '#FFF3CD', color: '#856404' };
}

const TH_STYLE = {
  padding: 0,
  textAlign: 'left',
  fontWeight: 700,
  color: '#003366',
  fontSize: '0.72rem',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  background: '#E9ECEF',
  borderBottom: '2px solid #D0D6DB',
  whiteSpace: 'nowrap',
  position: 'sticky',
  top: 0,
  zIndex: 20,
};

const TD_STYLE = {
  padding: '10px 12px',
  borderBottom: '1px solid #F1F3F5',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  verticalAlign: 'middle',
};

const FROZEN_SHADOW = '2px 0 5px -2px rgba(0,0,0,0.08)';

const COL_W_SHIPPER_REF = 130;
const COL_W_TRACKING = 170;
const COL_W_MODE = 105;
const COL_W_ROUTE = 170;
const FROZEN_LEFT_REF = 0;
const FROZEN_LEFT_TRACKING = COL_W_SHIPPER_REF;
const FROZEN_LEFT_MODE = COL_W_SHIPPER_REF + COL_W_TRACKING;
const FROZEN_LEFT_ROUTE = COL_W_SHIPPER_REF + COL_W_TRACKING + COL_W_MODE;

const FROZEN_LEFT_TRACKING_ALL = 0;
const FROZEN_LEFT_MODE_ALL = COL_W_TRACKING;
const FROZEN_LEFT_ROUTE_ALL = COL_W_TRACKING + COL_W_MODE;

const COL_W_ACTIONS_DUE = 900;
const COL_W_ACTIONS_OTHER = 340;

export default function BillingPanel() {
  const [tab, setTab] = useState('all');
  const [shipperFilter, setShipperFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [counts, setCounts] = useState({ total: 0, due: 0, paid: 0 });
  const [outstanding, setOutstanding] = useState({ shippers: [], grandTotal: 0, totalShipments: 0 });
  const [shipperList, setShipperList] = useState([]);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [colFilters, setColFilters] = useState({
    shipperRef: [], tracking: [], mode: [], route: [], shipper: [], recipient: [],
    status: [], payment: [], invNumber: [],
  });
  const [openFilter, setOpenFilter] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');
  const filterDropdownRef = useRef(null);

  const [costModal, setCostModal] = useState(null);
  const [costTn, setCostTn] = useState('');
  const [costActualWeight, setCostActualWeight] = useState('');
  const [costActualCbm, setCostActualCbm] = useState('');
  const [costRate, setCostRate] = useState('');
  const [costCurrency, setCostCurrency] = useState('USD');
  const [costLines, setCostLines] = useState([{ label: '', amount: '' }]);
  const [costLocalCurrency, setCostLocalCurrency] = useState('');
  const [costExchangeRate, setCostExchangeRate] = useState('');
  const [costMsg, setCostMsg] = useState('');
  const [costLoading, setCostLoading] = useState(false);
  const [pickupCharge, setPickupCharge] = useState('');
  const [customsCharge, setCustomsCharge] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [costSaved, setCostSaved] = useState(false);

  const [editInvModal, setEditInvModal] = useState(null);
  const [editInvIssueDate, setEditInvIssueDate] = useState('');
  const [editInvDueDate, setEditInvDueDate] = useState('');
  const [editInvSaving, setEditInvSaving] = useState(false);
  const [editInvError, setEditInvError] = useState('');

  const [monthlyShipper, setMonthlyShipper] = useState('');
  const [monthlyMonth, setMonthlyMonth] = useState('');
  const [monthlyLocalCurrency, setMonthlyLocalCurrency] = useState('');
  const [monthlyLocalAmount, setMonthlyLocalAmount] = useState('');
  const [monthlyGenerating, setMonthlyGenerating] = useState(false);
  const [monthlyMsg, setMonthlyMsg] = useState('');
  const [monthlyInvoices, setMonthlyInvoices] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  useEffect(() => {
    const modalOpen = costModal || editInvModal;
    if (modalOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [costModal, editInvModal]);

  useEffect(() => {
    loadShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === 'due') loadMonthlyInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

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

  async function loadShipments() {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('sxl_token');
    if (!token) { setLoading(false); return; }

    try {
      const params = new URLSearchParams({ filter: tab });
      if (shipperFilter) params.set('shipper', shipperFilter);

      const res = await fetch('/api/admin/billing?' + params.toString(), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to load billing data.');
        setLoading(false);
        return;
      }

      setShipments(data.shipments || []);
      setCounts(data.counts || { total: 0, due: 0, paid: 0 });
      setOutstanding(data.outstanding || { shippers: [], grandTotal: 0, totalShipments: 0 });

      const names = {};
      (data.shipments || []).forEach((s) => { if (s.shipperName) names[s.shipperName] = true; });
      setShipperList((prev) => {
        const merged = { ...Object.fromEntries(prev.map((n) => [n, true])) };
        Object.keys(names).forEach((n) => { merged[n] = true; });
        return Object.keys(merged).sort();
      });

      setLoading(false);
    } catch (err) {
      setError('Connection error.');
      setLoading(false);
    }
  }

  async function loadMonthlyInvoices() {
    setMonthlyLoading(true);
    const token = localStorage.getItem('sxl_token');
    if (!token) { setMonthlyLoading(false); return; }
    try {
      const res = await fetch('/api/admin/invoices?type=monthly', {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();
      if (data.success) setMonthlyInvoices(data.invoices || []);
    } catch (e) { /* silent */ }
    setMonthlyLoading(false);
  }

  function applyFilters(e) {
    if (e) e.preventDefault();
    loadShipments();
  }

  function clearShipperFilter() {
    setShipperFilter('');
    setTimeout(loadShipments, 50);
  }

  function getColumnValue(s, col) {
    if (col === 'shipperRef') return s.shipperRef || '';
    if (col === 'tracking') return s.trackingNumber || '';
    if (col === 'mode') return s.shipmentType || s.shipMode || '';
    if (col === 'route') return (s.origin || '') + ' → ' + (s.destination || '');
    if (col === 'shipper') return s.shipperName || '';
    if (col === 'recipient') return s.recipientName || '';
    if (col === 'status') return s.status || '';
    if (col === 'payment') return s.paymentStatus || '';
    if (col === 'invNumber') return s.latestInvoice ? (s.latestInvoice.invoiceNumber || '') : '';
    return '';
  }

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
    setColFilters({
      shipperRef: [], tracking: [], mode: [], route: [], shipper: [], recipient: [],
      status: [], payment: [], invNumber: [],
    });
  }

  const hasAnyFilter = Object.values(colFilters).some((arr) => arr.length > 0);

  const filtered = useMemo(() => {
    let list = shipments;
    Object.entries(colFilters).forEach(([col, values]) => {
      if (values.length > 0) {
        list = list.filter((s) => values.includes(getColumnValue(s, col)));
      }
    });
    return list;
  }, [shipments, colFilters]);

  const filteredTotal = useMemo(() => {
    if (tab === 'due') {
      let total = 0;
      filtered.forEach((s) => { total += parseFloat(s.shippingCost) || 0; });
      return Math.round(total * 100) / 100;
    }
    return outstanding.grandTotal || 0;
  }, [filtered, tab, outstanding]);

  function isSea(shipment) {
    if (!shipment) return false;
    return String(shipment.shipMode || '').toUpperCase() === 'SEA';
  }

  const selectedIsSea = isSea(selectedShipment);

  const calculatedTotal = (() => {
    const aw = parseFloat(costActualWeight) || 0;
    const cbm = parseFloat(costActualCbm) || 0;
    const rate = parseFloat(costRate) || 0;
    const pc = parseFloat(pickupCharge) || 0;
    const cc = parseFloat(customsCharge) || 0;
    const dc = parseFloat(deliveryCharge) || 0;
    let addl = 0;
    costLines.forEach((l) => { addl += parseFloat(l.amount) || 0; });

    const freightBase = selectedIsSea ? cbm : aw;
    return (freightBase * rate + pc + cc + dc + addl).toFixed(2);
  })();

  const localTotal = (() => {
    const fx = parseFloat(costExchangeRate) || 0;
    const total = parseFloat(calculatedTotal) || 0;
    if (fx > 0) return (total * fx).toFixed(2);
    return null;
  })();

  function openCostModal(s) {
    if (s.costSavedAt) {
      const dateStr = formatDate(s.costSavedAt);
      const proceed = window.confirm('Cost was last saved on ' + dateStr + '. Edit it?');
      if (!proceed) return;
    }

    setCostModal({ shipment: s });
    setSelectedShipment(s);
    setCostTn(s.trackingNumber);
    setCostActualWeight(s.actualWeight ? String(s.actualWeight) : '');
    setCostActualCbm(s.actualCbm ? String(s.actualCbm) : '');
    setCostRate(s.ratePerKg ? String(s.ratePerKg) : '');
    setCostCurrency(s.currency || 'USD');
    setPickupCharge(s.pickupCharge ? String(s.pickupCharge) : '');
    setCustomsCharge(s.customsCharge ? String(s.customsCharge) : '');
    setDeliveryCharge(s.deliveryCharge ? String(s.deliveryCharge) : '');

    let addl = [];
    let localCur = '';
    let fx = '';
    try {
      const bd = s.costBreakdown;
      if (bd) {
        const parsed = typeof bd === 'string' ? JSON.parse(bd) : bd;
        if (Array.isArray(parsed.additionalLines) && parsed.additionalLines.length > 0) {
          addl = parsed.additionalLines.map((l) => ({ label: l.label || '', amount: String(l.amount || '') }));
        }
        localCur = parsed.localCurrency || '';
        fx = parsed.exchangeRate ? String(parsed.exchangeRate) : '';
      }
    } catch (e) { /* silent */ }
    if (addl.length === 0) addl = [{ label: '', amount: '' }];
    setCostLines(addl);
    setCostLocalCurrency(localCur);
    setCostExchangeRate(fx);

    setCostSaved(!!s.costSavedAt);
    setCostMsg('');
  }

  function closeCostModal() {
    setCostModal(null);
    setSelectedShipment(null);
    setCostTn('');
    setCostActualWeight('');
    setCostActualCbm('');
    setCostRate('');
    setCostCurrency('USD');
    setCostLines([{ label: '', amount: '' }]);
    setCostLocalCurrency('');
    setCostExchangeRate('');
    setPickupCharge('');
    setCustomsCharge('');
    setDeliveryCharge('');
    setCostMsg('');
    setCostSaved(false);
  }

  function updateCostLine(idx, field, value) {
    setCostLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }
  function addCostLine() { setCostLines((prev) => [...prev, { label: '', amount: '' }]); }
  function removeCostLine(idx) { setCostLines((prev) => prev.filter((_, i) => i !== idx)); }

  async function handleSaveCost(e) {
    if (e) e.preventDefault();
    setCostMsg('');
    if (!costTn.trim()) { setCostMsg('❌ Please enter a tracking number.'); return; }

    setCostLoading(true);
    const token = localStorage.getItem('sxl_token');

    const additionalLines = costLines
      .filter((l) => l.label.trim() || parseFloat(l.amount) > 0)
      .map((l) => ({ label: l.label.trim(), amount: parseFloat(l.amount) || 0 }));

    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          action: 'saveCost',
          trackingNumber: costTn.trim(),
          actualWeight: parseFloat(costActualWeight) || 0,
          actualCbm: parseFloat(costActualCbm) || 0,
          shipMode: selectedShipment ? selectedShipment.shipMode : null,
          ratePerKg: parseFloat(costRate) || 0,
          additionalLines,
          currency: costCurrency,
          localCurrency: costLocalCurrency,
          exchangeRate: parseFloat(costExchangeRate) || 0,
          pickupCharge: parseFloat(pickupCharge) || 0,
          customsCharge: parseFloat(customsCharge) || 0,
          deliveryCharge: parseFloat(deliveryCharge) || 0,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setCostMsg('❌ ' + (data.error || 'Save failed.'));
        setCostLoading(false);
        return;
      }
      setCostMsg('✅ Cost saved: ' + data.currency + ' ' + Number(data.total).toFixed(2));
      setCostSaved(true);
      setCostLoading(false);
      setToast('💰 Cost saved for ' + costTn.trim());
      setTimeout(() => {
        closeCostModal();
        loadShipments();
      }, 800);
    } catch (err) {
      setCostMsg('❌ Connection error.');
      setCostLoading(false);
    }
  }

  async function handleMarkPaid(trackingNumber) {
    if (!window.confirm('Mark ' + trackingNumber + ' as paid?')) return;
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'markPaid', trackingNumber }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); return; }
      setToast('✅ Marked ' + trackingNumber + ' as paid');
      loadShipments();
    } catch (err) {
      window.alert('Error: ' + err.message);
    }
  }

  async function handleMarkUnpaid(trackingNumber) {
    if (!window.confirm('Mark ' + trackingNumber + ' as UNPAID?')) return;
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'markUnpaid', trackingNumber }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); return; }
      setToast('↩ Marked ' + trackingNumber + ' as unpaid');
      loadShipments();
    } catch (err) {
      window.alert('Error: ' + err.message);
    }
  }

  async function handleIssueInvoice(s) {
    const tn = s.trackingNumber;
    if (s.latestInvoice) {
      const proceed = window.confirm(
        'Invoice ' + s.latestInvoice.invoiceNumber + ' already exists for ' + tn + '. Issue a new one?'
      );
      if (!proceed) return;
    } else {
      if (!window.confirm('Issue individual invoice for ' + tn + '?')) return;
    }

    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'createIndividual', trackingNumber: tn }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); return; }
      setToast('🧾 Invoice ' + data.invoiceNumber + ' issued');
      loadShipments();
    } catch (err) {
      window.alert('Error: ' + err.message);
    }
  }

  async function handleSendInvoice(trackingNumber) {
    if (!window.confirm('Send invoice email to customer for ' + trackingNumber + '?')) return;
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ trackingNumber }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); return; }
      setToast('📤 Invoice sent to ' + data.sentTo);
      loadShipments();
    } catch (err) {
      window.alert('Error: ' + err.message);
    }
  }

  function openEditInvModal(s) {
    if (!s.latestInvoice) return;
    setEditInvModal({ shipment: s });
    setEditInvIssueDate(s.latestInvoice.issueDate ? String(s.latestInvoice.issueDate).slice(0, 10) : '');
    setEditInvDueDate(s.latestInvoice.dueDate ? String(s.latestInvoice.dueDate).slice(0, 10) : '');
    setEditInvError('');
  }

  function closeEditInvModal() {
    setEditInvModal(null);
    setEditInvIssueDate('');
    setEditInvDueDate('');
    setEditInvError('');
    setEditInvSaving(false);
  }

  async function handleSaveEditInv() {
    setEditInvError('');
    if (!editInvIssueDate && !editInvDueDate) {
      setEditInvError('Enter at least one date.');
      return;
    }
    setEditInvSaving(true);
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          action: 'updateInvoiceDates',
          invoiceId: editInvModal.shipment.latestInvoice.invoiceId,
          issueDate: editInvIssueDate || null,
          dueDate: editInvDueDate || null,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setEditInvError(data.error || 'Failed to save.');
        setEditInvSaving(false);
        return;
      }
      setEditInvSaving(false);
      const invNum = editInvModal.shipment.latestInvoice.invoiceNumber;
      closeEditInvModal();
      setToast('✅ Invoice ' + invNum + ' dates updated');
      setTimeout(loadShipments, 400);
    } catch (err) {
      setEditInvError('Connection error: ' + err.message);
      setEditInvSaving(false);
    }
  }

  async function handleGenerateMonthly(e) {
    e.preventDefault();
    setMonthlyMsg('');
    if (!monthlyShipper || !monthlyMonth) {
      setMonthlyMsg('❌ Please select shipper and month.');
      return;
    }

    setMonthlyGenerating(true);
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          action: 'createMonthly',
          shipperName: monthlyShipper,
          month: monthlyMonth,
          localCurrency: monthlyLocalCurrency,
          localAmount: parseFloat(monthlyLocalAmount) || 0,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setMonthlyMsg('❌ ' + (data.error || 'Failed.'));
        setMonthlyGenerating(false);
        return;
      }
      setMonthlyMsg('✅ Monthly invoice ' + data.invoiceNumber + ' generated (' + data.shipmentCount + ' shipments, USD ' + Number(data.total).toFixed(2) + ')');
      setMonthlyGenerating(false);
      setTimeout(loadMonthlyInvoices, 500);
    } catch (err) {
      setMonthlyMsg('❌ Connection error.');
      setMonthlyGenerating(false);
    }
  }

  function renderActualCell(s) {
    const mode = String(s.shipMode || '').toUpperCase();
    if (mode === 'SEA') {
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
    const isFilterable = ['shipperRef', 'tracking', 'mode', 'route', 'shipper', 'recipient', 'status', 'payment', 'invNumber'].includes(col);
    const activeCount = (colFilters[col] || []).length;
    const isOpen = openFilter === col;

    return (
      <th style={{
        ...TH_STYLE,
        background: isOpen ? '#DDE3E9' : '#E9ECEF',
        width, minWidth: width,
        zIndex: frozenLeft !== undefined ? 22 : 20,
        ...(frozenLeft !== undefined ? { left: frozenLeft } : {}),
        ...(hasShadow ? { boxShadow: FROZEN_SHADOW } : {}),
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
                fontSize: '0.7rem', fontWeight: 700, fontFamily: 'inherit', lineHeight: 1,
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
              fontSize: '0.85rem', color: '#343A40', fontWeight: 500,
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

  const showInvoiceColumns = tab === 'due';
  const showShipperRef = tab !== 'all';
  const isAllTab = tab === 'all';
  const isDueTab = tab === 'due';

  return (
    <div>
      {toast && (
        <div style={{
          position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
          background: '#003366', color: 'white', borderRadius: '10px',
          padding: '14px 24px', fontWeight: 700, boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          zIndex: 99999, maxWidth: '90%', textAlign: 'center',
        }}>
          {toast}
        </div>
      )}

      <h2 style={{ color: '#003366', fontSize: '1.5rem', fontWeight: 800, marginBottom: '20px' }}>📦 Shipments</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <StatCard num={counts.total} label="Total Shipments" color="#FF6B00" />
        <StatCard num={counts.due} label="Due Payment" color="#FFE5B4" />
        <StatCard num={counts.paid} label="Paid" color="#D4EDDA" />
      </div>

      {tab === 'due' && !loading && !error && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '20px 25px', marginBottom: '20px', borderLeft: '5px solid #FF6B00', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
          <div>
            <div style={{ fontWeight: 800, color: '#003366', fontSize: '1.1rem' }}>💵 Accounts Receivable</div>
            <div style={{ color: '#6C757D', fontSize: '0.85rem' }}>
              {filtered.length} shipment{filtered.length !== 1 ? 's' : ''} shown
              {hasAnyFilter ? ' (filtered)' : ''}
              {shipperFilter ? ' · ' + shipperFilter : ''}
            </div>
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FF6B00' }}>
            USD {Number(filteredTotal).toFixed(2)}
          </div>
        </div>
      )}

      <form onSubmit={applyFilters} style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center', marginBottom: '20px', background: 'white', padding: '15px', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
        <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#6C757D' }}>Shipper:</label>
        <select value={shipperFilter} onChange={(e) => setShipperFilter(e.target.value)} style={{ padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', minWidth: '180px' }}>
          <option value="">All Shippers</option>
          {shipperList.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button type="submit" style={{ padding: '10px 16px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Apply</button>
        <button type="button" onClick={clearShipperFilter} style={{ padding: '10px 16px', background: '#E9ECEF', color: '#003366', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>

        {hasAnyFilter && (
          <button type="button" onClick={clearAllFilters} style={{ padding: '10px 16px', background: '#FFF5EB', color: '#FF6B00', border: '2px solid #FF6B00', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✕ Clear Column Filters ({Object.values(colFilters).reduce((n, arr) => n + arr.length, 0)})
          </button>
        )}
      </form>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <TabButton active={tab === 'all'} onClick={() => setTab('all')} label="📋 All Shipments" count={counts.total} />
        <TabButton active={tab === 'due'} onClick={() => setTab('due')} label="💳 Due Payment" count={counts.due} />
        <TabButton active={tab === 'paid'} onClick={() => setTab('paid')} label="✅ Paid" count={counts.paid} />
      </div>

      {error && <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '10px', padding: '15px 20px', marginBottom: '20px' }}>❌ {error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '45px', height: '45px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 15px' }} />
          <p style={{ color: '#6C757D' }}>Loading billing data...</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>
          {shipments.length === 0 ? 'No shipments in this view.' : 'No shipments match your filters.'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E9ECEF', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'auto', maxHeight: '70vh', position: 'relative' }}>
          <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem', minWidth: isDueTab ? '2600px' : '1700px', tableLayout: 'fixed', width: '100%' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
              <tr>
                {showShipperRef && (
                  <HeaderCell col="shipperRef" label="Shipper Ref" width={COL_W_SHIPPER_REF} frozenLeft={FROZEN_LEFT_REF} />
                )}
                <HeaderCell
                  col="tracking"
                  label="Tracking #"
                  width={COL_W_TRACKING}
                  frozenLeft={isAllTab ? FROZEN_LEFT_TRACKING_ALL : FROZEN_LEFT_TRACKING}
                />
                <HeaderCell
                  col="mode"
                  label="Mode"
                  width={COL_W_MODE}
                  frozenLeft={isAllTab ? FROZEN_LEFT_MODE_ALL : FROZEN_LEFT_MODE}
                />
                <HeaderCell
                  col="route"
                  label="Route"
                  width={COL_W_ROUTE}
                  frozenLeft={isAllTab ? FROZEN_LEFT_ROUTE_ALL : FROZEN_LEFT_ROUTE}
                  hasShadow={true}
                />
                <HeaderCell col="shipper" label="Shipper" width={150} />
                <HeaderCell col="recipient" label="Recipient" width={150} />
                <HeaderCell col="status" label="Status" width={120} />
                <HeaderCell col="none" label="Booking Wt" width={100} />
                <HeaderCell col="none" label="Actual Wt" width={130} />
                <HeaderCell col="none" label="Cost" width={110} />
                <HeaderCell col="payment" label="Payment" width={110} />
                <HeaderCell col="none" label="Booked" width={115} />
                <HeaderCell col="none" label="ETA" width={115} />
                {showInvoiceColumns && <HeaderCell col="none" label="Inv Date" width={115} />}
                {showInvoiceColumns && <HeaderCell col="invNumber" label="Inv #" width={130} />}
                {showInvoiceColumns && <HeaderCell col="none" label="Due" width={115} />}
                <HeaderCell col="none" label="Actions" width={isDueTab ? COL_W_ACTIONS_DUE : COL_W_ACTIONS_OTHER} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((s, i) => {
                const sc = statusClass(s.status);
                const rowBg = i % 2 === 0 ? '#FFFFFF' : '#FAFBFC';
                const frozenTd = { ...TD_STYLE, background: rowBg, position: 'sticky', zIndex: 3 };
                const hasCost = s.shippingCost && parseFloat(s.shippingCost) > 0;
                const wasCostSaved = !!s.costSavedAt;
                const hasInvoice = !!s.latestInvoice;
                const invSent = !!s.invoiceSentAt || (s.latestInvoice && !!s.latestInvoice.sentAt);

                return (
                  <tr key={i} style={{ background: rowBg }}>
                    {showShipperRef && (
                      <td style={{ ...frozenTd, left: FROZEN_LEFT_REF, width: COL_W_SHIPPER_REF, minWidth: COL_W_SHIPPER_REF }}>{s.shipperRef || '—'}</td>
                    )}
                    <td style={{
                      ...frozenTd,
                      left: isAllTab ? FROZEN_LEFT_TRACKING_ALL : FROZEN_LEFT_TRACKING,
                      width: COL_W_TRACKING, minWidth: COL_W_TRACKING,
                      fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366'
                    }}>{s.trackingNumber}</td>
                    <td style={{
                      ...frozenTd,
                      left: isAllTab ? FROZEN_LEFT_MODE_ALL : FROZEN_LEFT_MODE,
                      width: COL_W_MODE, minWidth: COL_W_MODE
                    }}>{s.shipmentType || s.shipMode || '—'}</td>
                    <td style={{
                      ...frozenTd,
                      left: isAllTab ? FROZEN_LEFT_ROUTE_ALL : FROZEN_LEFT_ROUTE,
                      width: COL_W_ROUTE, minWidth: COL_W_ROUTE,
                      boxShadow: FROZEN_SHADOW
                    }}>{s.origin || '—'} → {s.destination || '—'}</td>
                    <td style={{ ...TD_STYLE, width: 150 }}>{s.shipperName || '—'}</td>
                    <td style={{ ...TD_STYLE, width: 150 }}>{s.recipientName || '—'}</td>
                    <td style={{ ...TD_STYLE, width: 120 }}>
                      <span style={{ background: sc.bg, color: sc.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s.status}</span>
                    </td>
                    <td style={{ ...TD_STYLE, width: 100 }}>{s.bookingWeight ? s.bookingWeight + ' kg' : '—'}</td>
                    <td style={{ ...TD_STYLE, width: 130 }}>{renderActualCell(s)}</td>
                    <td style={{ ...TD_STYLE, width: 110 }}>
                      {hasCost
                        ? <span style={{ fontWeight: 700, color: '#003366' }}>{Number(s.shippingCost).toFixed(2)} {s.currency}</span>
                        : <span style={{ color: '#ADB5BD', fontStyle: 'italic', fontWeight: 700 }}>TBA</span>}
                    </td>
                    <td style={{ ...TD_STYLE, width: 110 }}>
                      <span style={{ background: s.paymentStatus === 'Paid' ? '#D4EDDA' : '#FFF3CD', color: s.paymentStatus === 'Paid' ? '#155724' : '#856404', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.7rem', whiteSpace: 'nowrap' }}>{s.paymentStatus || 'Unpaid'}</span>
                    </td>
                    <td style={{ ...TD_STYLE, width: 115 }}>{formatDate(s.bookedAt)}</td>
                    <td style={{ ...TD_STYLE, width: 115 }}>
                      <span style={{ color: '#FF6B00', fontWeight: 800 }}>
                        {s.estimatedDelivery ? formatDate(s.estimatedDelivery) : 'Pending'}
                      </span>
                    </td>

                    {showInvoiceColumns && (
                      <td style={{ ...TD_STYLE, width: 115 }}>
                        {hasInvoice && s.latestInvoice.issueDate ? formatDate(s.latestInvoice.issueDate) : <span style={{ color: '#ADB5BD' }}>—</span>}
                      </td>
                    )}
                    {showInvoiceColumns && (
                      <td style={{ ...TD_STYLE, width: 130, fontWeight: 700, color: '#003366' }}>
                        {hasInvoice ? s.latestInvoice.invoiceNumber : <span style={{ color: '#ADB5BD', fontStyle: 'italic' }}>—</span>}
                      </td>
                    )}
                    {showInvoiceColumns && (
                      <td style={{ ...TD_STYLE, width: 115 }}>
                        {hasInvoice && s.latestInvoice.dueDate ? formatDate(s.latestInvoice.dueDate) : <span style={{ color: '#ADB5BD' }}>—</span>}
                      </td>
                    )}

                    <td style={{
                      ...TD_STYLE,
                      whiteSpace: 'normal',
                      overflow: 'visible',
                      textOverflow: 'clip',
                      width: isDueTab ? COL_W_ACTIONS_DUE : COL_W_ACTIONS_OTHER,
                      padding: '8px 12px'
                    }}>
                      {isDueTab && (
                        <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                          {/* G.21 — Booking PDF button */}
                          <a
                            href={'/api/pdf/booking/' + s.trackingNumber}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              padding: '5px 10px',
                              background: '#00A86B',
                              color: 'white',
                              borderRadius: '6px',
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              textDecoration: 'none',
                              whiteSpace: 'nowrap',
                              display: 'inline-block'
                            }}
                          >
                            📄 Booking PDF
                          </a>

                          <button
                            onClick={() => openCostModal(s)}
                            style={{
                              padding: '5px 10px',
                              background: wasCostSaved ? '#E9ECEF' : '#FF6B00',
                              color: wasCostSaved ? '#495057' : 'white',
                              border: 'none', borderRadius: '6px',
                              fontWeight: 700, fontSize: '0.72rem',
                              cursor: 'pointer', fontFamily: 'inherit',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {wasCostSaved ? '✅ Cost Updated' : '🔄 Update Shipment Cost'}
                          </button>

                          {!hasInvoice ? (
                            <button onClick={() => handleIssueInvoice(s)} style={{ padding: '5px 10px', background: '#0D6EFD', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>📄 Issue Invoice</button>
                          ) : (
                            <>
                              <button
                                onClick={() => handleIssueInvoice(s)}
                                style={{
                                  padding: '5px 10px',
                                  background: '#E9ECEF',
                                  color: '#155724',
                                  border: 'none', borderRadius: '6px',
                                  fontWeight: 700, fontSize: '0.72rem',
                                  cursor: 'pointer', fontFamily: 'inherit',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                ✅ Invoice Issued
                              </button>
                              <button onClick={() => openEditInvModal(s)} style={{ padding: '5px 10px', background: '#003366', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>✏️ Edit Invoice</button>
                              <a href={'/api/pdf/invoice/' + s.latestInvoice.invoiceId} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 10px', background: '#00A86B', color: 'white', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap', display: 'inline-block' }}>📄 Inv PDF</a>
                              {!invSent ? (
                                <button onClick={() => handleSendInvoice(s.trackingNumber)} style={{ padding: '5px 10px', background: '#DC3545', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>📤 Send Customer</button>
                              ) : (
                                <button onClick={() => handleSendInvoice(s.trackingNumber)} style={{ padding: '5px 10px', background: '#E9ECEF', color: '#155724', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>✅ Sent</button>
                              )}
                            </>
                          )}

                          <button onClick={() => handleMarkPaid(s.trackingNumber)} style={{ padding: '5px 10px', background: '#28A745', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>💵 Mark Paid</button>
                        </div>
                      )}

                      {tab === 'all' && (
                        <span style={{ color: '#ADB5BD' }}>—</span>
                      )}

                      {tab === 'paid' && (
                        <button onClick={() => handleMarkUnpaid(s.trackingNumber)} style={{ padding: '5px 10px', background: '#FFC107', color: '#333', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}>↩ Undo</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'due' && (
        <>
          <h2 style={{ color: '#003366', fontSize: '1.5rem', fontWeight: 800, marginTop: '50px', marginBottom: '20px' }}>📅 Monthly Summary</h2>

          <form onSubmit={handleGenerateMonthly} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '20px', borderLeft: '5px solid #003366' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '15px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Shipper *</label>
                <select value={monthlyShipper} onChange={(e) => setMonthlyShipper(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                  <option value="">-- Select Shipper --</option>
                  {shipperList.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Month *</label>
                <input type="month" value={monthlyMonth} onChange={(e) => setMonthlyMonth(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Local Currency (optional)</label>
                <input type="text" value={monthlyLocalCurrency} onChange={(e) => setMonthlyLocalCurrency(e.target.value)} placeholder="e.g., BDT"
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Local Amount (optional)</label>
                <input type="number" step="0.01" value={monthlyLocalAmount} onChange={(e) => setMonthlyLocalAmount(e.target.value)} placeholder="e.g., 10000"
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="submit" disabled={monthlyGenerating} style={{ padding: '12px 24px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: monthlyGenerating ? 'not-allowed' : 'pointer', opacity: monthlyGenerating ? 0.6 : 1, fontFamily: 'inherit' }}>
                {monthlyGenerating ? 'Generating...' : '🧾 Generate Monthly Invoice'}
              </button>
              <button type="button" onClick={loadMonthlyInvoices} style={{ padding: '12px 20px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Refresh List</button>
            </div>

            {monthlyMsg && (
              <div style={{ marginTop: '15px', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', background: monthlyMsg.startsWith('✅') ? '#D4EDDA' : '#F8D7DA', color: monthlyMsg.startsWith('✅') ? '#155724' : '#721C24' }}>
                {monthlyMsg}
              </div>
            )}
          </form>

          {monthlyLoading ? (
            <div style={{ textAlign: 'center', padding: '30px' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            </div>
          ) : monthlyInvoices.length === 0 ? (
            <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>
              No monthly summary invoices yet. Generate one above.
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E9ECEF', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'auto', maxHeight: '50vh', position: 'relative' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem', minWidth: '1000px' }}>
                <thead>
                  <tr>
                    {['Inv #', 'Month', 'Shipper', 'Amount', 'Status', 'Issued', 'Due', 'PDF'].map((h) => (
                      <th key={h} style={{ ...TH_STYLE, padding: '14px 12px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {monthlyInvoices.map((inv, i) => {
                    const rowBg = i % 2 === 0 ? '#FFFFFF' : '#FAFBFC';
                    return (
                      <tr key={inv.invoiceID || i} style={{ background: rowBg }}>
                        <td style={{ ...TD_STYLE, fontWeight: 700 }}>{inv.invoiceNumber}</td>
                        <td style={TD_STYLE}>{inv.month || '—'}</td>
                        <td style={TD_STYLE}>{inv.shipperName || '—'}</td>
                        <td style={{ ...TD_STYLE, fontWeight: 700 }}>{inv.currency} {Number(inv.amount).toFixed(2)}</td>
                        <td style={TD_STYLE}>
                          <span style={{ padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.72rem', background: String(inv.status).toLowerCase() === 'paid' ? '#D4EDDA' : '#FFF3CD', color: String(inv.status).toLowerCase() === 'paid' ? '#155724' : '#856404' }}>{inv.status}</span>
                        </td>
                        <td style={TD_STYLE}>{formatDate(inv.issueDate)}</td>
                        <td style={TD_STYLE}>{formatDate(inv.dueDate)}</td>
                        <td style={TD_STYLE}>
                          <a href={'/api/pdf/invoice/' + inv.invoiceID} target="_blank" rel="noopener noreferrer" style={{ padding: '5px 10px', background: '#00A86B', color: 'white', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700, textDecoration: 'none', whiteSpace: 'nowrap' }}>📄 PDF</a>
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

      {costModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '20px', overflowY: 'auto'
        }}>
          <div style={{
            background: 'white', maxWidth: '900px', width: '100%',
            borderRadius: '16px', padding: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            marginTop: '30px', marginBottom: '40px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h2 style={{ color: '#003366', fontSize: '1.3rem', margin: 0 }}>
                  {costSaved ? '✏️ Update Shipment Cost' : '💰 Add Shipment Cost'}
                </h2>
                <div style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '4px' }}>
                  {costModal.shipment.trackingNumber} · {costModal.shipment.shipperName}
                </div>
                <div style={{ color: '#003366', fontSize: '0.85rem', marginTop: '2px', fontWeight: 700 }}>
                  Route: {costModal.shipment.origin || '—'} → {costModal.shipment.destination || '—'} · Mode: {costModal.shipment.shipmentType || costModal.shipment.shipMode || '—'}
                </div>
              </div>
              <button onClick={closeCostModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6C757D' }}>✕</button>
            </div>

            {costMsg && (
              <div style={{
                background: costMsg.startsWith('✅') ? '#D4EDDA' : '#F8D7DA',
                color: costMsg.startsWith('✅') ? '#155724' : '#721C24',
                borderLeft: '4px solid ' + (costMsg.startsWith('✅') ? '#28A745' : '#DC3545'),
                borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', fontSize: '0.9rem'
              }}>
                {costMsg}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Tracking Number *</label>
                <input type="text" value={costTn} readOnly
                  style={{ width: '100%', padding: '10px', border: '2px solid #F1F3F5', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', background: '#F8F9FA', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Actual Weight (kg)</label>
                <input type="number" step="0.01" value={costActualWeight} onChange={(e) => setCostActualWeight(e.target.value)} placeholder="e.g., 5.5"
                  style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>

              {selectedIsSea && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Actual Volume (CBM)</label>
                  <input type="number" step="0.01" value={costActualCbm} onChange={(e) => setCostActualCbm(e.target.value)} placeholder="e.g., 1.2"
                    style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                  Freight Rate {selectedIsSea ? '(per CBM)' : '(per kg)'}
                </label>
                <input type="number" step="0.01" value={costRate} onChange={(e) => setCostRate(e.target.value)} placeholder={selectedIsSea ? 'e.g., 120.00' : 'e.g., 12.50'}
                  style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Currency</label>
                <select value={costCurrency} onChange={(e) => setCostCurrency(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }}>
                  <option>USD</option>
                  <option>HKD</option>
                  <option>CNY</option>
                  <option>BDT</option>
                </select>
              </div>
            </div>

            {selectedShipment && !selectedShipment.isSpecialParcel && (
              <div style={{ marginTop: '20px', borderTop: '1px solid #E9ECEF', paddingTop: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', color: '#003366', marginBottom: '12px' }}>🛠️ Service Charges</h4>

                <div style={{ display: 'grid', gap: '12px' }}>
                  {selectedShipment.pickupService && (
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                        🚚 Pickup Charge — <span style={{ color: '#155724' }}>Pickup by sXL</span>
                      </label>
                      <input type="number" step="0.01" value={pickupCharge} onChange={(e) => setPickupCharge(e.target.value)} placeholder="Amount"
                        style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  )}

                  {selectedShipment.customService === 'sxl' && (
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                        🛃 Customs Clearance Charge — <span style={{ color: '#155724' }}>Handled by sXL</span>
                      </label>
                      <input type="number" step="0.01" value={customsCharge} onChange={(e) => setCustomsCharge(e.target.value)} placeholder="Amount"
                        style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  )}

                  {selectedShipment.deliveryService === 'sxl' && (
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                        📦 Delivery Charge — <span style={{ color: '#155724' }}>Handled by sXL</span>
                      </label>
                      <input type="number" step="0.01" value={deliveryCharge} onChange={(e) => setDeliveryCharge(e.target.value)} placeholder="Amount"
                        style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                    </div>
                  )}

                  {!selectedShipment.pickupService && selectedShipment.customService !== 'sxl' && selectedShipment.deliveryService !== 'sxl' && (
                    <div style={{ fontSize: '0.85rem', color: '#6C757D', fontStyle: 'italic' }}>
                      No extra services selected by customer (self-delivery + consignee handles customs & delivery).
                    </div>
                  )}
                </div>
              </div>
            )}

            {selectedShipment && selectedShipment.isSpecialParcel && (
              <div style={{ marginTop: '20px', padding: '12px 16px', background: '#FFF5EB', borderRadius: '8px', borderLeft: '4px solid #FF6B00', fontSize: '0.85rem', color: '#8B4500' }}>
                ℹ️ Special Parcel shipments — no service charges apply.
              </div>
            )}

            <div style={{ marginTop: '20px', borderTop: '1px solid #E9ECEF', paddingTop: '20px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Additional Cost Lines</label>
              {costLines.map((l, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
                  <input type="text" value={l.label} onChange={(e) => updateCostLine(idx, 'label', e.target.value)} placeholder="Description"
                    style={{ flex: 2, padding: '8px', border: '2px solid #E9ECEF', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'inherit' }} />
                  <input type="number" step="0.01" value={l.amount} onChange={(e) => updateCostLine(idx, 'amount', e.target.value)} placeholder="Amount"
                    style={{ flex: 1, padding: '8px', border: '2px solid #E9ECEF', borderRadius: '6px', fontSize: '0.85rem', fontFamily: 'inherit' }} />
                  <button type="button" onClick={() => removeCostLine(idx)} style={{ padding: '8px 12px', background: '#DC3545', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>✕</button>
                </div>
              ))}
              <button type="button" onClick={addCostLine} style={{ marginTop: '8px', padding: '8px 14px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '6px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>+ Add Cost Line</button>
            </div>

            <div style={{ marginTop: '20px', borderTop: '1px solid #E9ECEF', paddingTop: '20px' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Local Currency (optional)</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '6px' }}>
                <input type="text" value={costLocalCurrency} onChange={(e) => setCostLocalCurrency(e.target.value)} placeholder="e.g., BDT"
                  style={{ padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
                <input type="number" step="0.0001" value={costExchangeRate} onChange={(e) => setCostExchangeRate(e.target.value)} placeholder="Exchange rate (1 USD = ?)"
                  style={{ padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6C757D', marginTop: '4px', fontStyle: 'italic' }}>
                Enter the exchange rate to also compute the local-currency total.
              </div>
            </div>

            <div style={{ background: '#FFF5EB', padding: '18px', borderRadius: '10px', borderLeft: '4px solid #FF6B00', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontWeight: 700, color: '#003366' }}>TOTAL COST:</span>
                <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FF6B00' }}>{costCurrency} {calculatedTotal}</span>
              </div>
              {localTotal && costLocalCurrency && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginTop: '8px', paddingTop: '8px', borderTop: '1px dashed #FF6B00' }}>
                  <span style={{ fontWeight: 700, color: '#003366' }}>LOCAL TOTAL:</span>
                  <span style={{ fontSize: '1.3rem', fontWeight: 800, color: '#003366' }}>{costLocalCurrency} {localTotal}</span>
                </div>
              )}
            </div>

            <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
              <button type="button" onClick={closeCostModal} disabled={costLoading}
                style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button type="button" onClick={handleSaveCost} disabled={costLoading}
                style={{ padding: '12px 24px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: costLoading ? 'not-allowed' : 'pointer', opacity: costLoading ? 0.6 : 1, fontFamily: 'inherit' }}>
                {costLoading ? 'Saving...' : '💾 Save Cost'}
              </button>
            </div>
          </div>
        </div>
      )}

      {editInvModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '20px', overflowY: 'auto'
        }}>
          <div style={{
            background: 'white', maxWidth: '520px', width: '100%',
            borderRadius: '16px', padding: '30px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            marginTop: '60px', marginBottom: '40px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ color: '#003366', fontSize: '1.25rem', margin: 0 }}>✏️ Edit Invoice</h2>
                <div style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '4px' }}>
                  {editInvModal.shipment.latestInvoice.invoiceNumber} · {editInvModal.shipment.trackingNumber}
                </div>
              </div>
              <button onClick={closeEditInvModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6C757D' }}>✕</button>
            </div>

            {editInvError && (
              <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', fontSize: '0.9rem' }}>
                {editInvError}
              </div>
            )}

            <div style={{ display: 'grid', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Issue Date</label>
                <input type="date" value={editInvIssueDate} onChange={(e) => setEditInvIssueDate(e.target.value)}
                  style={{ width: '100%', padding: '12px 15px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Due Date</label>
                <input type="date" value={editInvDueDate} onChange={(e) => setEditInvDueDate(e.target.value)}
                  style={{ width: '100%', padding: '12px 15px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '25px', flexWrap: 'wrap' }}>
              <button onClick={closeEditInvModal} disabled={editInvSaving}
                style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancel
              </button>
              <button onClick={handleSaveEditInv} disabled={editInvSaving}
                style={{ padding: '12px 24px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: editInvSaving ? 'not-allowed' : 'pointer', opacity: editInvSaving ? 0.6 : 1, fontFamily: 'inherit' }}>
                {editInvSaving ? 'Saving...' : '💾 Save Changes'}
              </button>
            </div>
          </div>
        </div>
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

function TabButton({ active, onClick, label, count }) {
  return (
    <button onClick={onClick} style={{
      cursor: 'pointer', padding: '12px 22px', borderRadius: '10px',
      fontWeight: 700, fontSize: '0.9rem',
      border: '2px solid ' + (active ? '#FF6B00' : '#E9ECEF'),
      background: active ? '#FFF5EB' : 'white',
      color: active ? '#FF6B00' : '#343A40',
      fontFamily: 'inherit',
    }}>
      {label}
      {typeof count === 'number' && (
        <span style={{ background: active ? '#FF6B00' : '#E9ECEF', color: active ? 'white' : '#495057', padding: '2px 8px', borderRadius: '10px', marginLeft: '6px', fontSize: '0.8rem' }}>{count}</span>
      )}
    </button>
  );
}
