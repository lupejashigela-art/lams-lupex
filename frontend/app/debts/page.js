'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

export default function DebtsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      setData(await api('/debts'));
    } catch (err) {
      setError(err.message);
    }
  }

  const today = new Date().toISOString().slice(0, 10);

  return (
    <>
      <Nav />
      <div className="container">
        <h1 className="section-title">Madeni</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Debts overview</p>

        {error && <div className="alert alert-error">{error}</div>}

        {data && (
          <>
            <div className="grid grid-2" style={{ marginBottom: 28 }}>
              <div className="card">
                <h3>Tunadaiwa na Buyers</h3>
                <div className="value yellow">{formatMoney(data.buyersOweUs?.total)}</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {data.buyersOweUs?.count || 0} rekodi
                  {data.buyersOweUs?.overdueCount > 0 && (
                    <span className="badge badge-red" style={{ marginLeft: 8 }}>
                      {data.buyersOweUs.overdueCount} overdue
                    </span>
                  )}
                </div>
              </div>
              <div className="card">
                <h3>Tunadaiwa Wakulima</h3>
                <div className="value">{formatMoney(data.weOweFarmers?.total)}</div>
                <div className="muted" style={{ marginTop: 6 }}>
                  {data.weOweFarmers?.count || 0} rekodi
                </div>
              </div>
            </div>

            <h2 style={{ fontSize: '0.95rem', color: 'var(--muted)', marginBottom: 12 }}>
              BUYERS WANATODAIWA
            </h2>
            <div className="card" style={{ marginBottom: 24 }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th><th>Buyer</th><th>Zao</th><th>Deni</th><th>Due Date</th><th>Hali</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.buyersOweUs?.items || []).map((r) => {
                    const overdue = r.due_date && r.due_date < today;
                    return (
                      <tr key={r.id}>
                        <td>{r.sale_code}</td>
                        <td>{r.person_name}</td>
                        <td>{r.crop_name}</td>
                        <td>{formatMoney(r.balance)}</td>
                        <td>{r.due_date || '—'}</td>
                        <td>
                          {overdue
                            ? <span className="badge badge-red">OVERDUE</span>
                            : <span className="badge badge-yellow">OPEN</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {(data.buyersOweUs?.items || []).length === 0 && (
                <p className="muted" style={{ padding: 12 }}>Hakuna deni la buyers.</p>
              )}
            </div>

            <h2 style={{ fontSize: '0.95rem', color: 'var(--muted)', marginBottom: 12 }}>
              TUNADAIWA WAKULIMA
            </h2>
            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Code</th><th>Mkulima</th><th>Zao</th><th>Deni</th><th>Tarehe</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.weOweFarmers?.items || []).map((r) => (
                    <tr key={r.id}>
                      <td>{r.purchase_code}</td>
                      <td>{r.person_name}</td>
                      <td>{r.crop_name}</td>
                      <td>{formatMoney(r.balance)}</td>
                      <td>{r.date?.slice?.(0, 10) || r.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(data.weOweFarmers?.items || []).length === 0 && (
                <p className="muted" style={{ padding: 12 }}>Hakuna deni la wakulima.</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
