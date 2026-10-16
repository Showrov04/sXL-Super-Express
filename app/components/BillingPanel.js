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

function renderModeCell(s) {
  const mode = String(s.shipMode || '').toUpperCase();
  const isSpecialParcel = s.isSpecialParcel === true;

  if (isSpecialParcel && mode === 'AIR') {
    return (
      <span style={{
        background: '#F8D7DA',
        color: '#721C24',
        padding: '4px 10px',
        borderRadius: '12px',
        fontWeight: 700,
        fontSize: '0.72rem',
        letterSpacing: '0.3px',
        whiteSpace: 'nowrap'
      }}>
        AIR-SP
      </span>
    );
  }

  return s.shipmentType || s.shipMode || '—';
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

const TOP_SCROLLBAR_STYLE = {
  overflowX: 'auto',
  overflowY: 'hidden',
  borderBottom: '1px solid #E9ECEF',
  background: '#F8F9FA',
  height: '14px',
  scrollbarWidth: 'thin',
  scrollbarColor: '#ADB5BD #F1F3F5',
};

const COL_W_SHIPPER_REF = 130;
const COL_W_TRACKING = 190;
const COL_W_MODE = 130;
const COL_W_ROUTE = 170;
const FROZEN_LEFT_REF = 0;
const FROZEN_LEFT_TRACKING = COL_W_SHIPPER_REF;
const FROZEN_LEFT_MODE = COL_W_SHIPPER_REF + COL_W_TRACKING;
const FROZEN_LEFT_ROUTE = COL_W_SHIPPER_REF + COL_W_TRACKING + COL_W_MODE;

const FROZEN_LEFT_TRACKING_ALL = 0;
const FROZEN_LEFT_MODE_ALL = COL_W_TRACKING;
const FROZEN_LEFT_ROUTE_ALL = COL_W_TRACKING + COL_W_MODE;

const COL_W_ACTIONS = 280;
const HOVER_BG = '#EEF5FF';

const PRIMARY_BTN_BASE = {
  padding: '8px 14px',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 700,
  fontSize: '0.75rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '5px',
  lineHeight: 1.15,
  minWidth: '105px',
  maxWidth: '150px',
  flexShrink: 0,
  boxSizing: 'border-box',
};

const MORE_BTN = {
  width: '36px',
  height: '34px',
  padding: 0,
  background: 'white',
  color: '#003366',
  border: '1px solid #D0D6DB',
  borderRadius: '8px',
  fontWeight: 800,
  fontSize: '1rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  lineHeight: 1,
  flexShrink: 0,
};

const MENU_ACTION_STYLE = {
  padding: '5px 10px',
  border: 'none',
  borderRadius: '6px',
  fontWeight: 700,
  fontSize: '0.72rem',
  cursor: 'pointer',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  display: 'inline-flex',
  alignItems: 'center',
  gap: '4px',
  textDecoration: 'none',
  lineHeight: 1.2,
};

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

  const [hoveredRow, setHoveredRow] = useState(null);

  const [colFilters, setColFilters] = useState({
    shipperRef: [], tracking: [], mode: [], route: [], shipper: [], recipient: [],
    status: [], payment: [], invNumber: [],
  });
  const [openFilter, setOpenFilter] = useState(null);
  const [filterSearch, setFilterSearch] = useState('');
  const filterDropdownRef = useRef(null);

  const topScrollRef = useRef(null);
  const tableScrollRef = useRef(null);
  const isSyncingRef = useRef(false);

  const [actionMenu, setActionMenu] = useState(null);
  const [expandedMonthly, setExpandedMonthly] = useState({});

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

  const [monthYear, monthNum] = (() => {
    const m = String(monthlyMonth || '').match(/^(\d{4})-(\d{2})$/);
    return m ? [m[1], m[2]] : ['', ''];
  })();

  function setMonthYear(y) {
    if (!y) { setMonthlyMonth(''); return; }
    const n = monthNum || String(new Date().getMonth() + 1).padStart(2, '0');
    setMonthlyMonth(y + '-' + n);
  }
  function setMonthNum(n) {
    if (!n) { setMonthlyMonth(''); return; }
    const y = monthYear || String(new Date().getFullYear());
    setMonthlyMonth(y + '-' + n);
  }

  const CURRENT_YEAR = new Date().getFullYear();
  const YEAR_OPTIONS = [CURRENT_YEAR + 1, CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2];
  const MONTH_OPTIONS = [
    { v: '01', label: 'January' },
    { v: '02', label: 'February' },
    { v: '03', label: 'March' },
    { v: '04', label: 'April' },
    { v: '05', label: 'May' },
    { v: '06', label: 'June' },
    { v: '07', label: 'July' },
    { v: '08', label: 'August' },
    { v: '09', label: 'September' },
    { v: '10', label: 'October' },
    { v: '11', label: 'November' },
    { v: '12', label: 'December' },
  ];

  const [monthlyLocalCurrency, setMonthlyLocalCurrency] = useState('');
  const [monthlyExchangeRate, setMonthlyExchangeRate] = useState('');
  const [monthlyGenerating, setMonthlyGenerating] = useState(false);
  const [clearingIndividual, setClearingIndividual] = useState(false);
  const [downloadingSummary, setDownloadingSummary] = useState(false);
  const [monthlyMsg, setMonthlyMsg] = useState('');
  const [monthlyInvoices, setMonthlyInvoices] = useState([]);
  const [monthlyLoading, setMonthlyLoading] = useState(false);
  const [deletingInvoiceId, setDeletingInvoiceId] = useState('');

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

  useEffect(() => {
    if (!actionMenu) return;
    function close() { setActionMenu(null); }
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [actionMenu]);

  useEffect(() => {
    const topEl = topScrollRef.current;
    const tableEl = tableScrollRef.current;
    if (!topEl || !tableEl) return;

    function syncFromTop() {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      tableEl.scrollLeft = topEl.scrollLeft;
      isSyncingRef.current = false;
    }
    function syncFromTable() {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      topEl.scrollLeft = tableEl.scrollLeft;
      isSyncingRef.current = false;
    }

    topEl.addEventListener('scroll', syncFromTop);
    tableEl.addEventListener('scroll', syncFromTable);
    return () => {
      topEl.removeEventListener('scroll', syncFromTop);
      tableEl.removeEventListener('scroll', syncFromTable);
    };
  }, [loading, shipments.length, tab]);

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
      const res = await fetch('/api/admin/invoices?type=monthly-summary', {
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
      let successMsg = '✅ Cost saved: ' + data.currency + ' ' + Number(data.total).toFixed(2);
      if (data.invoicesSynced > 0) {
        successMsg += ' · Invoice also updated';
      }
      setCostMsg(successMsg);
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
    if (s.individualInvoice) {
      const proceed = window.confirm(
        'Individual invoice ' + s.individualInvoice.invoiceNumber + ' already exists for ' + tn + '. Issue a new one?'
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

  async function handleDeleteIndividualInvoice(s) {
    const inv = s.individualInvoice;
    if (!inv) return;

    const statusLower = String(inv.status || '').toLowerCase();
    if (statusLower === 'paid') {
      window.alert('Cannot delete a paid invoice (' + inv.invoiceNumber + '). Mark it as Unpaid first.');
      return;
    }

    const ok = window.confirm(
      'Delete individual invoice ' + inv.invoiceNumber + '?\n\n' +
      'The shipment becomes "not invoiced" and can then be included in a monthly invoice.'
    );
    if (!ok) return;

    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'delete', invoiceId: inv.invoiceId }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); return; }
      setToast('🗑️ Invoice ' + data.deletedInvoiceNumber + ' deleted');
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

  async function handleDeleteMonthlyInvoice(inv) {
    const statusLower = String(inv.status || '').toLowerCase();
    if (statusLower === 'paid') {
      window.alert('Cannot delete a paid invoice (' + inv.invoiceNumber + '). Mark it as Unpaid first.');
      return;
    }

    const ok = window.confirm(
      'Delete monthly invoice ' + inv.invoiceNumber + '?\n\n' +
      'Any INDIVIDUAL invoices linked to the same shipments will also be deleted, so you can regenerate a new monthly invoice for the same shipper and month.'
    );
    if (!ok) return;

    setDeletingInvoiceId(inv.invoiceID);
    const token = localStorage.getItem('sxl_token');

    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'delete', invoiceId: inv.invoiceID }),
      });
      const data = await res.json();
      if (!data.success) {
        window.alert('Error: ' + (data.error || 'Failed'));
        setDeletingInvoiceId('');
        return;
      }
      let msg = '🗑️ Monthly invoice ' + data.deletedInvoiceNumber + ' deleted';
      if (data.unlinkedCount > 0) {
        msg += ' · also unlinked ' + data.unlinkedCount + ' individual invoice(s)';
      }
      setToast(msg);
      setDeletingInvoiceId('');
      loadMonthlyInvoices();
      loadShipments();
    } catch (err) {
      window.alert('Error: ' + err.message);
      setDeletingInvoiceId('');
    }
  }

  function openEditInvModal(s) {
    const target = s.individualInvoice || s.monthlyInvoice;
    if (!target) return;
    setEditInvModal({ shipment: s, invoice: target });
    setEditInvIssueDate(target.issueDate ? String(target.issueDate).slice(0, 10) : '');
    setEditInvDueDate(target.dueDate ? String(target.dueDate).slice(0, 10) : '');
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
          invoiceId: editInvModal.invoice.invoiceId,
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
      const invNum = editInvModal.invoice.invoiceNumber;
      closeEditInvModal();
      setToast('✅ Invoice ' + invNum + ' dates updated');
      setTimeout(loadShipments, 400);
    } catch (err) {
      setEditInvError('Connection error: ' + err.message);
      setEditInvSaving(false);
    }
  }

  async function handleClearIndividualInvoices() {
    if (!monthlyShipper || !monthlyMonth) {
      setMonthlyMsg('❌ Pick shipper and month first.');
      return;
    }

    const ok = window.confirm(
      'Delete ALL individual invoices for "' + monthlyShipper + '" in ' + monthlyMonth + '?\n\n' +
      'Shipments stay unpaid and will be ready for monthly invoicing.'
    );
    if (!ok) return;

    setClearingIndividual(true);
    setMonthlyMsg('');
    const token = localStorage.getItem('sxl_token');

    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({
          action: 'clearIndividualForShipperMonth',
          shipperName: monthlyShipper,
          month: monthlyMonth,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setMonthlyMsg('❌ ' + (data.error || 'Failed.'));
        setClearingIndividual(false);
        return;
      }
      setMonthlyMsg('✅ Cleared ' + data.deletedCount + ' individual invoice(s): ' + data.deletedInvoiceNumbers.join(', ') + '. Now click "Generate Monthly Invoice".');
      setClearingIndividual(false);
    } catch (err) {
      setMonthlyMsg('❌ Connection error.');
      setClearingIndividual(false);
    }
  }

  async function handleDownloadSummary() {
    if (!monthlyShipper || !monthlyMonth) {
      setMonthlyMsg('❌ Pick shipper and month first.');
      return;
    }

    setDownloadingSummary(true);
    setMonthlyMsg('');
    const token = localStorage.getItem('sxl_token');

    try {
      const params = new URLSearchParams({
        shipper: monthlyShipper,
        month: monthlyMonth,
        _v: String(Date.now()),
      });
      const res = await fetch('/api/pdf/summary?' + params.toString(), {
        headers: { Authorization: 'Bearer ' + token },
      });

      if (!res.ok) {
        let msg = 'HTTP ' + res.status;
        try {
          const txt = await res.text();
          if (txt) msg = txt.slice(0, 200);
        } catch (e) { /* silent */ }
        setMonthlyMsg('❌ ' + msg);
        setDownloadingSummary(false);
        return;
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeShipper = String(monthlyShipper).replace(/[^a-zA-Z0-9._-]/g, '_');
      a.download = 'sXL_Monthly_Summary_' + safeShipper + '_' + monthlyMonth + '.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      setDownloadingSummary(false);
      setMonthlyMsg('✅ Summary PDF downloaded');
    } catch (err) {
      setMonthlyMsg('❌ Connection error: ' + err.message);
      setDownloadingSummary(false);
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
          localCurrency: monthlyLocalCurrency || null,
          exchangeRate: parseFloat(monthlyExchangeRate) || 0,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setMonthlyMsg('❌ ' + (data.error || 'Failed.'));
        setMonthlyGenerating(false);
        return;
      }
      let msg = '✅ Monthly invoice ' + data.invoiceNumber + ' generated (' + data.shipmentCount + ' shipments, USD ' + Number(data.total).toFixed(2) + ')';
      if (data.localCurrency && data.localAmount) {
        msg += '  ·  ' + data.localCurrency + ' ' + Number(data.localAmount).toFixed(2) + ' (1 USD = ' + data.exchangeRate + ')';
      }
      if (data.skippedCount > 0) {
        msg += '  ·  ' + data.skippedCount + ' skipped (already invoiced)';
      }
      setMonthlyMsg(msg);
      setMonthlyGenerating(false);
      setTimeout(loadMonthlyInvoices, 500);
      setTimeout(loadShipments, 500);
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

  function getPrimaryAction(s) {
    const tn = s.trackingNumber;
    const hasCost = s.shippingCost && parseFloat(s.shippingCost) > 0;
    const hasIndividual = !!s.individualInvoice;
    const hasMonthly = !!s.monthlyInvoice;
    const hasInvoice = hasIndividual || hasMonthly;
    const displayInvoice = s.individualInvoice || s.monthlyInvoice;
    const isSent = !!(s.invoiceSentAt || (displayInvoice && displayInvoice.sentAt));
    const isPaid = String(s.paymentStatus || '').toLowerCase() === 'paid';

    if (isPaid) {
      return { label: '✅ Paid', bg: '#D4EDDA', color: '#155724', onClick: null };
    }
    if (!hasCost) {
      return { label: '🔄 Add Cost', bg: '#FF6B00', color: 'white', onClick: () => openCostModal(s) };
    }
    if (!hasInvoice) {
      return { label: '🧾 Issue Invoice', bg: '#0D6EFD', color: 'white', onClick: () => handleIssueInvoice(s) };
    }
    if (!isSent) {
      return { label: '📤 Send Invoice', bg: '#DC3545', color: 'white', onClick: () => handleSendInvoice(tn) };
    }
    return { label: '💵 Mark Paid', bg: '#28A745', color: 'white', onClick: () => handleMarkPaid(tn) };
  }

  function HeaderCell({ col, label, width, frozenLeft, hasShadow }) {
    const isFilterable = ['shipperRef', 'tracking', 'mode', 'route', 'shipper', 'recipient', 'status', 'payment', 'invNumber'].includes(col);
    const activeCount = (colFilters[col] || []).length;
    const isOpen = openFilter === col;
    const isFrozen = frozenLeft !== undefined;

    return (
      <th style={{
        ...TH_STYLE,
        background: isOpen ? '#DDE3E9' : '#E9ECEF',
        width, minWidth: width,
        zIndex: isFrozen ? 22 : 20,
        ...(frozenLeft !== undefined ? { left: frozenLeft } : {}),
        ...(hasShadow ? { boxShadow: FROZEN_SHADOW } : {}),
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px' }}>
          <span>{label}{activeCount > 0 && <span style={{ marginLeft: '6px', color: '#FF6B00' }}>({activeCount})</span>}</span>
          {isFilterable && (
            <button
              type="button"
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
              <button type="button" onClick={() => clearColumn(col)} style={{ flex: 1, padding: '6px 10px', background: '#F8F9FA', color: '#343A40', border: '1px solid #E9ECEF', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
              <button type="button" onClick={() => { setOpenFilter(null); setFilterSearch(''); }} style={{ flex: 1, padding: '6px 10px', background: '#003366', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
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
  const isPaidTab = tab === 'paid';

  const tableMinWidth = isDueTab ? 2400 : 1700;

  const vToken = Date.now();

  const menuShipment = actionMenu
    ? shipments.find((s) => s.trackingNumber === actionMenu.trackingNumber)
    : null;

  function openActionMenu(e, trackingNumber) {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setActionMenu({
      trackingNumber,
      top: rect.bottom + 4,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }

  function toggleMonthlyExpand(invoiceID) {
    setExpandedMonthly((prev) => ({ ...prev, [invoiceID]: !prev[invoiceID] }));
  }

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
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E9ECEF', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden', position: 'relative' }}>
          <div ref={topScrollRef} style={TOP_SCROLLBAR_STYLE} aria-hidden="true">
            <div style={{ width: tableMinWidth + 'px', height: '1px' }} />
          </div>

          <div ref={tableScrollRef} style={{ overflow: 'auto', maxHeight: '70vh' }}>
            <table style={{ borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem', minWidth: tableMinWidth + 'px', tableLayout: 'fixed', width: '100%' }}>
              <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                <tr>
                  {showShipperRef && (
                    <HeaderCell col="shipperRef" label="Shipper Ref" width={COL_W_SHIPPER_REF} frozenLeft={FROZEN_LEFT_REF} />
                  )}
                  <HeaderCell col="tracking" label="Tracking #" width={COL_W_TRACKING} frozenLeft={isAllTab ? FROZEN_LEFT_TRACKING_ALL : FROZEN_LEFT_TRACKING} />
                  <HeaderCell col="mode" label="Mode" width={COL_W_MODE} frozenLeft={isAllTab ? FROZEN_LEFT_MODE_ALL : FROZEN_LEFT_MODE} />
                  <HeaderCell col="route" label="Route" width={COL_W_ROUTE} frozenLeft={isAllTab ? FROZEN_LEFT_ROUTE_ALL : FROZEN_LEFT_ROUTE} hasShadow={true} />
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
                  <HeaderCell col="none" label="Actions" width={COL_W_ACTIONS} />
                </tr>
              </thead>
              <tbody>
                {filtered.map((s, i) => {
                  const sc = statusClass(s.status);
                  const isHovered = hoveredRow === s.trackingNumber;
                  const rowBg = isHovered ? HOVER_BG : (i % 2 === 0 ? '#FFFFFF' : '#FAFBFC');
                  const frozenTd = { ...TD_STYLE, background: rowBg, position: 'sticky', zIndex: 3 };

                  const primary = getPrimaryAction(s);

                  return (
                    <tr
                      key={i}
                      onMouseEnter={() => setHoveredRow(s.trackingNumber)}
                      onMouseLeave={() => setHoveredRow(null)}
                      style={{ background: rowBg, transition: 'background 0.12s ease' }}
                    >
                      {showShipperRef && (
                        <td style={{ ...frozenTd, left: FROZEN_LEFT_REF, width: COL_W_SHIPPER_REF, minWidth: COL_W_SHIPPER_REF }}>{s.shipperRef || '—'}</td>
                      )}
                      <td style={{
                        ...frozenTd,
                        left: isAllTab ? FROZEN_LEFT_TRACKING_ALL : FROZEN_LEFT_TRACKING,
                        width: COL_W_TRACKING, minWidth: COL_W_TRACKING,
                        fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366'
                      }}>
                        {s.trackingNumber}
                        {s.individualInvoice && (
                          <span
                            title={'Invoiced individually: ' + (s.individualInvoice?.invoiceNumber || '')}
                            style={{
                              marginLeft: '6px',
                              display: 'inline-block',
                              background: '#DBEAFE',
                              color: '#1E40AF',
                              padding: '1px 6px',
                              borderRadius: '8px',
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              letterSpacing: '0.3px',
                              verticalAlign: 'middle',
                              cursor: 'help'
                            }}
                          >
                            🧾
                          </span>
                        )}
                        {s.monthlyInvoice && (
                          <span
                            title={'Included in monthly invoice ' + (s.monthlyInvoice?.invoiceNumber || '')}
                            style={{
                              marginLeft: '4px',
                              display: 'inline-block',
                              background: '#DBEAFE',
                              color: '#1E40AF',
                              padding: '1px 6px',
                              borderRadius: '8px',
                              fontSize: '0.6rem',
                              fontWeight: 800,
                              letterSpacing: '0.3px',
                              verticalAlign: 'middle',
                              cursor: 'help'
                            }}
                          >
                            📅
                          </span>
                        )}
                      </td>
                      <td style={{ ...frozenTd, left: isAllTab ? FROZEN_LEFT_MODE_ALL : FROZEN_LEFT_MODE, width: COL_W_MODE, minWidth: COL_W_MODE }}>{renderModeCell(s)}</td>
                      <td style={{ ...frozenTd, left: isAllTab ? FROZEN_LEFT_ROUTE_ALL : FROZEN_LEFT_ROUTE, width: COL_W_ROUTE, minWidth: COL_W_ROUTE, boxShadow: FROZEN_SHADOW }}>{s.origin || '—'} → {s.destination || '—'}</td>
                      <td style={{ ...TD_STYLE, width: 150 }}>{s.shipperName || '—'}</td>
                      <td style={{ ...TD_STYLE, width: 150 }}>{s.recipientName || '—'}</td>
                      <td style={{ ...TD_STYLE, width: 120 }}>
                        <span style={{ background: sc.bg, color: sc.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s.status}</span>
                      </td>
                      <td style={{ ...TD_STYLE, width: 100 }}>{s.bookingWeight ? s.bookingWeight + ' kg' : '—'}</td>
                      <td style={{ ...TD_STYLE, width: 130 }}>{renderActualCell(s)}</td>
                      <td style={{ ...TD_STYLE, width: 110 }}>
                        {s.shippingCost && parseFloat(s.shippingCost) > 0
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
                          {(s.individualInvoice || s.monthlyInvoice) && (s.individualInvoice || s.monthlyInvoice).issueDate
                            ? formatDate((s.individualInvoice || s.monthlyInvoice).issueDate)
                            : <span style={{ color: '#ADB5BD' }}>—</span>}
                        </td>
                      )}
                      {showInvoiceColumns && (
                        <td style={{ ...TD_STYLE, width: 130, fontWeight: 700, color: '#003366' }}>
                          {(s.individualInvoice || s.monthlyInvoice)
                            ? (s.individualInvoice || s.monthlyInvoice).invoiceNumber
                            : <span style={{ color: '#ADB5BD', fontStyle: 'italic' }}>—</span>}
                        </td>
                      )}
                      {showInvoiceColumns && (
                        <td style={{ ...TD_STYLE, width: 115 }}>
                          {(s.individualInvoice || s.monthlyInvoice) && (s.individualInvoice || s.monthlyInvoice).dueDate
                            ? formatDate((s.individualInvoice || s.monthlyInvoice).dueDate)
                            : <span style={{ color: '#ADB5BD' }}>—</span>}
                        </td>
                      )}

                      <td style={{
                        ...TD_STYLE,
                        width: COL_W_ACTIONS,
                        minWidth: COL_W_ACTIONS,
                        padding: '8px 12px',
                        whiteSpace: 'nowrap',
                        overflow: 'visible',
                        textOverflow: 'clip',
                      }}>
                        {isDueTab ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            {primary.onClick ? (
                              <button
                                type="button"
                                onClick={primary.onClick}
                                style={{
                                  ...PRIMARY_BTN_BASE,
                                  background: primary.bg,
                                  color: primary.color,
                                }}
                              >
                                {primary.label}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={(e) => openActionMenu(e, s.trackingNumber)}
                                title="Click for more actions"
                                style={{
                                  ...PRIMARY_BTN_BASE,
                                  background: primary.bg,
                                  color: primary.color,
                                }}
                              >
                                {primary.label}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => openActionMenu(e, s.trackingNumber)}
                              title="More actions"
                              style={MORE_BTN}
                            >
                              ⋯
                            </button>
                          </div>
                        ) : isPaidTab ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleMarkUnpaid(s.trackingNumber)}
                              style={{ ...MENU_ACTION_STYLE, background: '#FFC107', color: '#333' }}
                            >
                              ↩ Undo
                            </button>
                          </div>
                        ) : (
                          <span style={{ color: '#ADB5BD', display: 'inline-block', width: '100%', textAlign: 'right' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {actionMenu && menuShipment && (
        <>
          <div
            onClick={() => setActionMenu(null)}
            style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'transparent' }}
          />
          <div
            style={{
              position: 'fixed',
              top: actionMenu.top,
              right: actionMenu.right,
              zIndex: 9999,
              background: 'white',
              border: '1px solid #D0D6DB',
              borderRadius: '10px',
              boxShadow: '0 12px 32px rgba(0,0,0,0.18)',
              minWidth: '270px',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '10px 14px', borderBottom: '1px solid #F1F3F5', background: '#F8F9FA' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#6C757D', fontWeight: 700 }}>More actions</div>
              <div style={{ fontFamily: 'Consolas, monospace', fontSize: '0.85rem', fontWeight: 700, color: '#003366', marginTop: '2px' }}>{menuShipment.trackingNumber}</div>
              {menuShipment.individualInvoice && (
                <div style={{ fontSize: '0.72rem', color: '#6C757D', marginTop: '4px' }}>
                  🧾 Individual: <b>{menuShipment.individualInvoice.invoiceNumber}</b>
                </div>
              )}
              {menuShipment.monthlyInvoice && (
                <div style={{ fontSize: '0.72rem', color: '#6C757D', marginTop: '2px' }}>
                  📅 Monthly: <b>{menuShipment.monthlyInvoice.invoiceNumber}</b>
                </div>
              )}
            </div>

            <MenuItem
              label="📄 Booking PDF"
              sub="Open the booking confirmation"
              onClick={() => {
                setActionMenu(null);
                window.open('/api/pdf/booking/' + menuShipment.trackingNumber + '?_v=' + Date.now(), '_blank', 'noopener');
              }}
            />

            {menuShipment.shippingCost && parseFloat(menuShipment.shippingCost) > 0 && (
              <MenuItem
                label="🔄 Update Shipment Cost"
                sub="Edit the cost breakdown"
                onClick={() => { setActionMenu(null); openCostModal(menuShipment); }}
              />
            )}

            {menuShipment.individualInvoice && (
              <>
                <MenuItem
                  label="📄 Individual Invoice PDF"
                  sub={menuShipment.individualInvoice.invoiceNumber}
                  onClick={() => {
                    setActionMenu(null);
                    window.open('/api/pdf/invoice/' + menuShipment.individualInvoice.invoiceId + '?_v=' + Date.now(), '_blank', 'noopener');
                  }}
                />
                <MenuItem
                  label="✏️ Edit Invoice Dates"
                  sub="Change issue / due dates"
                  onClick={() => { setActionMenu(null); openEditInvModal(menuShipment); }}
                />
                <MenuItem
                  label="🔁 Reissue Invoice"
                  sub="Create a fresh individual invoice"
                  onClick={() => { setActionMenu(null); handleIssueInvoice(menuShipment); }}
                />
                {String(menuShipment.individualInvoice.status || '').toLowerCase() !== 'paid' && (
                  <MenuItem
                    label="🗑️ Delete Individual Invoice"
                    sub={'Remove ' + menuShipment.individualInvoice.invoiceNumber + ' so this shipment can be added to a monthly invoice'}
                    onClick={() => { setActionMenu(null); handleDeleteIndividualInvoice(menuShipment); }}
                  />
                )}
              </>
            )}

            {menuShipment.monthlyInvoice && (
              <>
                <MenuItem
                  label="📅 Monthly Invoice PDF"
                  sub={menuShipment.monthlyInvoice.invoiceNumber}
                  onClick={() => {
                    setActionMenu(null);
                    window.open('/api/pdf/invoice/' + menuShipment.monthlyInvoice.invoiceId + '?_v=' + Date.now(), '_blank', 'noopener');
                  }}
                />
                {!menuShipment.individualInvoice && (
                  <MenuItem
                    label="🧾 Issue Individual Invoice"
                    sub="Create a separate invoice just for this shipment"
                    onClick={() => { setActionMenu(null); handleIssueInvoice(menuShipment); }}
                  />
                )}
              </>
            )}

            {(() => {
              const displayInv = menuShipment.individualInvoice || menuShipment.monthlyInvoice;
              const isSent = !!(menuShipment.invoiceSentAt || (displayInv && displayInv.sentAt));
              if (!displayInv || !isSent) return null;
              return (
                <MenuItem
                  label="📤 Resend Invoice to Customer"
                  sub="Send the invoice email again"
                  onClick={() => { setActionMenu(null); handleSendInvoice(menuShipment.trackingNumber); }}
                />
              );
            })()}

            {String(menuShipment.paymentStatus || '').toLowerCase() === 'paid' ? (
              <MenuItem
                label="↩ Mark as Unpaid"
                sub="Reverse the payment status"
                onClick={() => { setActionMenu(null); handleMarkUnpaid(menuShipment.trackingNumber); }}
              />
            ) : (
              <MenuItem
                label="💵 Mark as Paid"
                sub="Force mark payment received"
                onClick={() => { setActionMenu(null); handleMarkPaid(menuShipment.trackingNumber); }}
              />
            )}
          </div>
        </>
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '8px' }}>
                  <select
                    value={monthYear}
                    onChange={(e) => setMonthYear(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '2px solid #E9ECEF',
                      borderRadius: '8px', fontSize: '0.9rem',
                      fontFamily: 'inherit', boxSizing: 'border-box',
                      cursor: 'pointer', background: 'white',
                    }}
                  >
                    <option value="">Year</option>
                    {YEAR_OPTIONS.map((y) => (
                      <option key={y} value={String(y)}>{y}</option>
                    ))}
                  </select>
                  <select
                    value={monthNum}
                    onChange={(e) => setMonthNum(e.target.value)}
                    style={{
                      width: '100%', padding: '10px 12px',
                      border: '2px solid #E9ECEF',
                      borderRadius: '8px', fontSize: '0.9rem',
                      fontFamily: 'inherit', boxSizing: 'border-box',
                      cursor: 'pointer', background: 'white',
                    }}
                  >
                    <option value="">Month</option>
                    {MONTH_OPTIONS.map((m) => (
                      <option key={m.v} value={m.v}>{m.label}</option>
                    ))}
                  </select>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#6C757D', marginTop: '4px' }}>
                  Combined value: <b>{monthlyMonth || 'YYYY-MM'}</b>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Local Currency (optional)</label>
                <select
                  value={monthlyLocalCurrency}
                  onChange={(e) => setMonthlyLocalCurrency(e.target.value)}
                  style={{ width: '100%', padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box', cursor: 'pointer', background: 'white' }}
                >
                  <option value="">-- None --</option>
                  <option value="HKD">HKD — Hong Kong Dollar</option>
                  <option value="BDT">BDT — Bangladeshi Taka</option>
                  <option value="CNY">CNY — Chinese Yuan</option>
                  <option value="EUR">EUR — Euro</option>
                  <option value="USD">USD — US Dollar</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '6px' }}>Exchange Rate (1 USD = ?)</label>
                <input
                  type="number"
                  step="0.0001"
                  value={monthlyExchangeRate}
                  onChange={(e) => setMonthlyExchangeRate(e.target.value)}
                  placeholder="e.g., 7.80"
                  disabled={!monthlyLocalCurrency}
                  style={{
                    width: '100%', padding: '10px 14px',
                    border: '2px solid #E9ECEF', borderRadius: '8px',
                    fontSize: '0.9rem', fontFamily: 'inherit', boxSizing: 'border-box',
                    background: !monthlyLocalCurrency ? '#F8F9FA' : 'white',
                    cursor: !monthlyLocalCurrency ? 'not-allowed' : 'text',
                  }}
                />
                <div style={{ fontSize: '0.72rem', color: '#6C757D', marginTop: '4px' }}>
                  {monthlyLocalCurrency
                    ? (monthlyExchangeRate
                        ? 'Local total will be auto-computed: USD total × ' + monthlyExchangeRate
                        : 'Enter the rate to show the local equivalent on the invoice')
                    : 'Pick a currency first'}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="submit" disabled={monthlyGenerating} style={{ padding: '12px 24px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: monthlyGenerating ? 'not-allowed' : 'pointer', opacity: monthlyGenerating ? 0.6 : 1, fontFamily: 'inherit' }}>
                {monthlyGenerating ? 'Generating...' : '🧾 Generate Monthly Invoice'}
              </button>
              <button
                type="button"
                onClick={handleDownloadSummary}
                disabled={downloadingSummary || !monthlyShipper || !monthlyMonth}
                title="Download a read-only summary PDF listing all invoices for this shipper + month"
                style={{
                  padding: '12px 24px',
                  background: '#FF6B00',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: (downloadingSummary || !monthlyShipper || !monthlyMonth) ? 'not-allowed' : 'pointer',
                  opacity: (downloadingSummary || !monthlyShipper || !monthlyMonth) ? 0.5 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {downloadingSummary ? 'Preparing...' : '📊 Download Summary PDF'}
              </button>
              <button type="button" onClick={loadMonthlyInvoices} style={{ padding: '12px 20px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Refresh List</button>
              <button
                type="button"
                onClick={handleClearIndividualInvoices}
                disabled={clearingIndividual || !monthlyShipper || !monthlyMonth}
                title="Delete all individual invoices for this shipper + month so you can regenerate as monthly"
                style={{
                  padding: '12px 20px',
                  background: 'transparent',
                  color: '#DC3545',
                  border: '2px solid #DC3545',
                  borderRadius: '8px',
                  fontWeight: 700,
                  cursor: (clearingIndividual || !monthlyShipper || !monthlyMonth) ? 'not-allowed' : 'pointer',
                  opacity: (clearingIndividual || !monthlyShipper || !monthlyMonth) ? 0.5 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {clearingIndividual ? 'Clearing...' : '🗑️ Clear Individual Invoices'}
              </button>
            </div>

            <div style={{ fontSize: '0.78rem', color: '#6C757D', marginTop: '10px', lineHeight: 1.6 }}>
              <b style={{ color: '#003366' }}>📊 Download Summary PDF</b> — produces a read-only report listing existing invoices for that shipper + month. Does not create a new invoice and does not touch individual invoices.
            </div>

            {monthlyMsg && (
              <div style={{ marginTop: '15px', padding: '12px 16px', borderRadius: '8px', fontSize: '0.9rem', background: monthlyMsg.startsWith('✅') ? '#D4EDDA' : '#F8D7DA', color: monthlyMsg.startsWith('✅') ? '#155724' : '#721C24', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {monthlyInvoices.map((inv) => {
                const isExpanded = !!expandedMonthly[inv.invoiceID];
                const statusLower = String(inv.status).toLowerCase();
                const statusBg = statusLower === 'paid' ? '#D4EDDA' : (statusLower === 'issued' ? '#FFF3CD' : '#E9ECEF');
                const statusColor = statusLower === 'paid' ? '#155724' : (statusLower === 'issued' ? '#856404' : '#495057');
                const isPaid = statusLower === 'paid';
                const isDeleting = deletingInvoiceId === inv.invoiceID;

                const rows = Array.isArray(inv.shipments) ? inv.shipments : [];
                const invCurrency = inv.currency || 'USD';
                const invTotal = Number(inv.amount || 0).toFixed(2);

                return (
                  <div key={inv.invoiceID} style={{ background: 'white', border: '1px solid #E9ECEF', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#F8F9FA', borderBottom: isExpanded ? '1px solid #E9ECEF' : 'none', gap: '14px', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <button
                          type="button"
                          onClick={() => toggleMonthlyExpand(inv.invoiceID)}
                          title={isExpanded ? 'Collapse' : 'Expand shipments'}
                          style={{
                            width: '28px', height: '28px',
                            borderRadius: '8px',
                            border: '1px solid #D0D6DB',
                            background: 'white',
                            cursor: 'pointer',
                            fontFamily: 'inherit',
                            fontSize: '0.8rem',
                            fontWeight: 800,
                            color: '#003366',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            lineHeight: 1,
                          }}
                        >
                          {isExpanded ? '▾' : '▸'}
                        </button>
                        <div>
                          <div style={{ fontFamily: 'Consolas, monospace', fontWeight: 800, color: '#003366', fontSize: '0.95rem' }}>{inv.invoiceNumber}</div>
                          <div style={{ fontSize: '0.8rem', color: '#6C757D', marginTop: '2px' }}>
                            {inv.month || '—'} · {inv.shipperName || '—'} · {inv.shipmentsCount || rows.length} shipment{(inv.shipmentsCount || rows.length) !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.72rem', background: statusBg, color: statusColor, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          {inv.status}
                        </span>
                        <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 800, color: '#FF6B00', fontSize: '1rem' }}>
                          {invCurrency} {invTotal}
                        </span>
                        {inv.localCurrency && inv.localAmount && (
                          <span style={{ fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#495057', fontSize: '0.8rem' }}>
                            · {inv.localCurrency} {Number(inv.localAmount).toFixed(2)}
                          </span>
                        )}
                        <a
                          href={'/api/pdf/invoice/' + inv.invoiceID + '?_v=' + vToken}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ ...MENU_ACTION_STYLE, background: '#00A86B', color: 'white' }}
                        >
                          📄 PDF
                        </a>
                        <button
                          type="button"
                          onClick={() => handleDeleteMonthlyInvoice(inv)}
                          disabled={isPaid || isDeleting}
                          title={isPaid ? 'Cannot delete a paid invoice — mark it unpaid first' : 'Delete this invoice (also unlinks individual invoices for the same shipments)'}
                          style={{
                            ...MENU_ACTION_STYLE,
                            background: 'transparent',
                            color: (isPaid || isDeleting) ? '#ADB5BD' : '#DC3545',
                            border: '2px solid ' + ((isPaid || isDeleting) ? '#E9ECEF' : '#DC3545'),
                            cursor: (isPaid || isDeleting) ? 'not-allowed' : 'pointer',
                            opacity: isPaid ? 0.5 : 1,
                          }}
                        >
                          {isDeleting ? '...' : '🗑️'}
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{ padding: '4px 0 0' }}>
                        {rows.length === 0 ? (
                          <div style={{ padding: '18px 20px', color: '#6C757D', fontStyle: 'italic', fontSize: '0.85rem' }}>
                            No shipment data available for this invoice.
                          </div>
                        ) : (
                          <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.82rem', minWidth: '900px' }}>
                              <thead>
                                <tr>
                                  {['Shipper Ref', 'Tracking #', 'Mode', 'Route', 'Recipient', 'Weight', 'Amount'].map((h, idx) => (
                                    <th key={h} style={{ padding: '12px', textAlign: idx === 6 ? 'right' : 'left', fontWeight: 700, color: 'white', background: '#002347', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
                                      {h}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((r, idx) => {
                                  const rowBg = idx % 2 === 0 ? '#FFFFFF' : '#F8FAFC';
                                  return (
                                    <tr key={(r.trackingNumber || '') + idx} style={{ background: rowBg }}>
                                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F3F5', whiteSpace: 'nowrap', color: '#343A40' }}>{r.shipperRef || '—'}</td>
                                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F3F5', whiteSpace: 'nowrap', fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366' }}>{r.trackingNumber}</td>
                                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F3F5', whiteSpace: 'nowrap' }}>{r.mode || '—'}</td>
                                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F3F5', whiteSpace: 'nowrap' }}>{r.route || '—'}</td>
                                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F3F5', whiteSpace: 'nowrap' }}>{r.recipient || '—'}</td>
                                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F3F5', whiteSpace: 'nowrap' }}>{r.weight ? r.weight + ' kg' : '—'}</td>
                                      <td style={{ padding: '10px 12px', borderBottom: '1px solid #F1F3F5', whiteSpace: 'nowrap', textAlign: 'right', fontWeight: 700, color: '#343A40' }}>
                                        {Number(r.amount || 0).toFixed(2)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                              <tfoot>
                                <tr>
                                  <td colSpan={6} style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#003366', background: '#FFF5EB', borderTop: '2px solid #FF6B00', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Total Amount Due
                                  </td>
                                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#FF6B00', background: '#FFF5EB', borderTop: '2px solid #FF6B00', fontSize: '1rem', fontFamily: 'Consolas, monospace' }}>
                                    {invCurrency} {invTotal}
                                  </td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {costModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 9999, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ minHeight: '100%', width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px 120px', boxSizing: 'border-box' }}>
            <div style={{ background: 'white', maxWidth: '900px', width: '100%', borderRadius: '16px', padding: '30px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', boxSizing: 'border-box' }}>
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
                <button type="button" onClick={closeCostModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6C757D' }}>✕</button>
              </div>

              {costMsg && (
                <div style={{ background: costMsg.startsWith('✅') ? '#D4EDDA' : '#F8D7DA', color: costMsg.startsWith('✅') ? '#155724' : '#721C24', borderLeft: '4px solid ' + (costMsg.startsWith('✅') ? '#28A745' : '#DC3545'), borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', fontSize: '0.9rem' }}>
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
                        No extra services selected by customer.
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
        </div>
      )}

      {editInvModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.6)', zIndex: 9999, overflowY: 'auto', overflowX: 'hidden' }}>
          <div style={{ minHeight: '100%', width: '100%', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px 120px', boxSizing: 'border-box' }}>
            <div style={{ background: 'white', maxWidth: '520px', width: '100%', borderRadius: '16px', padding: '30px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', boxSizing: 'border-box' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                  <h2 style={{ color: '#003366', fontSize: '1.25rem', margin: 0 }}>✏️ Edit Invoice</h2>
                  <div style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '4px' }}>
                    {editInvModal.invoice.invoiceNumber} · {editInvModal.shipment.trackingNumber}
                  </div>
                  <div style={{ color: '#6C757D', fontSize: '0.75rem', marginTop: '2px', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                    {editInvModal.invoice.type === 'monthly-summary' ? '📅 Monthly Invoice' : '🧾 Individual Invoice'}
                  </div>
                </div>
                <button type="button" onClick={closeEditInvModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6C757D' }}>✕</button>
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
                <button type="button" onClick={closeEditInvModal} disabled={editInvSaving}
                  style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancel
                </button>
                <button type="button" onClick={handleSaveEditInv} disabled={editInvSaving}
                  style={{ padding: '12px 24px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: editInvSaving ? 'not-allowed' : 'pointer', opacity: editInvSaving ? 0.6 : 1, fontFamily: 'inherit' }}>
                  {editInvSaving ? 'Saving...' : '💾 Save Changes'}
                </button>
              </div>
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
    <button type="button" onClick={onClick} style={{
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

function MenuItem({ label, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'block',
        width: '100%',
        textAlign: 'left',
        padding: '12px 14px',
        background: 'transparent',
        border: 'none',
        borderBottom: '1px solid #F8F9FA',
        cursor: 'pointer',
        fontFamily: 'inherit',
        color: '#003366',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = '#F8F9FA'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ fontWeight: 700, fontSize: '0.88rem' }}>{label}</div>
      {sub && (
        <div style={{ fontSize: '0.72rem', color: '#6C757D', marginTop: '2px' }}>{sub}</div>
      )}
    </button>
  );
}
