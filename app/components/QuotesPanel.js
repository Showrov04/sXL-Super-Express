'use client';

import { useEffect, useState, useMemo, useRef } from 'react';

/* ============================================================
   Task 35e — Quotes Panel
   List + Create/Edit modal + PDF preview + Status changes.
   Two quote types: AIR (weight-based) and SEA (CBM-based).
   ============================================================ */

const TD_STYLE = {
  padding: '10px 12px',
  borderBottom: '1px solid #F1F3F5',
  whiteSpace: 'nowrap',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  height: '48px',
  verticalAlign: 'middle',
};

function formatDate(d) {
  if (!d) return '-';
  try {
    const date = new Date(d);
    if (isNaN(date.getTime())) return String(d);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch (e) { return '-'; }
}

function statusStyle(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'accepted') return { bg: '#D4EDDA', color: '#155724', label: 'Accepted' };
  if (v === 'rejected') return { bg: '#F8D7DA', color: '#721C24', label: 'Rejected' };
  if (v === 'sent')     return { bg: '#CCE5FF', color: '#004085', label: 'Sent' };
  if (v === 'expired')  return { bg: '#E9ECEF', color: '#495057', label: 'Expired' };
  return { bg: '#FFF3CD', color: '#856404', label: 'Draft' };
}

function typeBadge(t) {
  const v = String(t || '').toUpperCase();
  if (v === 'SEA') {
    return (
      <span style={{
        background: '#D6EAF8', color: '#055C99',
        padding: '4px 10px', borderRadius: '12px',
        fontWeight: 700, fontSize: '0.72rem',
        letterSpacing: '0.3px', whiteSpace: 'nowrap',
      }}>SEA</span>
    );
  }
  return (
    <span style={{
      background: '#FFE8D1', color: '#8B4500',
      padding: '4px 10px', borderRadius: '12px',
      fontWeight: 700, fontSize: '0.72rem',
      letterSpacing: '0.3px', whiteSpace: 'nowrap',
    }}>AIR</span>
  );
}

const EMPTY_FORM = {
  quote_type: 'AIR',
  customer_name: '',
  customer_company: '',
  customer_email: '',
  customer_phone: '',
  origin: '',
  destination: '',
  description: '',
  packages: '',
  total_weight: '',
  total_cbm: '',
  packaging_type: '',
  dimensions: '',
  hs_code: '',
  commodity: '',
  currency: 'USD',
  rate: '',
  pickup_charge: '',
  customs_charge: '',
  delivery_charge: '',
  additional_lines: [],
  valid_until: '',
  lead_time: '',
  transit_time: '',
  notes: '',
  terms: '',
};

