'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

const emptyForm = {
  paymentType: 'CUSTOMER',
  debtId: '',
  payMode: 'full',
  amount: '',
  method: 'CASH',
  notes: '',
};

export default function PaymentsPage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [debts, setDebts] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      const [payments, d] = await Promise.all([
        api('/payments'),
        api('/debts'),
      ]);
      setList(payments);
      setDebts(d);
    } catch (err) {
      setError(err.message);
    }
  }

  function resetForm() {
    setForm({ ...emptyForm });
  }

  function openForm() {
    resetForm();
    setShowForm(true);
    setError('');
    setMsg('');
  }

  function debtOptions() {
    if (!debts) return [];
    if (form.paymentType === 'SUPPLIER') {
      return (debts.weOweFarmers?.items || []).map((r) => ({
        id: r.id,
        label: `${r.purchase_code} – ${r.person_name} – ${r.crop_name}`,
        balance: Number(r.balance),
        person: r.person_name,
        code: r.purchase_code,
      }));
    }
    return (debts.buyersOweUs?.items || []).map((r) => ({
      id: r.id,
      label: `${r.sale_code} – ${r.person_name} – ${r.crop_name}`,
      balance: Number(r.balance),
      person: r.person_name,
      code: r.sale_code,
    }));
  }

  function selectedDebt() {
    return debtOptions().find((d) => String(d.id) === String(form.debtId)) || null;
  }

  function outstanding() {
    return selectedDebt()?.balance || 0;
  }

  function remaining() {
    if (form.payMode === 'full') return 0;
    return Math.max(0, outstanding() - (parseFloat(form.amount) || 0));
  }

  async function handleDelete(p) {
    const name = p.farmer_name || p.buyer_name || p.payment_code;
    if (!window.confirm(`Futa malipo "${name}" – ${formatMoney(p.amount)}?\nDeni litarudishwa.`)) return;
    setError('');
    try {
      await api(`/payments/${p.id}`, { method: 'DELETE' });
      setMsg('Malipo yamefutwa');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    setSaving(true);

    try {
      const debt = selectedDebt();
      if (!debt) {
        setError('Chagua deni unayotaka kulipa / kupokea');
        setSaving(false);
        return;
      }

      const totalDue = debt.balance;
      let payAmount = form.payMode === 'full' ? totalDue : (parseFloat(form.amount) || 0);

      if (payAmount <= 0) {
        setError('Andika kiasi sahihi');
        setSaving(false);
        return;
      }
      if (payAmount > totalDue) {
        setError(`Kiasi hakizidi deni (${formatMoney(totalDue)})`);
        setSaving(false);
        return;
      }

      const body = {
        paymentType: form.paymentType,
        amount: payAmount,
        method: form.method,
        notes: form.notes || undefined,
      };

      if (form.paymentType === 'SUPPLIER') {
        body.purchaseId = form.debtId;
      } else {
        body.saleId = form.debtId;
      }

      await api('/payments', { method: 'POST', body: JSON.stringify(body) });
      setMsg('Malipo yamerekodiwa');
      setShowForm(false);
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const options = debtOptions();

  return (
    <>
      <Nav />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 className="section-title" style={{ marginBottom: 4 }}>Malipo</h1>
            <p className="muted">Kulipa madeni & kupokea malipo</p>
          </div>
          <button className="btn btn-primary" onClick={() => showForm ? (setShowForm(false), resetForm()) : openForm()}>
            {showForm ? 'Funga' : '+ Rekodi Malipo'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-info">{msg}</div>}

        {showForm && (
          <div className="card" style={{ marginBottom: 24, maxWidth: 520 }}>
            <form onSubmit={submit}>
              <div className="form-group">
                <label>Aina ya malipo</label>
                <select
                  value={form.paymentType}
                  onChange={(e) => setForm({ ...form, paymentType: e.target.value, debtId: '', amount: '', payMode: 'full' })}
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                >
                  <option value="CUSTOMER">Kupokea kutoka Buyer (wanatodaiwa)</option>
                  <option value="SUPPLIER">Kulipa Mkulima (tunadaiwa)</option>
                </select>
              </div>

              <div className="form-group">
                <label>
                  {form.paymentType === 'CUSTOMER' ? 'Chagua deni la Buyer' : 'Chagua deni la Mkulima'}
                </label>
                <select
                  value={form.debtId}
                  onChange={(e) => setForm({ ...form, debtId: e.target.value, amount: '', payMode: 'full' })}
                  required
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                >
                  <option value="">-- Chagua --</option>
                  {options.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.label} ({formatMoney(d.balance)})
                    </option>
                  ))}
                </select>
                {options.length === 0 && (
                  <p className="muted" style={{ marginTop: 6, fontSize: '0.85rem' }}>
                    Hakuna madeni ya aina hii kwa sasa.
                  </p>
                )}
              </div>

              {form.debtId && (
                <div style={{
                  background: 'var(--bg)',
                  padding: 12,
                  borderRadius: 8,
                  marginBottom: 16,
                  border: '1px solid var(--border)',
                }}>
                  <p style={{ margin: 0 }}>
                    <strong>
                      {form.paymentType === 'CUSTOMER' ? 'Anadaiwa (Buyer):' : 'Tunadaiwa (Mkulima):'}
                    </strong>{' '}
                    <span style={{ color: '#eab308', fontSize: '1.1rem' }}>
                      {formatMoney(outstanding())}
                    </span>
                  </p>
                  <p className="muted" style={{ margin: '4px 0 0', fontSize: '0.85rem' }}>
                    {selectedDebt()?.person} · {selectedDebt()?.code}
                  </p>
                </div>
              )}

              {form.debtId && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                    <input
                      type="radio"
                      checked={form.payMode === 'full'}
                      onChange={() => setForm({ ...form, payMode: 'full', amount: '' })}
                    />
                    <span>
                      {form.paymentType === 'CUSTOMER' ? 'Amelipa yote' : 'Nmelipa yote'}{' '}
                      ({formatMoney(outstanding())})
                    </span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input
                      type="radio"
                      checked={form.payMode === 'partial'}
                      onChange={() => setForm({ ...form, payMode: 'partial' })}
                    />
                    <span>
                      {form.paymentType === 'CUSTOMER' ? 'Amelipa kiasi' : 'Nmelipa kiasi'}
                    </span>
                  </label>
                </div>
              )}

              {form.debtId && form.payMode === 'partial' && (
                <div>
                  <div className="form-group">
                    <label>
                      {form.paymentType === 'CUSTOMER' ? 'Kiasi alicholipa (Tsh)' : 'Kiasi nilicholipa (Tsh)'}
                    </label>
                    <input
                      type="number"
                      required
                      value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })}
                      placeholder="Andika kiasi"
                    />
                  </div>
                  <p style={{ marginBottom: 16 }}>
                    <strong>Kilichobaki:</strong>{' '}
                    <span style={{ color: '#eab308' }}>{formatMoney(remaining())}</span>
                  </p>
                </div>
              )}

              {form.debtId && (
                <>
                  <div className="form-group">
                    <label>Njia</label>
                    <select
                      value={form.method}
                      onChange={(e) => setForm({ ...form, method: e.target.value })}
                      style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK">Bank</option>
                      <option value="MOBILE">Mobile Money</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Maelezo (si lazima)</label>
                    <input
                      value={form.notes}
                      onChange={(e) => setForm({ ...form, notes: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </>
              )}

              <button type="submit" className="btn btn-primary" disabled={saving || !form.debtId}>
                {saving ? 'Inahifadhi...' : 'Hifadhi Malipo'}
              </button>
            </form>
          </div>
        )}

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Tarehe</th>
                <th>Aina</th>
                <th>Jina</th>
                <th>Kiasi</th>
                <th>Njia</th>
                <th>Vitendo</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{p.payment_code}</td>
                  <td>{p.payment_date?.slice?.(0, 10) || p.payment_date}</td>
                  <td>{p.payment_type === 'CUSTOMER' ? 'Kupokea' : 'Kulipa'}</td>
                  <td>{p.farmer_name || p.buyer_name || '—'}</td>
                  <td>{formatMoney(p.amount)}</td>
                  <td>{p.method}</td>
                  <td>
                    <button
                      className="btn btn-ghost"
                      style={{ padding: '2px 8px', fontSize: '0.75rem', color: '#ef4444' }}
                      onClick={() => handleDelete(p)}
                    >
                      Futa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="muted" style={{ padding: 12 }}>Hakuna malipo bado.</p>}
        </div>
      </div>
    </>
  );
}
