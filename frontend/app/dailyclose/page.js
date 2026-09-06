'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

export default function DailyClosePage() {
  const router = useRouter();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      setHistory(await api('/reports/daily-close/latest'));
    } catch (e) {
      /* ignore */
    }
  }

  async function runClose() {
    setLoading(true);
    setError('');
    setMsg('');
    try {
      const res = await api('/reports/daily-close', { method: 'POST', body: '{}' });
      setSummary(res.summary);
      setMsg(res.message);
      loadHistory();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Nav />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 className="section-title" style={{ marginBottom: 4 }}>Daily Close</h1>
            <p className="muted">Mwisho wa siku – summary + save</p>
          </div>
          <button className="btn btn-primary" onClick={runClose} disabled={loading}>
            {loading ? 'Inahifadhi...' : 'Run Daily Close'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-info">{msg}</div>}

        {summary && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ color: 'var(--text)', marginBottom: 12 }}>
              LUPEX · {summary.date}
            </h3>
            <div className="grid grid-2">
              <div>
                <p>Manunuzi: {summary.purchasesCount} · {formatMoney(summary.purchasesTotal)}</p>
                <p>Mauzo: {summary.salesCount} · {formatMoney(summary.salesTotal)}</p>
              </div>
              <div>
                <p>Cash received: {formatMoney(summary.cashReceived)}</p>
                <p>Cash paid: {formatMoney(summary.cashPaid)}</p>
                <p>Expenses: {formatMoney(summary.expenses)}</p>
                <p><strong>Net cash: {formatMoney(summary.netCash)}</strong></p>
              </div>
            </div>
            {summary.stock && (
              <div style={{ marginTop: 12 }} className="muted">
                Stock: {Object.entries(summary.stock).map(([k, v]) => `${k}: ${v} Debe`).join(' · ')}
              </div>
            )}
          </div>
        )}

        <h2 style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 12 }}>Historia</h2>
        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Tarehe</th><th>Mauzo</th><th>Manunuzi</th><th>Net Cash</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id}>
                  <td>{h.close_date?.slice?.(0, 10) || h.close_date}</td>
                  <td>{formatMoney(h.total_sales)}</td>
                  <td>{formatMoney(h.total_purchases)}</td>
                  <td>{formatMoney(h.net_cash)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {history.length === 0 && <p className="muted" style={{ padding: 12 }}>Hakuna daily close bado.</p>}
        </div>
      </div>
    </>
  );
}
