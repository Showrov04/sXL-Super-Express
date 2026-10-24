'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

const CURRENCY = 'USD';
const fmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: CURRENCY,
  maximumFractionDigits: 2,
});

const EXPENSE_CATEGORIES = ['Partner Freight', 'Local Pickup', 'Labor', 'Customs / Duty', 'Other'];

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const today = () => new Date().toISOString().slice(0, 10);

export default function FinanceDashboard() {
  const router = useRouter();
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
      // Get the token from local storage (adjust if you store it in cookies)
      const token = localStorage.getItem('token') || localStorage.getItem('session_token');
      
      const res = await fetch('/api/finance', {
        cache: 'no-store',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
            if (res.status === 403) {
        setError("API returned 403 Forbidden. Your login token is missing, expired, or your database role is not 'owner'.");
        setLoading(false);
        return;
      }
      
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to load');

      // Map shipments for revenue calculation
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
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // Combine shipments and expenses to calculate profit per shipment
  const shipmentProfits = useMemo(() => {
    return shipments.map(ship => {
      // Find all expenses linked to this shipment
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

  // Overall Totals (including unlinked overhead expenses)
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
      const token = localStorage.getItem('token') || localStorage.getItem('session_token');
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
      const token = localStorage.getItem('token') || localStorage.getItem('session_token');
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

  return (
    <div className="mx-auto max-w-7xl p-6 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Owner Dashboard — Profit &amp; Loss</h1>
          <p className="text-sm text-slate-500">sXL Super Express Logistics Center</p>
        </div>
        <button onClick={load} className="rounded bg-slate-900 px-4 py-2 text-sm text-white hover:bg-slate-800">
          Refresh Data
        </button>
      </header>

      {error && (
        <div className="rounded border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Total Revenue" value={fmt.format(totals.revenue)} tone="blue" loading={loading} />
        <Kpi label="Total Expenses" value={fmt.format(totals.expenses)} tone="amber" loading={loading} />
        <Kpi label="Net Profit" value={fmt.format(totals.profit)} tone={totals.profit >= 0 ? 'green' : 'red'} loading={loading} />
        <Kpi label="Profit Margin" value={`${totals.margin.toFixed(1)}%`} tone={totals.margin >= 0 ? 'green' : 'red'} loading={loading} />
      </div>

      {/* Add Expense Form */}
      <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold text-slate-800">Record New Expense</h2>
        <form onSubmit={handleAddExpense} className="grid grid-cols-1 gap-3 md:grid-cols-6">
          <select value={form.shipment_id} onChange={(e) => setForm({ ...form, shipment_id: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm md:col-span-2">
            <option value="">— No shipment (overhead) —</option>
            {shipments.map((s) => (
              <option key={s.id} value={s.id}>{s.tracking_number}</option>
            ))}
          </select>

          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm">
            {EXPENSE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>

          <input placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm md:col-span-2" />

          <input type="number" step="0.01" min="0" placeholder="Amount" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm" />

          <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
            className="rounded border border-slate-300 px-2 py-1.5 text-sm" />

          <button type="submit" disabled={saving}
            className="rounded bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50 md:col-span-2">
            {saving ? 'Saving…' : 'Add Expense'}
          </button>
        </form>
      </section>

      {/* Shipment Profit Margins */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Shipment Profit Margins ({shipmentProfits.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <Th>Tracking</Th><Th>Customer</Th><Th>Status</Th>
                <Th right>Revenue</Th><Th right>Expenses</Th><Th right>Profit</Th><Th right>Margin</Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">Loading…</td></tr>}
              {!loading && shipmentProfits.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-500">No shipments found.</td></tr>
              )}
              {shipmentProfits.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <Td className="font-mono text-xs">{s.tracking_number}</Td>
                  <Td>{s.customer}</Td>
                  <Td>{s.status}</Td>
                  <Td right>{fmt.format(s.revenue)}</Td>
                  <Td right>{fmt.format(s.expenses)}</Td>
                  <Td right className={s.profit >= 0 ? 'text-emerald-700 font-medium' : 'text-red-600 font-medium'}>
                    {fmt.format(s.profit)}
                  </Td>
                  <Td right className={s.margin >= 0 ? 'text-emerald-700' : 'text-red-600'}>
                    {s.margin.toFixed(1)}%
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Expense Ledger */}
      <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
        <h2 className="border-b border-slate-200 px-4 py-3 text-sm font-semibold text-slate-800">
          Expense Ledger ({expenses.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <Th>Date</Th><Th>Shipment</Th><Th>Category</Th><Th>Description</Th>
                <Th right>Amount</Th><Th right> </Th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No expenses recorded.</td></tr>
              )}
              {expenses.map((e) => {
                const ship = shipments.find((s) => s.id === e.shipment_id);
                return (
                  <tr key={e.id} className="hover:bg-slate-50">
                    <Td>{e.expense_date ? e.expense_date.slice(0, 10) : '—'}</Td>
                    <Td className="font-mono text-xs">{ship ? ship.tracking_number : '—'}</Td>
                    <Td>{e.category}</Td>
                    <Td>{e.description || '—'}</Td>
                    <Td right>{fmt.format(e.amount)}</Td>
                    <Td right>
                      <button onClick={() => handleDeleteExpense(e.id)} disabled={deletingId === e.id}
                        className="text-xs text-red-600 hover:underline disabled:opacity-50">
                        {deletingId === e.id ? 'Deleting…' : 'Delete'}
                      </button>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function Kpi({ label, value, tone, loading }) {
  const tones = {
    blue:  'border-blue-200 bg-blue-50 text-blue-900',
    amber: 'border-amber-200 bg-amber-50 text-amber-900',
    green: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    red:   'border-red-200 bg-red-50 text-red-900',
  };
  return (
    <div className={`rounded-lg border p-4 shadow-sm ${tones[tone]}`}>
      <div className="text-xs uppercase tracking-wide opacity-70">{label}</div>
      <div className="mt-1 text-2xl font-bold">{loading ? <span className="opacity-40">…</span> : value}</div>
    </div>
  );
}

function Th({ children, right }) {
  return <th className={`px-4 py-2 font-medium ${right ? 'text-right' : ''}`}>{children}</th>;
}

function Td({ children, right, colSpan, className = '' }) {
  return <td colSpan={colSpan} className={`px-4 py-2 ${right ? 'text-right' : ''} ${className}`}>{children}</td>;
}
