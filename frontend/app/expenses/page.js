'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

const CATEGORIES = ['Usafiri', 'Maghala', 'Mizigo', 'Mafuta', 'Mengineyo'];

export default function ExpensesPage() {
  const router = useRouter();
  const [data, setData] = useState({ items: [], total: 0 });
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ category: 'Usafiri', description: '', amount: '' });

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      setData(await api('/expenses'));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/expenses', {
        method: 'POST',
        body: JSON.stringify({
          category: form.category,
          description: form.description,
          amount: parseFloat(form.amount),
        }),
      });
      setShowForm(false);
      setForm({ category: 'Usafiri', description: '', amount: '' });
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
            <h1 className="section-title" style={{ marginBottom: 4 }}>Gharama</h1>
            <p className="muted">Operating expenses</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Ongeza</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="card" style={{ marginBottom: 20 }}>
          <h3>Jumla ya Gharama</h3>
          <div className="value">{formatMoney(data.total)}</div>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <form onSubmit={submit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Aina</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                    {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Kiasi (Tsh)</label>
                  <input type="number" required value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Maelezo</label>
                  <input value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Hifadhi</button>
            </form>
          </div>
        )}

        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Tarehe</th><th>Aina</th><th>Maelezo</th><th>Kiasi</th></tr>
            </thead>
            <tbody>
              {(data.items || []).map((e) => (
                <tr key={e.id}>
                  <td>{e.expense_date?.slice?.(0, 10) || e.expense_date}</td>
                  <td>{e.category}</td>
                  <td>{e.description || '—'}</td>
                  <td>{formatMoney(e.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(data.items || []).length === 0 && (
            <p className="muted" style={{ padding: 12 }}>Hakuna gharama bado.</p>
          )}
        </div>
      </div>
    </>
  );
}
