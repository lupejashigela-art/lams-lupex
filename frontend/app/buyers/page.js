'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

export default function BuyersPage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', location: '', notes: '', creditLimit: '0' });

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      setList(await api('/buyers'));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    try {
      await api('/buyers', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          location: form.location,
          notes: form.notes,
          creditLimit: parseFloat(form.creditLimit) || 0,
        }),
      });
      setShowForm(false);
      setForm({ name: '', phone: '', location: '', notes: '', creditLimit: '0' });
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
            <h1 className="section-title" style={{ marginBottom: 4 }}>Wanunuzi (Buyers)</h1>
            <p className="muted">Boss / Customers</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>+ Ongeza</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <form onSubmit={submit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Jina</label>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Simu</label>
                  <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Mahali</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Credit Limit (0 = hakuna kikomo)</label>
                  <input type="number" value={form.creditLimit} onChange={(e) => setForm({ ...form, creditLimit: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Hifadhi</button>
            </form>
          </div>
        )}

        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Jina</th><th>Simu</th><th>Mahali</th><th>Credit Limit</th><th>Risk</th></tr>
            </thead>
            <tbody>
              {list.map((b) => (
                <tr key={b.id}>
                  <td>{b.name}</td>
                  <td>{b.phone || '—'}</td>
                  <td>{b.location || '—'}</td>
                  <td>{b.credit_limit > 0 ? formatMoney(b.credit_limit) : 'Hakuna'}</td>
                  <td>
                    <span className={`badge ${b.risk_level === 'HIGH' ? 'badge-red' : b.risk_level === 'MEDIUM' ? 'badge-yellow' : 'badge-green'}`}>
                      {b.risk_level || 'LOW'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="muted" style={{ padding: 12 }}>Hakuna wanunuzi bado.</p>}
        </div>
      </div>
    </>
  );
}
