'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

export default function PaymentsPage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    paymentType: 'CUSTOMER',
    farmerId: '',
    buyerId: '',
    amount: '',
    method: 'CASH',
    notes: '',
  });

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      const [payments, f, b] = await Promise.all([
        api('/payments'),
        api('/farmers'),
        api('/buyers'),
      ]);
      setList(payments);
      setFarmers(f);
      setBuyers(b);
      if (f[0]) setForm((x) => ({ ...x, farmerId: f[0].id }));
      if (b[0]) setForm((x) => ({ ...x, buyerId: b[0].id }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      const body = {
        paymentType: form.paymentType,
        amount: parseFloat(form.amount),
        method: form.method,
        notes: form.notes,
      };
      if (form.paymentType === 'SUPPLIER') body.farmerId = form.farmerId;
      else body.buyerId = form.buyerId;

      await api('/payments', { method: 'POST', body: JSON.stringify(body) });
      setMsg('Malipo yamerekodiwa');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Nav />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 className="section-title" style={{ marginBottom: 4 }}>Malipo</h1>
            <p className="muted">Payments in & out</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Rekodi Malipo</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-info">{msg}</div>}

        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <form onSubmit={submit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Aina</label>
                  <select value={form.paymentType} onChange={(e) => setForm({ ...form, paymentType: e.target.value })}
                    style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                    <option value="CUSTOMER">Pokea kutoka Buyer</option>
                    <option value="SUPPLIER">Lipa Mkulima</option>
                  </select>
                </div>
                {form.paymentType === 'SUPPLIER' ? (
                  <div className="form-group">
                    <label>Mkulima</label>
                    <select value={form.farmerId} onChange={(e) => setForm({ ...form, farmerId: e.target.value })}
                      style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                      {farmers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div className="form-group">
                    <label>Buyer</label>
                    <select value={form.buyerId} onChange={(e) => setForm({ ...form, buyerId: e.target.value })}
                      style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                      {buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                )}
                <div className="form-group">
                  <label>Kiasi (Tsh)</label>
                  <input type="number" required value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Njia</label>
                  <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}
                    style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                    <option value="CASH">Cash</option>
                    <option value="BANK">Bank</option>
                    <option value="MOBILE">Mobile Money</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Maelezo</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Hifadhi</button>
            </form>
          </div>
        )}

        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Code</th><th>Tarehe</th><th>Aina</th><th>Jina</th><th>Kiasi</th><th>Njia</th></tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{p.payment_code}</td>
                  <td>{p.payment_date?.slice?.(0, 10) || p.payment_date}</td>
                  <td>{p.payment_type}</td>
                  <td>{p.farmer_name || p.buyer_name || '—'}</td>
                  <td>{formatMoney(p.amount)}</td>
                  <td>{p.method}</td>
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
