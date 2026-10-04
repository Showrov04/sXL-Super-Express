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

/* ============================================================
 *  MAIN COMPONENT
 * ============================================================ */
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

  // Cost form
  const [costTn, setCostTn] = useState('');
  const [costActualWeight, setCostActualWeight] = useState('');
  const [costActualCbm, setCostActualCbm] = useState('');
  const [costRate, setCostRate] = useState('');
  const [costCurrency, setCostCurrency] = useState('USD');
  const [costLines, setCostLines] = useState([{ label: '', amount: '' }]);
  const [costLocalCurrency, setCostLocalCurrency] = useState('');
  const [costLocalAmount, setCostLocalAmount] = useState('');
  const [costMsg, setCostMsg] = useState('');
  const [costLoading, setCostLoading] = useState(false);
  const [pickupCharge, setPickupCharge] = useState('');
  const [customsCharge, setCustomsCharge] = useState('');
  const [deliveryCharge, setDeliveryCharge] = useState('');
  const [selectedShipment, setSelectedShipment] = useState(null);
  const [costSaved, setCostSaved] = useState(false);
  const costFormRef = useRef(null);

  // Invoice section
  const [invTab, setInvTab] = useState('individual');
  const [invoices, setInvoices] = useState([]);
  const [invLoading, setInvLoading] = useState(true);
  const [invColFilters, setInvColFilters] = useState({
    shipperRef: [], tracking: [], invoiceNumber: [], type: [], shipper: [], status: [], issued: [],
  });
  const [openInvFilter, setOpenInvFilter] = useState(null);
  const [invFilterSearch, setInvFilterSearch] = useState('');
  const invFilterRef = useRef(null);

  useEffect(() => {
    loadShipments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  useEffect(() => {
    if (tab === 'due') loadInvoices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, invTab]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (invFilterRef.current && !invFilterRef.current.contains(e.target)) {
        setOpenInvFilter(null);
        setInvFilterSearch('');
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

  async function loadInvoices() {
    setInvLoading(true);
    const token = localStorage.getItem('sxl_token');
    if (!token) { setInvLoading(false); return; }

    try {
      const params = new URLSearchParams({ type: invTab });
      const res = await fetch('/api/admin/invoices?' + params.toString(), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();
      if (data.success) setInvoices(data.invoices || []);
    } catch (e) { /* silent */ }
    setInvLoading(false);
  }

  function applyFilters(e) {
    if (e) e.preventDefault();
    loadShipments();
  }

  function clearFilters() {
    setShipperFilter('');
    setTimeout(loadShipments, 50);
  }

  // ===== Determine freight base based on mode =====
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

    // SEA → CBM × rate ; AIR → weight × rate
    const freightBase = selectedIsSea ? cbm : aw;
    return (freightBase * rate + pc + cc + dc + addl).toFixed(2);
  })();

  function handleUse(s) {
    setCostTn(s.trackingNumber);
    setCostActualWeight(s.actualWeight ? String(s.actualWeight) : '');
    setCostActualCbm(s.actualCbm ? String(s.actualCbm) : '');
    setCostRate(s.ratePerKg ? String(s.ratePerKg) : '');
    setCostCurrency(s.currency || 'USD');
    setPickupCharge(s.pickupCharge ? String(s.pickupCharge) : '');
    setCustomsCharge(s.customsCharge ? String(s.customsCharge) : '');
    setDeliveryCharge(s.deliveryCharge ? String(s.deliveryCharge) : '');

    let addl = [];
    try {
      const bd = s.costBreakdown;
      if (bd) {
        const parsed = typeof bd === 'string' ? JSON.parse(bd) : bd;
        if (Array.isArray(parsed.additionalLines) && parsed.additionalLines.length > 0) {
          addl = parsed.additionalLines.map((l) => ({ label: l.label || '', amount: String(l.amount || '') }));
        }
        setCostLocalCurrency(parsed.localCurrency || '');
        setCostLocalAmount(parsed.localAmount ? String(parsed.localAmount) : '');
      }
    } catch (e) { /* silent */ }
    if (addl.length === 0) addl = [{ label: '', amount: '' }];
    setCostLines(addl);

    setSelectedShipment(s);
    setCostSaved(!!s.costSavedAt);
    setCostMsg('');

    setTimeout(() => {
      const el = document.getElementById('cost-form-anchor');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  function updateCostLine(idx, field, value) {
    setCostLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }
  function addCostLine() { setCostLines((prev) => [...prev, { label: '', amount: '' }]); }
  function removeCostLine(idx) { setCostLines((prev) => prev.filter((_, i) => i !== idx)); }

  async function handleSaveCost(e) {
    e.preventDefault();
    setCostMsg('');
    if (!costTn.trim()) { setCostMsg('Please enter a tracking number.'); return; }

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
          localAmount: parseFloat(costLocalAmount) || 0,
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
      setTimeout(loadShipments, 500);
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

  async function handleIssueInvoice(trackingNumber) {
    if (!window.confirm('Issue individual invoice for ' + trackingNumber + '?')) return;
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'createIndividual', trackingNumber }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); return; }
      setToast('🧾 Invoice ' + data.invoiceNumber + ' issued');
      loadShipments();
      loadInvoices();
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

  async function handleInvoiceStatus(invoiceId, status) {
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'updateStatus', invoiceId, status }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); return; }
      setToast('✅ Invoice updated');
      loadInvoices();
    } catch (err) {
      window.alert('Error: ' + err.message);
    }
  }

  // ===== Invoice filter helpers =====
  function getInvoiceColumnValue(inv, col) {
    if (col === 'shipperRef') return inv.shipperRef || '';
    if (col === 'tracking') return inv.trackingNumbers || '';
    if (col === 'invoiceNumber') return inv.invoiceNumber || '';
    if (col === 'type') return inv.type === 'monthly-summary' ? 'Monthly' : 'Individual';
    if (col === 'shipper') return inv.shipperName || '';
    if (col === 'status') return inv.status || '';
    if (col === 'issued') {
      const d = new Date(inv.issueDate || 0);
      if (isNaN(d.getTime())) return '';
      return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    }
    return '';
  }

  function getInvoiceUniqueValues(col) {
    const set = new Set();
    invoices.forEach((inv) => {
      const v = getInvoiceColumnValue(inv, col);
      if (v) set.add(v);
    });
    return Array.from(set).sort();
  }

  function toggleInvoiceFilter(col, value) {
    setInvColFilters((prev) => {
      const current = prev[col] || [];
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value];
      return { ...prev, [col]: next };
    });
  }

  function clearInvoiceColumn(col) {
    setInvColFilters((prev) => ({ ...prev, [col]: [] }));
  }

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    Object.entries(invColFilters).forEach(([col, values]) => {
      if (values.length > 0) {
        list = list.filter((inv) => values.includes(getInvoiceColumnValue(inv, col)));
      }
    });
    return list;
  }, [invoices, invColFilters]);

  function InvoiceHeaderCell({ col, label }) {
    const isFilterable = ['shipperRef', 'tracking', 'invoiceNumber', 'type', 'shipper', 'status', 'issued'].includes(col);
    const activeCount = (invColFilters[col] || []).length;
    const isOpen = openInvFilter === col;

    return (
      <th style={{ ...TH_STYLE, background: isOpen ? '#DDE3E9' : '#E9ECEF' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 12px' }}>
          <span>
            {label}
            {activeCount > 0 && <span style={{ marginLeft: '6px', color: '#FF6B00' }}>({activeCount})</span>}
          </span>
          {isFilterable && (
            <button
              onClick={(e) => { e.stopPropagation(); setOpenInvFilter(isOpen ? null : col); setInvFilterSearch(''); }}
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
            ref={invFilterRef}
            style={{
              position: 'absolute', top: '100%', right: 0,
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
              value={invFilterSearch}
              onChange={(e) => setInvFilterSearch(e.target.value)}
              style={{
                width: '100%', padding: '6px 10px',
                border: '1px solid #E9ECEF', borderRadius: '6px',
                fontSize: '0.8rem', fontFamily: 'inherit',
                outline: 'none', boxSizing: 'border-box',
                marginBottom: '8px',
              }}
            />
            <div style={{ maxHeight: '220px', overflowY: 'auto', marginBottom: '8px' }}>
              {getInvoiceUniqueValues(col)
                .filter((v) => !invFilterSearch || v.toLowerCase().includes(invFilterSearch.toLowerCase()))
                .map((v) => {
                  const checked = (invColFilters[col] || []).includes(v);
                  return (
                    <label key={v} style={{
                      display: 'flex', alignItems: 'center', gap: '8px',
                      padding: '6px 8px', cursor: 'pointer', borderRadius: '4px',
                      background: checked ? '#FFF5EB' : 'transparent',
                    }}>
                      <input type="checkbox" checked={checked} onChange={() => toggleInvoiceFilter(col, v)} style={{ width: '14px', height: '14px', accentColor: '#FF6B00', cursor: 'pointer' }} />
                      <span style={{ fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v}</span>
                    </label>
                  );
                })}
            </div>
            <div style={{ display: 'flex', gap: '6px', borderTop: '1px solid #F1F3F5', paddingTop: '8px' }}>
              <button onClick={() => clearInvoiceColumn(col)} style={{ flex: 1, padding: '6px 10px', background: '#F8F9FA', color: '#343A40', border: '1px solid #E9ECEF', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
              <button onClick={() => { setOpenInvFilter(null); setInvFilterSearch(''); }} style={{ flex: 1, padding: '6px 10px', background: '#003366', color: 'white', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Done</button>
            </div>
          </div>
        )}
      </th>
    );
  }

  // Helper to render the actual weight/cbm cell
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

    // AIR
    const weight = s.actualWeight;
    const hasWeight = weight !== null && weight !== undefined && parseFloat(weight) > 0;
    if (!hasWeight) {
      return <span style={{ color: '#ADB5BD', fontStyle: 'italic' }}>TBA</span>;
    }
    return <span style={{ color: '#0D6EFD', fontWeight: 700 }}>{parseFloat(weight).toFixed(2)} kg</span>;
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

      {/* ============ SHIPMENTS SECTION ============ */}
      <h2 style={{ color: '#003366', fontSize: '1.5rem', fontWeight: 800, marginBottom: '20px' }}>📦 Shipments</h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <StatCard num={counts.total} label="Total Shipments" color="#FF6B00" />
        <StatCard num={counts.due} label="Due Payment" color="#FFE5B4" />
        <StatCard num={counts.paid} label="Paid" color="#D4EDDA" />
      </div>

      {outstanding.shippers.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '20px', marginBottom: '20px', borderLeft: '5px solid #FF6B00' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#003366', fontSize: '1.1rem' }}>💵 Accounts Receivable</div>
              <div style={{ color: '#6C757D', fontSize: '0.85rem' }}>
                {outstanding.totalShipments} shipment(s) pending payment across {outstanding.shippers.length} shipper(s)
              </div>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#FF6B00' }}>
              USD {Number(outstanding.grandTotal).toFixed(2)}
            </div>
          </div>
          <div style={{ marginTop: '15px' }}>
            {outstanding.shippers.map((sh, i) => (
              <div key={i} style={{ padding: '10px 14px', background: '#F8F9FA', borderRadius: '8px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                <div><b>{sh.shipperName}</b> <span style={{ color: '#6C757D', fontSize: '0.85rem' }}>({sh.count} shipments)</span></div>
                <div style={{ fontWeight: 800, color: '#FF6B00' }}>USD {Number(sh.total).toFixed(2)}</div>
              </div>
            ))}
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
        <button type="button" onClick={clearFilters} style={{ padding: '10px 16px', background: '#E9ECEF', color: '#003366', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
      </form>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <TabButton active={tab === 'all'} onClick={() => setTab('all')} label="📋 All Shipments" count={counts.total} />
        <TabButton active={tab === 'due'} onClick={() => setTab('due')} label="💳 Due Payment" count={counts.due} />
        <TabButton active={tab === 'paid'} onClick={() => setTab('paid')} label="✅ Paid" count={counts.paid} />
      </div>

      {tab === 'due' && (
        <div id="cost-form-anchor" ref={costFormRef}>
          <form onSubmit={handleSaveCost} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '20px', borderLeft: '5px solid #FF6B00' }}>
            <h3 style={{ color: '#003366', fontSize: '1.1rem', marginBottom: '12px' }}>
              💰 {costSaved ? 'Update' : 'Add'} Shipment Cost
              {selectedShipment && <span style={{ fontSize: '0.8rem', color: '#6C757D', fontWeight: 500, marginLeft: '10px' }}>for {selectedShipment.trackingNumber} · {selectedShipment.shipperName}</span>}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#6C757D', marginBottom: '12px' }}>
              Click "📋 Use" next to a shipment below to auto-fill its details.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Tracking Number *</label>
                <input type="text" value={costTn} onChange={(e) => setCostTn(e.target.value)} placeholder="e.g., TSH2510202601"
                  style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Actual Weight (kg)</label>
                <input type="number" step="0.01" value={costActualWeight} onChange={(e) => setCostActualWeight(e.target.value)} placeholder="e.g., 5.5"
                  style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
              </div>

              {/* CBM field — only for SEA */}
              {selectedIsSea && (
                <div>
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Actual Volume (CBM)</label>
                  <input type="number" step="0.01" value={costActualCbm} onChange={(e) => setCostActualCbm(e.target.value)} placeholder="e.g., 1.2"
                    style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
                </div>
              )}

              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Freight Rate {selectedIsSea ? '(per CBM)' : '(per kg)'}
                </label>
                <input type="number" step="0.01" value={costRate} onChange={(e) => setCostRate(e.target.value)} placeholder={selectedIsSea ? 'e.g., 120.00' : 'e.g., 12.50'}
                  style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Currency</label>
                <select value={costCurrency} onChange={(e) => setCostCurrency(e.target.value)}
                  style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }}>
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
                        style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
                    </div>
                  )}

                  {selectedShipment.customService === 'sxl' && (
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                        🛃 Customs Clearance Charge — <span style={{ color: '#155724' }}>Handled by sXL</span>
                      </label>
                      <input type="number" step="0.01" value={customsCharge} onChange={(e) => setCustomsCharge(e.target.value)} placeholder="Amount"
                        style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
                    </div>
                  )}

                  {selectedShipment.deliveryService === 'sxl' && (
                    <div>
                      <label style={{ fontSize: '0.8rem', fontWeight: 600, display: 'block', marginBottom: '4px' }}>
                        📦 Delivery Charge — <span style={{ color: '#155724' }}>Handled by sXL</span>
                      </label>
                      <input type="number" step="0.01" value={deliveryCharge} onChange={(e) => setDeliveryCharge(e.target.value)} placeholder="Amount"
                        style={{ width: '100%', padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
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
                <input type="text" value={costLocalCurrency} onChange={(e) => setCostLocalCurrency(e.target.value)} placeholder="e.g., HKD"
                  style={{ padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
                <input type="number" step="0.01" value={costLocalAmount} onChange={(e) => setCostLocalAmount(e.target.value)} placeholder="e.g., 1000.00"
                  style={{ padding: '10px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }} />
              </div>
            </div>

            <div style={{ background: '#FFF5EB', padding: '18px', borderRadius: '10px', borderLeft: '4px solid #FF6B00', marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 700, color: '#003366' }}>TOTAL COST:</span>
              <span style={{ fontSize: '1.6rem', fontWeight: 800, color: '#FF6B00' }}>{costCurrency} {calculatedTotal}</span>
            </div>

            <div style={{ marginTop: '15px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button type="submit" disabled={costLoading} style={{ padding: '12px 24px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: costLoading ? 'not-allowed' : 'pointer', opacity: costLoading ? 0.6 : 1, fontFamily: 'inherit' }}>
                {costLoading ? 'Saving...' : '💾 Save Cost'}
              </button>
              {costSaved && (
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 16px', background: '#E8F7EF', color: '#155724', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem' }}>
                  ✅ Cost already saved — editing will overwrite
                </span>
              )}
            </div>
            {costMsg && (
              <div style={{ marginTop: '10px', padding: '10px 15px', borderRadius: '8px', fontSize: '0.9rem', background: costMsg.startsWith('✅') ? '#D4EDDA' : '#F8D7DA', color: costMsg.startsWith('✅') ? '#155724' : '#721C24' }}>
                {costMsg}
              </div>
            )}
          </form>
        </div>
      )}

      {error && <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '10px', padding: '15px 20px', marginBottom: '20px' }}>❌ {error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '45px', height: '45px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 15px' }} />
          <p style={{ color: '#6C757D' }}>Loading billing data...</p>
        </div>
      )}

      {!loading && !error && shipments.length === 0 && (
        <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>
          No shipments in this view.
        </div>
      )}

      {!loading && !error && shipments.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E9ECEF', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'auto', maxHeight: '70vh', position: 'relative' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem', minWidth: '1500px' }}>
            <thead>
              <tr>
                {['Tracking #', 'Mode', 'Route', 'Shipper', 'Recipient', 'Status', 'Booking Wt', 'Actual Wt', 'Freight', 'Payment', 'Booked', 'ETA', 'Actions'].map((h) => (
                  <th key={h} style={{ ...TH_STYLE, padding: '14px 12px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {shipments.map((s, i) => {
                const sc = statusClass(s.status);
                const rowBg = i % 2 === 0 ? '#FFFFFF' : '#FAFBFC';
                const hasCost = s.shippingCost && parseFloat(s.shippingCost) > 0;
                const invState = !s.latestInvoice ? 'none'
                  : s.invoiceSentAt ? 'sent'
                  : s.hasMonthlyInvoice ? 'monthly'
                  : 'individual';

                return (
                  <tr key={i} style={{ background: rowBg }}>
                    <td style={{ ...TD_STYLE, fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366' }}>{s.trackingNumber}</td>
                    <td style={TD_STYLE}>{s.seaLoadType ? ('SEA - ' + s.seaLoadType) : (s.shipMode || '—')}</td>
                    <td style={TD_STYLE}>{s.origin || '—'} → {s.destination || '—'}</td>
                    <td style={TD_STYLE}>{s.shipperName || '—'}</td>
                    <td style={TD_STYLE}>{s.recipientName || '—'}</td>
                    <td style={TD_STYLE}>
                      <span style={{ background: sc.bg, color: sc.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.7rem', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{s.status}</span>
                    </td>
                    <td style={TD_STYLE}>{s.bookingWeight ? s.bookingWeight + ' kg' : '—'}</td>
                    <td style={TD_STYLE}>{renderActualCell(s)}</td>
                    <td style={TD_STYLE}>
                      {hasCost
                        ? <span style={{ fontWeight: 700, color: '#003366' }}>{Number(s.shippingCost).toFixed(2)} {s.currency}</span>
                        : <span style={{ color: '#ADB5BD', fontStyle: 'italic', fontWeight: 700 }}>TBA</span>}
                    </td>
                    <td style={TD_STYLE}>
                      <span style={{ background: s.paymentStatus === 'Paid' ? '#D4EDDA' : '#FFF3CD', color: s.paymentStatus === 'Paid' ? '#155724' : '#856404', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.7rem' }}>{s.paymentStatus}</span>
                    </td>
                    <td style={TD_STYLE}>{formatDate(s.bookedAt)}</td>
                    <td style={TD_STYLE}>
                      <span style={{ color: '#FF6B00', fontWeight: 800 }}>
                        {s.estimatedDelivery ? formatDate(s.estimatedDelivery) : 'Pending'}
                      </span>
                    </td>
                    <td style={{ ...TD_STYLE, whiteSpace: 'nowrap' }}>
                      {tab === 'all' && <span style={{ color: '#ADB5BD' }}>—</span>}

                      {tab === 'due' && (
                        <>
                          <button onClick={() => handleUse(s)} style={{ padding: '5px 10px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', marginRight: '4px' }}>📋 Use</button>
                          <button onClick={() => handleMarkPaid(s.trackingNumber)} style={{ padding: '5px 10px', background: '#28A745', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', marginRight: '4px' }}>💵 Mark Paid</button>

                          {invState === 'none' && (
                            <button onClick={() => handleIssueInvoice(s.trackingNumber)} style={{ padding: '5px 10px', background: '#0D6EFD', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', marginRight: '4px' }}>📄 Issue Invoice</button>
                          )}
                          {invState === 'individual' && (
                            <>
                              <span style={{ padding: '5px 10px', background: '#E9ECEF', color: '#495057', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, marginRight: '4px', whiteSpace: 'nowrap' }}>🧾 Invoice Issued</span>
                              <button onClick={() => handleSendInvoice(s.trackingNumber)} style={{ padding: '5px 10px', background: '#DC3545', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>📤 Send to Customer</button>
                            </>
                          )}
                          {invState === 'monthly' && (
                            <>
                              <span style={{ padding: '5px 10px', background: '#E9ECEF', color: '#495057', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, marginRight: '4px', whiteSpace: 'nowrap' }}>🧾 Monthly Issued</span>
                              <button onClick={() => handleSendInvoice(s.trackingNumber)} style={{ padding: '5px 10px', background: '#DC3545', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>📤 Send to Customer</button>
                            </>
                          )}
                          {invState === 'sent' && (
                            <span style={{ padding: '5px 10px', background: '#D4EDDA', color: '#155724', borderRadius: '6px', fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>✅ Sent to Customer</span>
                          )}
                        </>
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
          <h2 style={{ color: '#003366', fontSize: '1.5rem', fontWeight: 800, marginTop: '50px', marginBottom: '20px' }}>🧾 Invoices</h2>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
            <TabButton active={invTab === 'individual'} onClick={() => setInvTab('individual')} label="📄 Individual Invoices" count={invTab === 'individual' ? invoices.length : 0} />
            <TabButton active={invTab === 'monthly'} onClick={() => setInvTab('monthly')} label="📅 Monthly Summary" count={invTab === 'monthly' ? invoices.length : 0} />
            <button onClick={loadInvoices} style={{ padding: '12px 22px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Refresh</button>
          </div>

          {invLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <div style={{ width: '40px', height: '40px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>
              {invoices.length === 0
                ? (invTab === 'individual' ? 'No individual invoices yet. Click "📄 Issue Invoice" on a Due Payment row above.' : 'No monthly summary invoices yet.')
                : 'No invoices match your filters.'}
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E9ECEF', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'auto', maxHeight: '70vh', position: 'relative' }}>
              <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem', minWidth: '1400px' }}>
                <thead>
                  <tr>
                    <InvoiceHeaderCell col="shipperRef" label="Shipper Ref" />
                    <InvoiceHeaderCell col="tracking" label="Tracking #" />
                    <InvoiceHeaderCell col="issued" label="Inv Date" />
                    <InvoiceHeaderCell col="invoiceNumber" label="Inv #" />
                    <InvoiceHeaderCell col="type" label="Type" />
                    <InvoiceHeaderCell col="shipper" label="Shipper" />
                    <th style={{ ...TH_STYLE, padding: '14px 12px' }}>Recipient</th>
                    <th style={{ ...TH_STYLE, padding: '14px 12px' }}>Amount</th>
                    <InvoiceHeaderCell col="status" label="Status" />
                    <th style={{ ...TH_STYLE, padding: '14px 12px' }}>Issued</th>
                    <th style={{ ...TH_STYLE, padding: '14px 12px' }}>Due</th>
                    <th style={{ ...TH_STYLE, padding: '14px 12px' }}>PDF</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv, i) => {
                    const rowBg = i % 2 === 0 ? '#FFFFFF' : '#FAFBFC';
                    return (
                      <tr key={inv.invoiceID || i} style={{ background: rowBg }}>
                        <td style={TD_STYLE}>{inv.shipperRef || '—'}</td>
                        <td style={{ ...TD_STYLE, fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366' }}>
                          {inv.trackingList && inv.trackingList.length > 1
                            ? inv.trackingList[0] + ' +' + (inv.trackingList.length - 1) + ' more'
                            : (inv.trackingNumbers || '—')}
                        </td>
                        <td style={TD_STYLE}>{formatDate(inv.issueDate)}</td>
                        <td style={{ ...TD_STYLE, fontWeight: 700 }}>{inv.invoiceNumber}</td>
                        <td style={TD_STYLE}>
                          <span style={{ background: inv.type === 'monthly-summary' ? '#CCE5FF' : '#FFF5EB', color: inv.type === 'monthly-summary' ? '#004085' : '#8B4500', padding: '3px 10px', borderRadius: '12px', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase' }}>
                            {inv.type === 'monthly-summary' ? 'Monthly' : 'Individual'}
                          </span>
                        </td>
                        <td style={TD_STYLE}>{inv.shipperName || '—'}</td>
                        <td style={TD_STYLE}>{inv.recipientName || '—'}</td>
                        <td style={{ ...TD_STYLE, fontWeight: 700 }}>{inv.currency} {Number(inv.amount).toFixed(2)}</td>
                        <td style={TD_STYLE}>
                          <select
                            value={inv.status}
                            onChange={(e) => handleInvoiceStatus(inv.invoiceID, e.target.value)}
                            style={{ padding: '4px 8px', borderRadius: '6px', border: '2px solid ' + (String(inv.status).toLowerCase() === 'paid' ? '#28A745' : '#FFE5B4'), background: String(inv.status).toLowerCase() === 'paid' ? '#D4EDDA' : '#FFF3CD', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            <option value="Issued">Issued</option>
                            <option value="Paid">Paid</option>
                            <option value="Cancelled">Cancelled</option>
                          </select>
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
