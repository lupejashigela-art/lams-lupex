'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

export default function CashFlowPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    api('/reports/cash-flow').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <Nav />
      <div className="container">
        <h1 className="section-title">Cash Flow</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Revenue vs Cash vs Debts</p>
        {error && <div className="alert alert-error">{error}</div>}
        {data && (
          <>
            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              <div className="card">
                <h3>Sales Revenue</h3>
                <div className="value">{formatMoney(data.revenue)}</div>
              </div>
              <div className="card">
                <h3>Cash Received</h3>
                <div className="value green">{formatMoney(data.cashReceived)}</div>
              </div>
              <div className="card">
                <h3>Customer Debt</h3>
                <div className="value yellow">{formatMoney(data.receivables)}</div>
              </div>
            </div>
            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              <div className="card">
                <h3>Purchases</h3>
                <div className="value">{formatMoney(data.totalPurchases)}</div>
              </div>
              <div className="card">
                <h3>Cash Paid</h3>
                <div className="value">{formatMoney(data.cashPaid)}</div>
              </div>
              <div className="card">
                <h3>Supplier Debt</h3>
                <div className="value">{formatMoney(data.payables)}</div>
              </div>
            </div>
            <div className="grid grid-2">
              <div className="card">
                <h3>Expenses</h3>
                <div className="value">{formatMoney(data.expenses)}</div>
              </div>
              <div className="card">
                <h3>Net Cash</h3>
                <div className={`value ${data.netCash >= 0 ? 'green' : 'red'}`}>
                  {formatMoney(data.netCash)}
                </div>
              </div>
            </div>
            <p className="muted" style={{ marginTop: 16 }}>{data.note}</p>
          </>
        )}
      </div>
    </>
  );
}
