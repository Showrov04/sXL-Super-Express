'use client';

import { useEffect, useState } from 'react';

export default function BillingPanel() {
  const [tab, setTab] = useState('all');
  const [filter, setFilter] = useState({ shipper: '', search: '' });
  const [shipperList, setShipperList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shipments, setShipments] = useState([]);
  const [counts, setCounts] = useState({ total: 0, due: 0, paid: 0 });
  const [outstanding, setOutstanding] = useState({ shippers: [], grandTotal: 0, totalShipments: 0 });
  const [error, setError] = useState('');

  const [costTn, setCostTn] = useState('');
  const [costActualWeight, setCostActualWeight] = useState('');
  const [costRate, setCostRate] = useState('');
  const [costCurrency, setCostCurrency] = useState('USD');
  const [costLines, setCostLines] = useState([{ label: '', amount: '' }]);
  const [costLocalCurrency, setCostLocalCurrency] = useState('');
  const [costLocalAmount, setCostLocalAmount] = useState('');
  const [costMsg, setCostMsg] = useState('');
  const [costLoading, setCostLoading] = useState(false);

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadData() {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('sxl_token');

    try {
      const params = new URLSearchParams({ filter: tab });
      if (filter.shipper) params.set('shipper', filter.shipper);
      if (filter.search) params.set('search', filter.search);

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
      (data.shipments || []).forEach((s) => {
        if (s.shipperName) names[s.shipperName] = true;
      });
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

  function applyFilters(e) {
    if (e) e.preventDefault();
    loadData();
  }

  function clearFilters() {
    setFilter({ shipper: '', search: '' });
    setTimeout(loadData, 50);
  }

  const calculatedTotal = (() => {
    const aw = parseFloat(costActualWeight) || 0;
    const rate = parseFloat(costRate) || 0;
    let addl = 0;
    costLines.forEach((l) => { addl += parseFloat(l.amount) || 0; });
    return (aw * rate + addl).toFixed(2);
  })();

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
          ratePerKg: parseFloat(costRate) || 0,
          additionalLines,
          currency: costCurrency,
          localCurrency: costLocalCurrency,
          localAmount: parseFloat(costLocalAmount) || 0,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        setCostMsg('❌ ' + (data.error || 'Save failed.'));
        setCostLoading(false);
        return;
      }
      setCostMsg('✅ Cost saved: ' + data.currency + ' ' + Number(data.total).toFixed(2));
      setCostLoading(false);
      setTimeout(loadData, 500);
    } catch (err) {
      setCostMsg('❌ Connection error.');
      setCostLoading(false);
    }
  }

  async function handleMarkPaid(trackingNumber) {
    const method = window.prompt('Payment method? (Cash / Bank Transfer)', 'Cash');
    if (!method) return;
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'markPaid', trackingNumber, paymentMethod: method }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); return; }
      window.alert('Marked as Paid ✅');
      loadData();
    } catch (err) {
      window.alert('Error: ' + err.message);
    }
  }

  async function handleMarkUnpaid(trackingNumber) {
    if (!window.confirm('Mark as Unpaid?')) return;
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/billing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'markUnpaid', trackingNumber }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); return; }
      window.alert('Marked as Unpaid');
      loadData();
    } catch (err) {
      window.alert('Error: ' + err.message);
    }
  }

  function statusClass(status) {
    const s = String(status || '').toLowerCase();
    if (s.includes('delivered')) return { bg: '#D4EDDA', color: '#155724' };
    if (s.includes('out for delivery')) return { bg: '#FFE5B4', color: '#8B4500' };
    if (s.includes('transit') || s.includes('picked')) return { bg: '#CCE5FF', color: '#004085' };
    return { bg: '#FFF3CD', color: '#856404' };
  }

  function updateCostLine(idx, field, value) {
    setCostLines((prev) => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l));
  }
  function addCostLine() { setCostLines((prev) => [...prev, { label: '', amount: '' }]); }
  function removeCostLine(idx) { setCostLines((prev) => prev.filter((_, i) => i !== idx)); }

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <StatCard num={counts.total} label="Total Shipments" color="#FF6B00" />
        <StatCard num={counts.due} label="Due Payment" color="#FFE5B4" />
        <StatCard num={counts.paid} label="Paid" color="#D4EDDA" />
      </div>

      {outstanding.shippers.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '20px', marginBottom: '20px', borderLeft: '5px solid #FF6B00' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <div>
              <div style={{ fontWeight: 800, color: '#003366', fontSize: '1.1rem' }}>💰 Outstanding Summary</div>
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
        <select value={filter.shipper} onChange={(e) => setFilter({ ...filter, shipper: e.target.value })} style={{ padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }}>
          <option value="">All Shippers</option>
          {shipperList.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>

        <label style={{ fontWeight: 700, fontSize: '0.85rem', color: '#6C757D' }}>Search:</label>
        <input type="text" value={filter.search} onChange={(e) => setFilter({ ...filter, search: e.target.value })}
          placeholder="Tracking #, sender, recipient..."
          style={{ padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', flex: 1, minWidth: '200px', fontFamily: 'inherit' }} />

        <button type="submit" style={{ padding: '10px 16px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Apply</button>
        <button type="button" onClick={clearFilters} style={{ padding: '10px 16px', background: '#E9ECEF', color: '#003366', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>Clear</button>
      </form>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <TabButton active={tab === 'all'} onClick={() => setTab('all')} label="📋 All Shipments" count={counts.total} />
        <TabButton active={tab === 'due'} onClick={() => setTab('due')} label="💳 Due Payment" count={counts.due} />
        <TabButton active={tab === 'paid'} onClick={() => setTab('paid')} label="✅ Paid" count={counts.paid} />
      </div>

      {tab === 'due' && (
        <form onSubmit={handleSaveCost} style={{ background: 'white', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', marginBottom: '20px', borderLeft: '5px solid #FF6B00' }}>
          <h3 style={{ color: '#003366', fontSize: '1.1rem', marginBottom: '12px' }}>💰 Add / Update Shipment Cost</h3>
          <p style={{ fontSize: '0.85rem', color: '#6C757D', marginBottom: '12px' }}>
            Click "📋 Use" next to a shipment below to auto-fill its tracking number.
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
            <div>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>Rate per kg</label>
              <input type="number" step="0.01" value={costRate} onChange={(e) => setCostRate(e.target.value)} placeholder="e.g., 12.50"
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

          <div style={{ marginTop: '15px', borderTop: '1px solid #E9ECEF', paddingTop: '15px' }}>
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

          <div style={{ marginTop: '15px', borderTop: '1px solid #E9ECEF', paddingTop: '15px' }}>
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
          </div>
          {costMsg && (
            <div style={{ marginTop: '10px', padding: '10px 15px', borderRadius: '8px', fontSize: '0.9rem', background: costMsg.startsWith('✅') ? '#D4EDDA' : '#F8D7DA', color: costMsg.startsWith('✅') ? '#155724' : '#721C24' }}>
              {costMsg}
            </div>
          )}
        </form>
      )}

      {error && <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '10px', padding: '15px 20px', marginBottom: '20px' }}>❌ {error}</div>}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '45px', height: '45px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 15px' }} />
          <p style={{ color: '#6C757D' }}>Loading billing data...</p>
        </div>
      )}

      {!loading && !error && (
        <>
          {shipments.length === 0 ? (
            <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>
              No shipments in this view.
            </div>
          ) : (
            <div style={{ background: 'white', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem', minWidth: '1000px' }}>
                <thead>
                  <tr style={{ background: '#F8F9FA' }}>
                    {['Tracking #', 'Shipper', 'Route', 'Status', 'Weight', 'Cost', 'Payment', 'Actions'].map((h) => (
                      <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontWeight: 700, color: '#343A40', fontSize: '0.78rem', textTransform: 'uppercase', borderBottom: '2px solid #E9ECEF' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {shipments.map((s, i) => {
                    const sc = statusClass(s.status);
                    const costDisplay = s.shippingCost ? `${Number(s.shippingCost).toFixed(2)} ${s.currency}` : '—';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #F1F3F5' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366' }}>{s.trackingNumber}</td>
                        <td style={{ padding: '12px 16px' }}>{s.shipperName || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{s.origin || '—'} → {s.destination || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: sc.bg, color: sc.color, padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>{s.status}</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>{s.weight || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{costDisplay}</td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ background: s.paymentStatus === 'Paid' ? '#D4EDDA' : '#FFF3CD', color: s.paymentStatus === 'Paid' ? '#155724' : '#856404', padding: '4px 12px', borderRadius: '20px', fontWeight: 700, fontSize: '0.72rem' }}>{s.paymentStatus}</span>
                        </td>
                        <td style={{ padding: '12px 16px', whiteSpace: 'nowrap' }}>
                          {tab === 'due' && (
                            <>
                              <button onClick={() => setCostTn(s.trackingNumber)} style={{ padding: '5px 10px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit', marginRight: '4px' }}>📋 Use</button>
                              <button onClick={() => handleMarkPaid(s.trackingNumber)} style={{ padding: '5px 10px', background: '#28A745', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}>💵 Mark Paid</button>
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
        </>
      )}

      <InvoiceSection tab={tab} onRefresh={loadData} />
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
    <button onClick={onClick} style={{ cursor: 'pointer', padding: '12px 22px', borderRadius: '10px', fontWeight: 700, fontSize: '0.9rem', border: '2px solid ' + (active ? '#FF6B00' : '#E9ECEF'), background: active ? '#FFF5EB' : 'white', color: active ? '#FF6B00' : '#343A40', fontFamily: 'inherit' }}>
      {label}{' '}
      <span style={{ background: active ? '#FF6B00' : '#E9ECEF', color: active ? 'white' : '#333', padding: '2px 8px', borderRadius: '10px', marginLeft: '6px', fontSize: '0.8rem' }}>{count}</span>
    </button>
  );
}

/* ============================================================
 *  INVOICE SECTION
 * ============================================================ */
function InvoiceSection({ tab, onRefresh }) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [invoiceMode, setInvoiceMode] = useState('individual');
  const [indTn, setIndTn] = useState('');
  const [shipperList, setShipperList] = useState([]);
  const [monthOptions, setMonthOptions] = useState({});
  const [selShipper, setSelShipper] = useState('');
  const [selMonth, setSelMonth] = useState('');
  const [localCurrency, setLocalCurrency] = useState('');
  const [localAmount, setLocalAmount] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { loadInvoices(); }, []);

  async function loadInvoices() {
    setLoading(true);
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/invoices', { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      if (data.success) setInvoices(data.invoices || []);
    } catch (e) { /* silent */ }
    setLoading(false);
  }

  async function openMonthlyModal() {
    setMsg('');
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/billing?filter=due', { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      if (!data.success) { setMsg('Failed to load shippers.'); return; }

      const byShipper = {};
      (data.shipments || []).forEach((s) => {
        if (!s.shipperName) return;
        if (!byShipper[s.shipperName]) byShipper[s.shipperName] = { count: 0, months: {} };
        byShipper[s.shipperName].count++;
        const d = new Date(s.bookedAt);
        if (!isNaN(d.getTime())) {
          const m = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
          byShipper[s.shipperName].months[m] = (byShipper[s.shipperName].months[m] || 0) + 1;
        }
      });
      setShipperList(Object.keys(byShipper).sort());
      setMonthOptions(byShipper);
      setInvoiceMode('monthly');
      setShowModal(true);
    } catch (err) { setMsg('Connection error.'); }
  }

  async function submitIndividual() {
    if (!indTn.trim()) { setMsg('Enter a tracking number.'); return; }
    setBusy(true); setMsg('');
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'createIndividual', trackingNumber: indTn.trim() }),
      });
      const data = await res.json();
      if (!data.success) { setMsg('❌ ' + data.error); setBusy(false); return; }
      setMsg('✅ Invoice ' + data.invoiceNumber + ' created!');
      setIndTn(''); setBusy(false); setShowModal(false);
      loadInvoices(); if (onRefresh) onRefresh();
    } catch (err) { setMsg('❌ Connection error.'); setBusy(false); }
  }

  async function submitMonthly() {
    if (!selShipper) { setMsg('Select a shipper.'); return; }
    if (!selMonth) { setMsg('Select a month.'); return; }
    setBusy(true); setMsg('');
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'createMonthly', shipperName: selShipper, month: selMonth, localCurrency, localAmount }),
      });
      const data = await res.json();
      if (!data.success) { setMsg('❌ ' + data.error); setBusy(false); return; }
      setMsg('✅ Invoice ' + data.invoiceNumber + ' created (' + data.shipmentCount + ' shipments, $' + data.total + ')');
      setSelShipper(''); setSelMonth(''); setLocalCurrency(''); setLocalAmount('');
      setBusy(false); setShowModal(false);
      loadInvoices(); if (onRefresh) onRefresh();
    } catch (err) { setMsg('❌ Connection error.'); setBusy(false); }
  }

  function formatDate(d) {
    if (!d) return '—';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return String(d); }
  }

  return (
    <div style={{ marginTop: '35px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '15px' }}>
        <h2 style={{ color: '#003366', fontSize: '1.3rem', margin: 0 }}>📄 Invoices</h2>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button onClick={() => { setInvoiceMode('individual'); setShowModal(true); setMsg(''); }} style={{ padding: '10px 18px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>📄 Individual Invoice</button>
          <button onClick={openMonthlyModal} style={{ padding: '10px 18px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>📅 Monthly Summary</button>
          <button onClick={loadInvoices} style={{ padding: '10px 18px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>🔄 Refresh</button>
        </div>
      </div>

      {msg && (
        <div style={{ marginBottom: '15px', padding: '12px 18px', borderRadius: '8px', fontSize: '0.9rem', background: msg.startsWith('✅') ? '#D4EDDA' : '#F8D7DA', color: msg.startsWith('✅') ? '#155724' : '#721C24' }}>{msg}</div>
      )}

      {loading ? (
        <
