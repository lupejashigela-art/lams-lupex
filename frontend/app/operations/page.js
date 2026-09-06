'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

export default function OperationsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [pending, setPending] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getUser()) {
      router.push('/login');
      return;
    }
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [ops, approvals] = await Promise.all([
        api('/dashboard/operations'),
        api('/approvals/pending').catch(() => []),
      ]);
      setData(ops);
      setPending(Array.isArray(approvals) ? approvals : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function decide(id, decision) {
    try {
      await api(`/approvals/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision }),
      });
      load();
    } catch (err) {
      alert(err.message);
    }
  }

  return (
    <>
      <Nav />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 className="section-title" style={{ marginBottom: 4 }}>Operations Dashboard</h1>
            <p className="muted">Leo · {data?.date || '—'}</p>
          </div>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {data && (
          <div className="grid grid-2" style={{ marginBottom: 28 }}>
            <div className="card">
              <h3>Manunuzi ya Leo</h3>
              <div className="value">{data.purchases?.count || 0}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Jumla: {formatMoney(data.purchases?.total)}
              </div>
            </div>
            <div className="card">
              <h3>Mauzo ya Leo</h3>
              <div className="value green">{data.sales?.count || 0}</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Jumla: {formatMoney(data.sales?.total)}
              </div>
            </div>
          </div>
        )}

        <h2 style={{ fontSize: '0.95rem', color: 'var(--muted)', marginBottom: 12 }}>
          PENDING APPROVALS
        </h2>
        <div className="card">
          {pending.length === 0 ? (
            <p className="muted">Hakuna PENDING transactions.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Requested by</th>
                  <th>Required</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id}>
                    <td>{p.entity_type}</td>
                    <td>{formatMoney(p.amount)}</td>
                    <td>{p.requested_by_name}</td>
                    <td>
                      <span className="badge badge-yellow">{p.required_role}</span>
                    </td>
                    <td style={{ display: 'flex', gap: 8 }}>
                      <button
                        className="btn btn-primary"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => decide(p.id, 'APPROVED')}
                      >
                        Approve
                      </button>
                      <button
                        className="btn btn-ghost"
                        style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                        onClick={() => decide(p.id, 'REJECTED')}
                      >
                        Reject
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
