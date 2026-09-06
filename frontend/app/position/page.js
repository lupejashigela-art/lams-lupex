'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

export default function PositionPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    api('/reports/business-position').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <Nav />
      <div className="container">
        <h1 className="section-title">Business Position</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Assets − Liabilities = Net Value</p>
        {error && <div className="alert alert-error">{error}</div>}
        {data && (
          <>
            <h2 style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 12 }}>ASSETS</h2>
            <div className="grid grid-4" style={{ marginBottom: 24 }}>
              <div className="card">
                <h3>Cash (approx)</h3>
                <div className="value">{formatMoney(data.assets?.cashApprox)}</div>
              </div>
              <div className="card">
                <h3>Stock Value</h3>
                <div className="value">{formatMoney(data.assets?.stockValue)}</div>
              </div>
              <div className="card">
                <h3>Receivables</h3>
                <div className="value yellow">{formatMoney(data.assets?.receivables)}</div>
              </div>
              <div className="card">
                <h3>Total Assets</h3>
                <div className="value green">{formatMoney(data.assets?.total)}</div>
              </div>
            </div>
            <h2 style={{ fontSize: '0.9rem', color: 'var(--muted)', marginBottom: 12 }}>LIABILITIES</h2>
            <div className="grid grid-2" style={{ marginBottom: 24 }}>
              <div className="card">
                <h3>Payables (Wakulima)</h3>
                <div className="value">{formatMoney(data.liabilities?.payables)}</div>
              </div>
              <div className="card">
                <h3>Total Liabilities</h3>
                <div className="value">{formatMoney(data.liabilities?.total)}</div>
              </div>
            </div>
            <div className="card">
              <h3>NET BUSINESS VALUE</h3>
              <div className={`value ${data.netBusinessValue >= 0 ? 'green' : 'red'}`} style={{ fontSize: '2rem' }}>
                {formatMoney(data.netBusinessValue)}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
