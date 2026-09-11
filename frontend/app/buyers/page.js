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
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', location: '', notes: '', creditLimit: '0' });

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try { setList(await api('/buyers')); }
    catch (err) { setError(err.message); }
  }

  function openNew() {
    setEditId(null);
    setForm({ name: '', phone: '', location: '', notes: '', creditLimit: '0' });
    setShowForm(true);
    setError(''); setMsg('');
  }

  function openEdit(b) {
    setEditId(b.id);
    setForm({
      name: b.name || '', phone: b.phone || '', location: b.location || '',
      notes: b.notes || '', creditLimit: String(b.credit_limit ?? 0),
    });
    setShowForm(true);
    setError(''); setMsg('');
  }

  async function submit(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      const body = {
        name: form.name, phone: form.phone, location: form.location,
        notes: form.notes, creditLimit: parseFloat(form.creditLimit) || 0,
      };
      if (editId) {
        await api(`/buyers/${editId}`, { method: 'PUT', body: JSON.stringify(body) });
        setMsg('Taarifa zimehaririwa');
      } else {
        await api('/buyers', { method: 'POST', body: JSON.stringify(body) });
        setMsg('Buyer ameongezwa');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', phone: '', location: '', notes: '', creditLimit: '0' });
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(b) {
    if (!window.confirm(`Futa buyer "${b.name}"?`)) return;
    setError('');
    try {
      await api(`/buyers/${b.id}`, { method: 'DELETE' });
      setMsg('Imefutwa');
      load();
    } catch (err) { setError(err.message); }
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
          <button className="btn btn-primary" onClick={() => showForm ? setShowForm(false) : openNew()}>
            {showForm ? 'Funga' : '+ Ongeza'}
          </button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-info">{msg}</div>}
        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>{editId ? 'Hariri Buyer' : 'Ongeza Buyer'}</h3>
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
              <button type="submit" className="btn btn-primary">{editId ? 'Hifadhi Mabadiliko' : 'Hifadhi'}</button>
            </form>
          </div>
        )}
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Jina</th><th>Simu</th><th>Mahali</th><th>Credit Limit</th><th>Risk</th><th>Vitendo</th></tr>
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
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => openEdit(b)}>Edit</button>
                    {' '}
                    <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.75rem', color: '#ef4444' }} onClick={() => handleDelete(b)}>Futa</button>
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
