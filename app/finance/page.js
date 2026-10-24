'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
});

const EXPENSE_CATEGORIES = ['Partner Freight', 'Local Pickup', 'Labor', 'Customs / Duty', 'Other'];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function FinanceDashboard() {
  const [shipments, setShipments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [form, setForm] = useState({
    shipment_id: '',
    category: EXPENSE_CATEGORIES[0],
    description: '',
    amount: '',
    expense_date: today(),
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // 1. Get the correct token name from your login page
      const token = localStorage.getItem('sxl_token');
      
      if (!token) {
        setError('You must be logged in as the Owner to view this page.');
        setLoading(false);
        return;
      }

      const res = await fetch('/api/finance', {
        cache: 'no-store',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const json = await res.json();
      
      if (res.status === 403) {
        setError("Access Denied. You are logged in, but your account role is not 'owner'.");
        setLoading(false);
        return;
      }

      if (!json.success) throw new Error(json.error || 'Failed to load');

      const mappedShipments = (json.shipments || []).map(s => ({
        id: s.id,
        tracking_number: s.tracking_number,
        customer: s.sender_name || '—',
        status: s.status,
        date: s.booked_at,
        revenue: num(s.shipping_cost),
      }));

      setShipments(mappedShipments);
      setExpenses(json.expenses || []);
    } catch (err) {
      setError(err.message || 'Failed to load finance data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const shipmentProfits = useMemo(() => {
    return shipments.map(ship => {
      const shipExpenses = expenses.filter(e => e.shipment_id === ship.id);
      const totalExpense = shipExpenses.reduce((sum, e) => sum + num(e.amount), 0);
      const profit = ship.revenue - totalExpense;
      
      return {
        ...ship,
        expenses: totalExpense,
        profit,
        margin: ship.revenue > 0 ? (profit / ship.revenue) * 100 : 0
      };
    });
  }, [shipments, expenses]);

  const totals = useMemo(() => {
    const revenue = shipments.reduce((sum, s) => sum + s.revenue, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + num(e.amount), 0);
    const profit = revenue - totalExpenses;

    return {
      revenue,
      expenses: totalExpenses,
      profit,
      margin: revenue > 0 ? (profit / revenue) * 100 : 0,
    };
  }, [shipments, expenses]);

  async function handleAddExpense(e) {
    e.preventDefault();
    if (!form.amount || num(form.amount) <= 0) {
      setError('Enter an amount greater than zero.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('sxl_token');
      const res = await fetch('/api/finance', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          shipment_id: form.shipment_id || null,
          category: form.category,
          description: form.description,
          amount: num(form.amount),
          expense_date: form.expense_date,
        }),
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || `Save failed`);

      setForm({
        shipment_id: '',
        category: EXPENSE_CATEGORIES[0],
        description: '',
        amount: '',
        expense_date: today(),
      });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteExpense(id) {
    if (!confirm('Delete this expense?')) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem('sxl_token');
      const res = await fetch(`/api/finance?id=${encodeURIComponent(id)}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Delete failed');
      
      setExpenses((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setDeletingId(null);
    }
  }

  const s = {
    container: { maxWidth: '1200px', margin: '0 auto', padding: '40px 20px', fontFamily: 'system-ui, -apple-system, sans-serif' },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px', borderBottom: '2px solid #E9ECEF', paddingBottom: '15px' },
    title: { fontSize: '1.8rem', color: '#003366', margin: 0, fontWeight: 800 },
    kpiGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' },
    section: { background: 'white', borderRadius: '10px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', padding: '25px', marginBottom: '30px' },
    table: { width: '100%', borderCollapse: 'collapse', textAlign: 'left' },
    th: { padding: '12px', borderBottom: '2px solid #E9ECEF', color: '#6C757D', fontSize: '0.85rem', textTransform: 'uppercase' },
    td: { padding: '12px', borderBottom: '1px solid #E9ECEF', fontSize: '0.95rem' },
    input: { width: '100%', padding: '10px', border: '1px solid #ccc', borderRadius: '6px', boxSizing: 'border-box' },
    btn: { padding: '10px 20px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer' },
    error: { padding: '15px', background: '#F8D7DA', color: '#721C24', borderRadius: '8px', marginBottom: '20px', borderLeft: '4px solid #DC3545', textAlign: 'center' }
  };

  return (
    <>
      <Header />
      
      <div style={{ minHeight: 'calc(100vh - 200px)', background: '#F8F9FA' }}>
        <div style={s.container}>
          
          <div style={s.header}>
            <div>
              <h1 style={s.title}>Owner Dashboard — Profit &amp; Loss</h1>
              <p style={{ margin: '5px 0 0 0', color: '#6C757D' }}>sXL Super Express Logistics Center</p>
            </div>
            <button onClick={load} style={{ ...s.btn, background: '#003366' }}>Refresh Data</button>
          </div>

          {error && (
            <div style={s.error}>
              <p style={{ margin: '0 0 10px 0', fontWeight: 'bold' }}>{error}</p>
              {error.includes('logged in') && (
                <Link href="/login" style={{ background: '#DC3545', color: 'white', padding: '8px 16px', borderRadius: '5px', textDecoration: 'none', fontWeight: 'bold' }}>
                  Go to Login Page
                </Link>
              )}
            </div>
          )}

          <div style={s.kpiGrid}>
            <Kpi label="Total Revenue" value={fmt.format(totals.revenue)} tone="blue" loading={loading} />
            <Kpi label="Total Expenses" value={fmt.format(totals.expenses)} tone="amber" loading={loading} />
            <Kpi label="Net Profit" value={fmt.format(totals.profit)} tone={totals.profit >= 0 ? 'green' : 'red'} loading={loading} />
            <Kpi label="Profit Margin" value={`${totals.margin.toFixed(1)}%`} tone={totals.margin >= 0 ? 'green' : 'red'} loading={loading} />
          </div>

          <div style={s.section}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#003366', fontSize: '1.2rem' }}>Record New Expense</h2>
            <form onSubmit={handleAddExpense} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6C757D', display: 'block', marginBottom: '5px' }}>Shipment</label>
                <select value={form.shipment_id} onChange={(e) => setForm({ ...form, shipment_id: e.target.value })} style={s.input}>
                  <option value="">— Overhead —</option>
                  {shipments.map((sh) => (
                    <option key={sh.id} value={sh.id}>{sh.tracking_number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6C757D', display: 'block', marginBottom: '5px' }}>Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} style={s.input}>
                  {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6C757D', display: 'block', marginBottom: '5px' }}>Description</label>
                <input placeholder="Note..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} style={s.input} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6C757D', display: 'block', marginBottom: '5px' }}>Amount</label>
                <input type="number" step="0.01" min="0" placeholder="0.00" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} style={s.input} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#6C757D', display: 'block', marginBottom: '5px' }}>Date</label>
                <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} style={s.input} />
              </div>
              <button type="submit" disabled={saving} style={{ ...s.btn, opacity: saving ? 0.6 : 1, height: '40px' }}>
                {saving ? 'Saving...' : '+ Add Expense'}
              </button>
            </form>
          </div>

          <div style={s.section}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#003366', fontSize: '1.2rem' }}>Shipment Profit Margins ({shipmentProfits.length})</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Tracking</th><th style={s.th}>Customer</th><th style={s.th}>Status</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Revenue</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Expenses</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Profit</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Margin</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center' }}>Loading...</td></tr>}
                  {!loading && shipmentProfits.length === 0 && <tr><td colSpan={7} style={{ ...s.td, textAlign: 'center' }}>No shipments found.</td></tr>}
                  {shipmentProfits.map((sh) => (
                    <tr key={sh.id}>
                      <td style={{ ...s.td, fontWeight: 'bold' }}>{sh.tracking_number}</td>
                      <td style={s.td}>{sh.customer}</td>
                      <td style={s.td}><span style={{ background: '#E9ECEF', padding: '4px 8px', borderRadius: '4px', fontSize: '0.8rem' }}>{sh.status}</span></td>
                      <td style={{ ...s.td, textAlign: 'right' }}>{fmt.format(sh.revenue)}</td>
                      <td style={{ ...s.td, textAlign: 'right', color: '#DC3545' }}>{fmt.format(sh.expenses)}</td>
                      <td style={{ ...s.td, textAlign: 'right', fontWeight: 'bold', color: sh.profit >= 0 ? '#28A745' : '#DC3545' }}>{fmt.format(sh.profit)}</td>
                      <td style={{ ...s.td, textAlign: 'right', color: sh.margin >= 0 ? '#28A745' : '#DC3545' }}>{sh.margin.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={s.section}>
            <h2 style={{ marginTop: 0, marginBottom: '20px', color: '#003366', fontSize: '1.2rem' }}>Expense Ledger ({expenses.length})</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={s.table}>
                <thead>
                  <tr>
                    <th style={s.th}>Date</th><th style={s.th}>Shipment</th><th style={s.th}>Category</th><th style={s.th}>Description</th>
                    <th style={{ ...s.th, textAlign: 'right' }}>Amount</th><th style={{ ...s.th, textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.length === 0 && <tr><td colSpan={6} style={{ ...s.td, textAlign: 'center' }}>No expenses recorded.</td></tr>}
                  {expenses.map((e) => {
                    const sh = shipments.find((x) => x.id === e.shipment_id);
                    return (
                      <tr key={e.id}>
                        <td style={s.td}>{e.expense_date?.slice(0, 10)}</td>
                        <td style={{ ...s.td, fontWeight: 'bold' }}>{sh ? sh.tracking_number : '—'}</td>
                        <td style={s.td}>{e.category}</td>
                        <td style={s.td}>{e.description || '—'}</td>
                        <td style={{ ...s.td, textAlign: 'right', fontWeight: 'bold' }}>{fmt.format(e.amount)}</td>
                        <td style={{ ...s.td, textAlign: 'right' }}>
                          <button onClick={() => handleDeleteExpense(e.id)} disabled={deletingId === e.id} style={{ background: 'none', border: 'none', color: '#DC3545', cursor: 'pointer', textDecoration: 'underline' }}>
                            {deletingId === e.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </div>
      
      <Footer />
    </>
  );
}

function Kpi({ label, value, tone, loading }) {
  const colors = {
    blue: { bg: '#EBF8FF', color: '#2B6CB0', border: '#90CDF4' },
    amber: { bg: '#FFFFF0', color: '#B7791F', border: '#F6E05E' },
    green: { bg: '#F0FFF4', color: '#276749', border: '#9AE6B4' },
    red: { bg: '#FFF5F5', color: '#C53030', border: '#FEB2B2' },
  };
  const c = colors[tone] || colors.blue;
  return (
    <div style={{ padding: '20px', borderRadius: '10px', border: `1px solid ${c.border}`, background: c.bg, color: c.color }}>
      <div style={{ fontSize: '0.8rem', fontWeight: 'bold', textTransform: 'uppercase', opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: '1.8rem', fontWeight: '800', marginTop: '5px' }}>{loading ? '...' : value}</div>
    </div>
  );
}
