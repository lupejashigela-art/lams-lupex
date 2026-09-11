'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

export default function FarmersPage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', phone: '', location: '', notes: '' });

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try { setList(await api('/farmers')); }
    catch (err) { setError(err.message); }
  }

  function openNew() {
    setEditId(null);
    setForm({ name: '', phone: '', location: '', notes: '' });
    setShowForm(true);
    setError(''); setMsg('');
  }

  function openEdit(f) {
    setEditId(f.id);
    setForm({ name: f.name || '', phone: f.phone || '', location: f.location || '', notes: f.notes || '' });
    setShowForm(true);
    setError(''); setMsg('');
  }

  async function submit(e) {
    e.preventDefault();
    setError(''); setMsg('');
    try {
      if (editId) {
        await api(`/farmers/${editId}`, { method: 'PUT', body: JSON.stringify(form) });
        setMsg('Taarifa zimehaririwa');
      } else {
        await api('/farmers', { method: 'POST', body: JSON.stringify(form) });
        setMsg('Mkulima ameongezwa');
      }
      setShowForm(false);
      setEditId(null);
      setForm({ name: '', phone: '', location: '', notes: '' });
      load();
    } catch (err) { setError(err.message); }
  }

  async function handleDelete(f) {
    if (!window.confirm(`Futa mkulima "${f.name}"?`)) return;
    setError('');
    try {
      await api(`/farmers/${f.id}`, { method: 'DELETE' });
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
            <h1 className="section-title" style={{ marginBottom: 4 }}>Wakulima (Farmers)</h1>
            <p className="muted">Suppliers wa mazao</p>
          </div>
          <button className="btn btn-primary" onClick={() => showForm ? setShowForm(false) : openNew()}>
            {showForm ? 'Funga' : '+ Ongeza'}
          </button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-info">{msg}</div>}
        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>{editId ? 'Hariri Mkulima' : 'Ongeza Mkulima'}</h3>
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
                  <label>Maelezo</label>
                  <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">{editId ? 'Hifadhi Mabadiliko' : 'Hifadhi'}</button>
            </form>
          </div>
        )}
        <div className="card">
          <table className="table">
            <thead>
              <tr><th>Jina</th><th>Simu</th><th>Mahali</th><th>Score</th><th>Vitendo</th></tr>
            </thead>
            <tbody>
              {list.map((f) => (
                <tr key={f.id}>
                  <td>{f.name}</td>
                  <td>{f.phone || '—'}</td>
                  <td>{f.location || '—'}</td>
                  <td>{f.reliability_score || 0}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.75rem' }} onClick={() => openEdit(f)}>Edit</button>
                    {' '}
                    <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.75rem', color: '#ef4444' }} onClick={() => handleDelete(f)}>Futa</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="muted" style={{ padding: 12 }}>Hakuna wakulima bado.</p>}
        </div>
      </div>
    </>
  );
}