export default function QuotesPanel() {
  const [loading, setLoading] = useState(true);
  const [quotes, setQuotes] = useState([]);
  const [counts, setCounts] = useState({ total: 0, draft: 0, sent: 0, accepted: 0 });
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');

  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  // Create/Edit modal
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null); // null = create
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  // Status action loading
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    loadQuotes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, typeFilter]);

  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 4000);
      return () => clearTimeout(t);
    }
  }, [toast]);

  useEffect(() => {
    document.body.style.overflow = showModal ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [showModal]);

  async function loadQuotes() {
    setLoading(true);
    setError('');
    const token = localStorage.getItem('sxl_token');
    if (!token) { setLoading(false); return; }

    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set('status', statusFilter);
      if (typeFilter) params.set('type', typeFilter);

      const res = await fetch('/api/admin/quotes?' + params.toString(), {
        headers: { Authorization: 'Bearer ' + token },
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to load quotes.');
        setLoading(false);
        return;
      }
      setQuotes(data.quotes || []);
      setCounts(data.counts || { total: 0, draft: 0, sent: 0, accepted: 0 });
      setLoading(false);
    } catch (err) {
      setError('Connection error.');
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return quotes;
    const s = search.trim().toLowerCase();
    return quotes.filter((q) =>
      String(q.quote_number || '').toLowerCase().includes(s) ||
      String(q.customer_name || '').toLowerCase().includes(s) ||
      String(q.customer_company || '').toLowerCase().includes(s)
    );
  }, [quotes, search]);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(q) {
    setEditingId(q.id);
    setForm({
      quote_type: q.quote_type || 'AIR',
      customer_name: q.customer_name || '',
      customer_company: q.customer_company || '',
      customer_email: q.customer_email || '',
      customer_phone: q.customer_phone || '',
      origin: q.origin || '',
      destination: q.destination || '',
      description: q.description || '',
      packages: q.packages != null ? String(q.packages) : '',
      total_weight: q.total_weight != null ? String(q.total_weight) : '',
      total_cbm: q.total_cbm != null ? String(q.total_cbm) : '',
      packaging_type: q.packaging_type || '',
      dimensions: q.dimensions || '',
      hs_code: q.hs_code || '',
      commodity: q.commodity || '',
      currency: q.currency || 'USD',
      rate: q.rate != null ? String(q.rate) : '',
      pickup_charge: q.pickup_charge != null ? String(q.pickup_charge) : '',
      customs_charge: q.customs_charge != null ? String(q.customs_charge) : '',
      delivery_charge: q.delivery_charge != null ? String(q.delivery_charge) : '',
      additional_lines: Array.isArray(q.additional_lines) ? q.additional_lines.map((l) => ({ label: l.label || '', amount: l.amount != null ? String(l.amount) : '' })) : [],
      valid_until: q.valid_until ? String(q.valid_until).slice(0, 10) : '',
      lead_time: q.lead_time || '',
      transit_time: q.transit_time || '',
      notes: q.notes || '',
      terms: q.terms || '',
    });
    setFormError('');
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;
    setShowModal(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function addCostLine() {
    setForm((prev) => ({
      ...prev,
      additional_lines: [...prev.additional_lines, { label: '', amount: '' }],
    }));
  }

  function updateCostLine(idx, field, value) {
    setForm((prev) => ({
      ...prev,
      additional_lines: prev.additional_lines.map((l, i) => i === idx ? { ...l, [field]: value } : l),
    }));
  }

  function removeCostLine(idx) {
    setForm((prev) => ({
      ...prev,
      additional_lines: prev.additional_lines.filter((_, i) => i !== idx),
    }));
  }

  function computeTotalsLive() {
    const isSea = form.quote_type === 'SEA';
    const rate = parseFloat(form.rate) || 0;
    const qty = isSea ? (parseFloat(form.total_cbm) || 0) : (parseFloat(form.total_weight) || 0);
    const freight = qty * rate;
    const pc = parseFloat(form.pickup_charge) || 0;
    const cc = parseFloat(form.customs_charge) || 0;
    const dc = parseFloat(form.delivery_charge) || 0;
    let addl = 0;
    form.additional_lines.forEach((l) => { addl += parseFloat(l.amount) || 0; });
    const subtotal = freight + pc + cc + dc + addl;
    return { freight, subtotal, total: subtotal };
  }

  async function handleSave() {
    setFormError('');
    if (!form.customer_name.trim()) { setFormError('Customer name is required.'); return; }
    if (!form.origin.trim()) { setFormError('Origin is required.'); return; }
    if (!form.destination.trim()) { setFormError('Destination is required.'); return; }
    if (!form.rate || parseFloat(form.rate) <= 0) { setFormError('Rate must be greater than 0.'); return; }
    if (form.quote_type === 'AIR' && (!form.total_weight || parseFloat(form.total_weight) <= 0)) {
      setFormError('Weight is required for AIR quotes.'); return;
    }
    if (form.quote_type === 'SEA' && (!form.total_cbm || parseFloat(form.total_cbm) <= 0)) {
      setFormError('Volume (CBM) is required for SEA quotes.'); return;
    }

    setSaving(true);
    const token = localStorage.getItem('sxl_token');

    const payload = {
      action: editingId ? 'update' : 'create',
      id: editingId || undefined,
      quote_type: form.quote_type,
      customer_name: form.customer_name.trim(),
      customer_company: form.customer_company.trim(),
      customer_email: form.customer_email.trim(),
      customer_phone: form.customer_phone.trim(),
      origin: form.origin.trim(),
      destination: form.destination.trim(),
      description: form.description.trim(),
      packages: form.packages,
      total_weight: form.total_weight,
      total_cbm: form.total_cbm,
      packaging_type: form.packaging_type,
      dimensions: form.dimensions.trim(),
      hs_code: form.hs_code.trim(),
      commodity: form.commodity.trim(),
      currency: form.currency,
      rate: form.rate,
      pickup_charge: form.pickup_charge,
      customs_charge: form.customs_charge,
      delivery_charge: form.delivery_charge,
      additional_lines: form.additional_lines.map((l) => ({
        label: String(l.label || '').trim(),
        amount: parseFloat(l.amount) || 0,
      })),
      valid_until: form.valid_until || null,
      lead_time: form.lead_time.trim(),
      transit_time: form.transit_time.trim(),
      notes: form.notes.trim(),
      terms: form.terms.trim(),
    };

    try {
      const res = await fetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!data.success) {
        setFormError(data.error || 'Save failed.');
        setSaving(false);
        return;
      }

      setSaving(false);
      closeModal();
      setToast(editingId
        ? '✅ Quote updated: ' + data.quote.quote_number
        : '✅ Quote created: ' + data.quoteNumber);
      loadQuotes();
    } catch (err) {
      setFormError('Connection error: ' + err.message);
      setSaving(false);
    }
  }

  async function handleDelete(q) {
    if (!window.confirm('Delete quote ' + q.quote_number + '? This cannot be undone.')) return;
    setActionLoading(q.id + ':delete');
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'delete', id: q.id }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); setActionLoading(''); return; }
      setToast('🗑️ Quote deleted: ' + q.quote_number);
      setActionLoading('');
      loadQuotes();
    } catch (err) {
      window.alert('Error: ' + err.message);
      setActionLoading('');
    }
  }

  async function handleStatusChange(q, newStatus) {
    setActionLoading(q.id + ':status');
    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/admin/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ action: 'updateStatus', id: q.id, status: newStatus }),
      });
      const data = await res.json();
      if (!data.success) { window.alert('Error: ' + (data.error || 'Failed')); setActionLoading(''); return; }
      setToast('✅ Marked as ' + newStatus);
      setActionLoading('');
      loadQuotes();
    } catch (err) {
      window.alert('Error: ' + err.message);
      setActionLoading('');
    }
  }

  async function openPDF(q) {
    const token = localStorage.getItem('sxl_token');
    setActionLoading(q.id + ':pdf');
    try {
      const res = await fetch('/api/pdf/quote/' + q.id, {
        headers: { Authorization: 'Bearer ' + token },
      });
      if (!res.ok) { window.alert('PDF error: ' + res.status); setActionLoading(''); return; }
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank', 'noopener');
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
      setActionLoading('');
    } catch (err) {
      window.alert('Error: ' + err.message);
      setActionLoading('');
    }
  }

  const live = computeTotalsLive();

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

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
        <div>
          <h2 style={{ color: '#003366', fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>
            💬 Quotes
          </h2>
          <p style={{ color: '#6C757D', fontSize: '0.88rem', marginTop: '4px', marginBottom: 0 }}>
            Generate professional price quotes for customers. AIR and SEA get different templates.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            padding: '12px 22px', background: '#FF6B00', color: 'white',
            border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'inline-flex', alignItems: 'center', gap: '6px',
          }}
        >
          + New Quote
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <StatCard num={counts.total} label="Total Quotes" color="#FF6B00" />
        <StatCard num={counts.draft} label="Draft" color="#FFE5B4" />
        <StatCard num={counts.sent} label="Sent" color="#CCE5FF" />
        <StatCard num={counts.accepted} label="Accepted" color="#D4EDDA" />
      </div>

      <div style={{
        background: 'white', borderRadius: '10px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        padding: '15px', marginBottom: '20px',
        display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center',
      }}>
        <input
          type="text"
          placeholder="Search by quote #, customer, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1, minWidth: '220px',
            padding: '10px 14px', border: '2px solid #E9ECEF',
            borderRadius: '8px', fontSize: '0.9rem',
            fontFamily: 'inherit', boxSizing: 'border-box',
          }}
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', minWidth: '160px' }}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="sent">Sent</option>
          <option value="accepted">Accepted</option>
          <option value="rejected">Rejected</option>
          <option value="expired">Expired</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: '10px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit', minWidth: '140px' }}
        >
          <option value="">All Modes</option>
          <option value="AIR">AIR</option>
          <option value="SEA">SEA</option>
        </select>
        <button
          onClick={loadQuotes}
          style={{ padding: '10px 16px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}
        >
          🔄 Refresh
        </button>
      </div>

      {error && (
        <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '10px', padding: '15px 20px', marginBottom: '20px' }}>
          ❌ {error}
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '60px 20px' }}>
          <div style={{ width: '45px', height: '45px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 15px' }} />
          <p style={{ color: '#6C757D' }}>Loading quotes...</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ background: '#D1ECF1', color: '#0C5460', borderLeft: '4px solid #17A2B8', borderRadius: '10px', padding: '20px' }}>
          {quotes.length === 0 ? 'No quotes yet. Click "+ New Quote" to create one.' : 'No quotes match your filters.'}
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div style={{ background: 'white', borderRadius: '12px', border: '1px solid #E9ECEF', boxShadow: '0 4px 20px rgba(0,0,0,0.08)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, fontSize: '0.85rem', minWidth: '1200px', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <TH width={150}>Quote #</TH>
                <TH width={70}>Mode</TH>
                <TH width={150}>Customer</TH>
                <TH width={150}>Route</TH>
                <TH width={100}>Total</TH>
                <TH width={100}>Status</TH>
                <TH width={110}>Valid Until</TH>
                <TH width={110}>Created</TH>
                <TH width={440}>Actions</TH>
              </tr>
            </thead>
            <tbody>
              {filtered.map((q, i) => {
                const st = statusStyle(q.status);
                const rowBg = i % 2 === 0 ? '#FFFFFF' : '#FAFBFC';
                return (
                  <tr key={q.id} style={{ background: rowBg }}>
                    <td style={{ ...TD_STYLE, fontFamily: 'Consolas, monospace', fontWeight: 700, color: '#003366' }}>
                      {q.quote_number}
                    </td>
                    <td style={TD_STYLE}>{typeBadge(q.quote_type)}</td>
                    <td style={TD_STYLE}>{q.customer_name || '-'}</td>
                    <td style={TD_STYLE}>{truncate((q.origin || '-') + ' -> ' + (q.destination || '-'), 22)}</td>
                    <td style={{ ...TD_STYLE, fontWeight: 700, color: '#003366' }}>
                      {q.currency} {Number(q.total || 0).toFixed(2)}
                    </td>
                    <td style={TD_STYLE}>
                      <span style={{
                        background: st.bg, color: st.color,
                        padding: '4px 12px', borderRadius: '20px',
                        fontWeight: 700, fontSize: '0.72rem',
                        textTransform: 'uppercase', whiteSpace: 'nowrap',
                      }}>{st.label}</span>
                    </td>
                    <td style={TD_STYLE}>{q.valid_until ? formatDate(q.valid_until) : '-'}</td>
                    <td style={TD_STYLE}>{formatDate(q.created_at)}</td>
                    <td style={{ ...TD_STYLE, whiteSpace: 'normal', overflow: 'visible', textOverflow: 'clip', padding: '8px 12px' }}>
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <button
                          onClick={() => openPDF(q)}
                          disabled={actionLoading === q.id + ':pdf'}
                          style={{
                            padding: '5px 10px', background: '#00A86B', color: 'white',
                            border: 'none', borderRadius: '6px', fontWeight: 700,
                            fontSize: '0.72rem', cursor: 'pointer',
                            fontFamily: 'inherit', whiteSpace: 'nowrap',
                            opacity: actionLoading === q.id + ':pdf' ? 0.6 : 1,
                          }}
                        >
                          📄 PDF
                        </button>

                        <button
                          onClick={() => openEdit(q)}
                          style={{
                            padding: '5px 10px', background: '#003366', color: 'white',
                            border: 'none', borderRadius: '6px', fontWeight: 700,
                            fontSize: '0.72rem', cursor: 'pointer',
                            fontFamily: 'inherit', whiteSpace: 'nowrap',
                          }}
                        >
                          ✏️ Edit
                        </button>

                        {q.status === 'draft' && (
                          <button
                            onClick={() => handleStatusChange(q, 'sent')}
                            disabled={actionLoading === q.id + ':status'}
                            style={{
                              padding: '5px 10px', background: '#0D6EFD', color: 'white',
                              border: 'none', borderRadius: '6px', fontWeight: 700,
                              fontSize: '0.72rem', cursor: 'pointer',
                              fontFamily: 'inherit', whiteSpace: 'nowrap',
                            }}
                          >
                            📤 Mark Sent
                          </button>
                        )}

                        {q.status === 'sent' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(q, 'accepted')}
                              disabled={actionLoading === q.id + ':status'}
                              style={{
                                padding: '5px 10px', background: '#28A745', color: 'white',
                                border: 'none', borderRadius: '6px', fontWeight: 700,
                                fontSize: '0.72rem', cursor: 'pointer',
                                fontFamily: 'inherit', whiteSpace: 'nowrap',
                              }}
                            >
                              ✅ Accepted
                            </button>
                            <button
                              onClick={() => handleStatusChange(q, 'rejected')}
                              disabled={actionLoading === q.id + ':status'}
                              style={{
                                padding: '5px 10px', background: '#FFC107', color: '#333',
                                border: 'none', borderRadius: '6px', fontWeight: 700,
                                fontSize: '0.72rem', cursor: 'pointer',
                                fontFamily: 'inherit', whiteSpace: 'nowrap',
                              }}
                            >
                              ✕ Rejected
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => handleDelete(q)}
                          disabled={actionLoading === q.id + ':delete'}
                          style={{
                            padding: '5px 10px', background: 'transparent', color: '#DC3545',
                            border: '2px solid #DC3545', borderRadius: '6px',
                            fontWeight: 700, fontSize: '0.72rem',
                            cursor: 'pointer', fontFamily: 'inherit',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ============================================================
          CREATE / EDIT MODAL
          ============================================================ */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 9999,
          overflowY: 'auto', padding: '20px 20px 60px',
        }}>
          <div style={{
            background: '#F8F9FA', maxWidth: '920px', width: '100%',
            margin: '0 auto', borderRadius: '16px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
          }}>
            {/* Modal header */}
            <div style={{
              background: 'white', borderRadius: '16px 16px 0 0',
              padding: '20px 28px', borderBottom: '1px solid #E9ECEF',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
              gap: '15px', flexWrap: 'wrap',
            }}>
              <div>
                <h2 style={{ color: '#003366', fontSize: '1.35rem', margin: 0 }}>
                  {editingId ? '✏️ Edit Quote' : '💬 New Quote'}
                </h2>
                <div style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '4px' }}>
                  {editingId ? 'Update the quote details. Total is recomputed on save.' : 'Fill in the details. Quote number is auto-generated.'}
                </div>
              </div>
              <button
                onClick={closeModal}
                disabled={saving}
                style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6C757D' }}
              >
                ✕
              </button>
            </div>

            <div style={{ overflowY: 'auto', padding: '20px 28px', maxHeight: 'calc(100vh - 200px)' }}>
              {formError && (
                <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', fontSize: '0.9rem' }}>
                  ❌ {formError}
                </div>
              )}

              {/* ---------- Mode selector ---------- */}
              <FormCard title="📦 Quote Type">
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                  <ModeButton
                    active={form.quote_type === 'AIR'}
                    color="#FF6B00"
                    icon="✈️"
                    title="AIR FREIGHT"
                    sub="Weight-based pricing (per kg)"
                    onClick={() => setField('quote_type', 'AIR')}
                  />
                  <ModeButton
                    active={form.quote_type === 'SEA'}
                    color="#055C99"
                    icon="🚢"
                    title="SEA FREIGHT"
                    sub="Volume-based pricing (per CBM)"
                    onClick={() => setField('quote_type', 'SEA')}
                  />
                </div>
              </FormCard>

              {/* ---------- Customer ---------- */}
              <FormCard title="👤 Customer">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <Field label="Customer Name *" value={form.customer_name} onChange={(v) => setField('customer_name', v)} />
                  <Field label="Company" value={form.customer_company} onChange={(v) => setField('customer_company', v)} />
                  <Field label="Email" type="email" value={form.customer_email} onChange={(v) => setField('customer_email', v)} />
                  <Field label="Phone" value={form.customer_phone} onChange={(v) => setField('customer_phone', v)} />
                </div>
              </FormCard>

              {/* ---------- Route ---------- */}
              <FormCard title="🗺️ Route">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                  <Field label="Origin *" value={form.origin} onChange={(v) => setField('origin', v)} placeholder="e.g., Hong Kong" />
                  <Field label="Destination *" value={form.destination} onChange={(v) => setField('destination', v)} placeholder="e.g., Dhaka, Bangladesh" />
                </div>
              </FormCard>

              {/* ---------- Shipment details ---------- */}
              <FormCard title="📋 Shipment Details">
                <Field label="Description / Commodity" value={form.description} onChange={(v) => setField('description', v)} textarea placeholder="e.g., Electronics accessories, general cargo" />
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '14px', marginTop: '14px' }}>
                  <Field label="Packages" type="number" value={form.packages} onChange={(v) => setField('packages', v)} />
                  {form.quote_type === 'AIR' && (
                    <Field label="Weight (kg) *" type="number" value={form.total_weight} onChange={(v) => setField('total_weight', v)} />
                  )}
                  {form.quote_type === 'SEA' && (
                    <>
                      <Field label="CBM (m³) *" type="number" value={form.total_cbm} onChange={(v) => setField('total_cbm', v)} />
                      <Field label="Weight (kg)" type="number" value={form.total_weight} onChange={(v) => setField('total_weight', v)} />
                    </>
                  )}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
                  <div>
                    <Label>Packaging Type</Label>
                    <select value={form.packaging_type} onChange={(e) => setField('packaging_type', e.target.value)} style={inputStyle}>
                      <option value="">-- Select --</option>
                      <option>Carton</option>
                      <option>Pallet</option>
                      <option>Roll</option>
                      <option>Flyer</option>
                      <option>Bag / Sack</option>
                      <option>Crate</option>
                      <option>Others</option>
                    </select>
                  </div>
                  <Field label="Dimensions (L×W×H cm)" value={form.dimensions} onChange={(v) => setField('dimensions', v)} placeholder="e.g., 60×40×40" />
                </div>
                <Field label="HS Code" value={form.hs_code} onChange={(v) => setField('hs_code', v)} />
              </FormCard>

              {/* ---------- Pricing ---------- */}
              <FormCard title="💰 Pricing">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '14px' }}>
                  <div>
                    <Label>Currency</Label>
                    <select value={form.currency} onChange={(e) => setField('currency', e.target.value)} style={inputStyle}>
                      <option>USD</option>
                      <option>HKD</option>
                      <option>CNY</option>
                      <option>BDT</option>
                    </select>
                  </div>
                  <Field
                    label={form.quote_type === 'SEA' ? 'Rate (per CBM) *' : 'Rate (per kg) *'}
                    type="number"
                    value={form.rate}
                    onChange={(v) => setField('rate', v)}
                    placeholder={form.quote_type === 'SEA' ? '120.00' : '12.50'}
                  />
                  <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <div style={{ fontSize: '0.85rem', color: '#6C757D' }}>
                      {form.quote_type === 'SEA'
                        ? 'CBM × rate = freight'
                        : 'kg × rate = freight'}
                    </div>
                  </div>
                </div>
              </FormCard>

              {/* ---------- Service charges ---------- */}
              <FormCard title="🛠️ Service Charges (optional)">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
                  <Field label="Pickup Charge" type="number" value={form.pickup_charge} onChange={(v) => setField('pickup_charge', v)} />
                  <Field label="Customs Clearance" type="number" value={form.customs_charge} onChange={(v) => setField('customs_charge', v)} />
                  <Field label="Delivery Charge" type="number" value={form.delivery_charge} onChange={(v) => setField('delivery_charge', v)} />
                </div>
              </FormCard>

              {/* ---------- Additional lines ---------- */}
              <FormCard title="➕ Additional Cost Lines">
                {form.additional_lines.length === 0 && (
                  <div style={{ fontSize: '0.85rem', color: '#6C757D', fontStyle: 'italic', marginBottom: '10px' }}>
                    No additional lines. Click below to add.
                  </div>
                )}
                {form.additional_lines.map((line, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Description (e.g., Fumigation)"
                      value={line.label}
                      onChange={(e) => updateCostLine(idx, 'label', e.target.value)}
                      style={{ flex: 2, padding: '10px 12px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }}
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={line.amount}
                      onChange={(e) => updateCostLine(idx, 'amount', e.target.value)}
                      style={{ flex: 1, padding: '10px 12px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.9rem', fontFamily: 'inherit' }}
                    />
                    <button
                      type="button"
                      onClick={() => removeCostLine(idx)}
                      style={{ padding: '10px 14px', background: '#DC3545', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 700 }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addCostLine}
                  style={{
                    marginTop: '8px', padding: '10px 16px',
                    background: 'transparent', color: '#003366',
                    border: '2px solid #E9ECEF', borderRadius: '8px',
                    fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  + Add Line
                </button>
              </FormCard>

              {/* ---------- Live totals ---------- */}
              <div style={{
                background: 'white', borderRadius: '12px',
                padding: '18px 22px', marginBottom: '16px',
                border: '2px solid #FF6B00',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#003366', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  💵 Live Total
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ color: '#6C757D', fontSize: '0.9rem' }}>Freight</span>
                  <span style={{ fontWeight: 700, color: '#343A40' }}>
                    {form.currency} {live.freight.toFixed(2)}
                  </span>
                </div>
                <div style={{ borderTop: '1px dashed #FF6B00', marginTop: '10px', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 800, color: '#003366', fontSize: '1rem' }}>TOTAL</span>
                  <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#FF6B00' }}>
                    {form.currency} {live.total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* ---------- Validity + times ---------- */}
              <FormCard title="📅 Validity & Timeline">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
                  <Field label="Valid Until" type="date" value={form.valid_until} onChange={(v) => setField('valid_until', v)} />
                  {form.quote_type === 'AIR' && (
                    <Field label="Lead Time" value={form.lead_time} onChange={(v) => setField('lead_time', v)} placeholder="e.g., 3-5 business days" />
                  )}
                  {form.quote_type === 'SEA' && (
                    <Field label="Transit Time" value={form.transit_time} onChange={(v) => setField('transit_time', v)} placeholder="e.g., 25-35 days" />
                  )}
                </div>
              </FormCard>

              {/* ---------- Notes & Terms ---------- */}
              <FormCard title="📝 Notes & Terms">
                <Field label="Notes (visible on PDF)" value={form.notes} onChange={(v) => setField('notes', v)} textarea placeholder="Any extra information the customer should know..." />
                <div style={{ marginTop: '14px' }}>
                  <Field label="Terms & Conditions (visible on PDF)" value={form.terms} onChange={(v) => setField('terms', v)} textarea placeholder="e.g., Quote valid for 30 days. Rates subject to change based on actual weight/volume." />
                </div>
              </FormCard>
            </div>

            {/* Modal footer */}
            <div style={{
              background: 'white', borderTop: '1px solid #E9ECEF',
              borderRadius: '0 0 16px 16px', padding: '16px 28px',
              display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap',
            }}>
              <button
                onClick={closeModal}
                disabled={saving}
                style={{
                  padding: '12px 24px', background: 'transparent', color: '#003366',
                  border: '2px solid #E9ECEF', borderRadius: '8px',
                  fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '12px 28px', background: '#FF6B00', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.6 : 1, fontFamily: 'inherit',
                }}
              >
                {saving ? 'Saving...' : (editingId ? '💾 Save Changes' : '💬 Create Quote')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ============================================================
   Small helpers
   ============================================================ */
const inputStyle = {
  width: '100%',
  padding: '10px 14px',
  fontSize: '0.9rem',
  border: '2px solid #E9ECEF',
  borderRadius: '8px',
  outline: 'none',
  fontFamily: 'inherit',
  boxSizing: 'border-box',
};

function Label({ children }) {
  return (
    <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#343A40', marginBottom: '5px' }}>
      {children}
    </label>
  );
}

function Field({ label, value, onChange, type = 'text', textarea = false, placeholder }) {
  return (
    <div>
      <Label>{label}</Label>
      {textarea ? (
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ ...inputStyle, minHeight: '70px', resize: 'vertical' }}
        />
      ) : (
        <input
          type={type}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={inputStyle}
        />
      )}
    </div>
  );
}

function FormCard({ title, children }) {
  return (
    <div style={{
      background: 'white', borderRadius: '12px',
      padding: '20px 22px', marginBottom: '16px',
      border: '1px solid #E9ECEF', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
    }}>
      <div style={{
        fontSize: '0.95rem', fontWeight: 800, color: '#003366',
        marginBottom: '16px', paddingBottom: '10px',
        borderBottom: '1px solid #F1F3F5',
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function ModeButton({ active, color, icon, title, sub, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: 1, minWidth: '220px',
        padding: '16px 18px',
        border: '3px solid ' + (active ? color : '#E9ECEF'),
        background: active ? color + '15' : 'white',
        borderRadius: '12px', cursor: 'pointer',
        fontFamily: 'inherit', textAlign: 'left',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
        <span style={{ fontSize: '1.6rem' }}>{icon}</span>
        <div style={{ fontWeight: 800, color: active ? color : '#343A40', fontSize: '1rem' }}>
          {title}
        </div>
      </div>
      <div style={{ fontSize: '0.8rem', color: '#6C757D' }}>{sub}</div>
    </button>
  );
}

function StatCard({ num, label, color }) {
  return (
    <div style={{
      background: 'white', padding: '20px', borderRadius: '10px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)', borderLeft: '4px solid ' + color,
    }}>
      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#003366' }}>{num}</div>
      <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '1px', color: '#6C757D', marginTop: '5px' }}>
        {label}
      </div>
    </div>
  );
}

function TH({ children, width }) {
  return (
    <th style={{
      padding: '14px 12px', textAlign: 'left',
      fontWeight: 700, color: '#003366',
      fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.5px',
      background: '#E9ECEF', borderBottom: '2px solid #D0D6DB',
      whiteSpace: 'nowrap', width, minWidth: width,
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      {children}
    </th>
  );
}

function truncate(str, maxLen) {
  const v = String(str || '');
  if (v.length <= maxLen) return v;
  return v.substring(0, maxLen - 1) + '…';
}
