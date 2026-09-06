'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

export default function ReportsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState('month');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load('month');
  }, []);

  async function load(type) {
    setPeriod(type);
    setLoading(true);
    setError('');
    try {
      setData(await api(`/reports/period?type=${type}`));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const labels = { week: 'Wiki (siku 7)', month: 'Mwezi huu', year: 'Mwaka huu' };

  return (
    <>
      <Nav />
      <div className="container">
        <h1 className="section-title">Ripoti</h1>
        <p className="muted" style={{ marginBottom: 16 }}>Period reports</p>

        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {['week', 'month', 'year'].map((t) => (
            <button
              key={t}
              className={period === t ? 'btn btn-primary' : 'btn btn-ghost'}
              onClick={() => load(t)}
              disabled={loading}
            >
              {labels[t]}
            </button>
          ))}
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {data && (
          <>
            <div className="grid grid-4" style={{ marginBottom: 24 }}>
              <div className="card">
                <h3>Mauzo</h3>
                <div className="value green">{formatMoney(data.sales?.total)}</div>
                <div className="muted">{data.sales?.count || 0} rekodi</div>
              </div>
              <div className="card">
                <h3>Manunuzi</h3>
                <div className="value">{formatMoney(data.purchases?.total)}</div>
                <div className="muted">{data.purchases?.count || 0} rekodi</div>
              </div>
              <div className="card">
                <h3>Gharama</h3>
                <div className="value">{formatMoney(data.expenses)}</div>
              </div>
              <div className="card">
                <h3>Faida (approx)</h3>
                <div className={`value ${data.profitApprox >= 0 ? 'green' : 'red'}`}>
                  {formatMoney(data.profitApprox)}
                </div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ color: 'var(--text)', marginBottom: 12 }}>Kwa Zao</h3>
              <table className="table">
                <thead>
                  <tr><th>Zao</th><th>Mauzo</th><th>Manunuzi</th><th>Tofauti</th></tr>
                </thead>
                <tbody>
                  {(data.byCrop || []).map((r) => (
                    <tr key={r.name}>
                      <td>{r.name}</td>
                      <td>{formatMoney(r.sales)}</td>
                      <td>{formatMoney(r.purchases)}</td>
                      <td>{formatMoney(parseFloat(r.sales) - parseFloat(r.purchases))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </>
  );
}
