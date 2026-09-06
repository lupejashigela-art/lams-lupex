'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

function formatPct(n) {
  if (n == null || isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)}%`;
}

export default function KpiPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    api('/reports/kpi').then(setData).catch((e) => setError(e.message));
  }, []);

  return (
    <>
      <Nav />
      <div className="container">
        <h1 className="section-title">KPI</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Mwezi huu vs mwezi uliopita</p>

        {error && <div className="alert alert-error">{error}</div>}

        {data && (
          <>
            <div className="grid grid-4" style={{ marginBottom: 24 }}>
              <div className="card">
                <h3>Sales (mwezi huu)</h3>
                <div className="value green">{formatMoney(data.salesThisMonth)}</div>
                <div className="muted">{data.salesCountThisMonth} mauzo</div>
              </div>
              <div className="card">
                <h3>Sales (mwezi uliopita)</h3>
                <div className="value">{formatMoney(data.salesLastMonth)}</div>
              </div>
              <div className="card">
                <h3>Growth</h3>
                <div className={`value ${data.salesGrowthPct >= 0 ? 'green' : 'red'}`}>
                  {formatPct(data.salesGrowthPct)}
                </div>
              </div>
              <div className="card">
                <h3>Net Profit (mwezi)</h3>
                <div className={`value ${data.netProfitThisMonth >= 0 ? 'green' : 'red'}`}>
                  {formatMoney(data.netProfitThisMonth)}
                </div>
              </div>
            </div>

            <div className="grid grid-4" style={{ marginBottom: 24 }}>
              <div className="card">
                <h3>Gross Margin</h3>
                <div className="value">{formatPct(data.grossMarginPct)}</div>
              </div>
              <div className="card">
                <h3>Receivables</h3>
                <div className="value yellow">{formatMoney(data.receivables)}</div>
              </div>
              <div className="card">
                <h3>Avg Collection Days</h3>
                <div className="value">{data.avgCollectionDays} siku</div>
              </div>
              <div className="card">
                <h3>Payables</h3>
                <div className="value">{formatMoney(data.payables)}</div>
              </div>
            </div>

            <div className="grid grid-3">
              <div className="card">
                <h3>Purchases (mwezi)</h3>
                <div className="value">{formatMoney(data.purchasesThisMonth)}</div>
              </div>
              <div className="card">
                <h3>Expenses (mwezi)</h3>
                <div className="value">{formatMoney(data.expensesThisMonth)}</div>
              </div>
              <div className="card">
                <h3>Stock Value</h3>
                <div className="value green">{formatMoney(data.stockValue)}</div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
