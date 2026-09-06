'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

export default function AuditPage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      setList(await api('/audit?limit=150'));
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
            <h1 className="section-title" style={{ marginBottom: 4 }}>Audit Log</h1>
            <p className="muted">WHO · WHEN · WHAT</p>
          </div>
          <button className="btn btn-ghost" onClick={load}>Refresh</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Tarehe / Saa</th>
                <th>User</th>
                <th>Action</th>
                <th>Entity</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    {a.created_at ? new Date(a.created_at).toLocaleString('sw-TZ') : '—'}
                  </td>
                  <td>{a.username || '—'}</td>
                  <td>
                    <span className="badge badge-green" style={{ fontSize: '0.7rem' }}>
                      {a.action}
                    </span>
                  </td>
                  <td className="muted" style={{ fontSize: '0.8rem' }}>
                    {a.entity_type || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && (
            <p className="muted" style={{ padding: 12 }}>Hakuna audit records bado.</p>
          )}
        </div>
      </div>
    </>
  );
}
