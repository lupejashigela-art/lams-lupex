'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

const urgencyBadge = {
  OVERDUE: 'badge-red',
  TODAY: 'badge-red',
  SOON: 'badge-yellow',
  THIS_WEEK: 'badge-yellow',
  NO_DUE_DATE: 'badge-green',
  LATER: 'badge-green',
};

export default function RemindersPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    api('/reports/upcoming-payments').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <Nav />
      <div className="container">
        <h1 className="section-title">Reminders</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Malipo yanayokuja (siku 7) + overdue</p>

        {error && <div className="alert alert-error">{error}</div>}

        {data && (
          <>
            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              <div className="card">
                <h3>Jumla inayotarajiwa</h3>
                <div className="value yellow">{formatMoney(data.total)}</div>
                <div className="muted">{data.count} malipo</div>
              </div>
              <div className="card">
                <h3>Overdue</h3>
                <div className="value red">{formatMoney(data.overdueTotal)}</div>
                <div className="muted">{data.overdueCount} buyers</div>
              </div>
              <div className="card">
                <h3>Ndani ya wiki</h3>
                <div className="value">{data.count - data.overdueCount}</div>
              </div>
            </div>

            <div className="card">
              <table className="table">
                <thead>
                  <tr>
                    <th>Buyer</th><th>Simu</th><th>Code</th><th>Deni</th>
                    <th>Due</th><th>Hali</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.items || []).map((r) => (
                    <tr key={r.id}>
                      <td>{r.buyer_name}</td>
                      <td>
                        {r.phone ? (
                          <a href={`tel:${r.phone}`} style={{ color: 'var(--primary)' }}>{r.phone}</a>
                        ) : '—'}
                      </td>
                      <td>{r.sale_code}</td>
                      <td>{formatMoney(r.balance)}</td>
                      <td>{r.due_date || '—'}</td>
                      <td>
                        <span className={`badge ${urgencyBadge[r.urgency] || 'badge-green'}`}>
                          {r.urgency === 'OVERDUE'
                            ? `OVERDUE ${Math.abs(r.days_until || 0)}d`
                            : r.urgency === 'TODAY'
                              ? 'LEO'
                              : r.urgency === 'SOON'
                                ? `${r.days_until}d`
                                : r.urgency}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(data.items || []).length === 0 && (
                <p className="muted" style={{ padding: 12 }}>Hakuna malipo yanayokuja wiki hii.</p>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
