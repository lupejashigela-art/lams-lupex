'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

function formatDebe(qty) {
  const total = Math.round(Number(qty) || 0);
  const gunia = Math.floor(total / 6);
  const debe = total % 6;
  if (gunia > 0 && debe > 0) return `${gunia} Gunia na ${debe} Debe`;
  if (gunia > 0) return `${gunia} Gunia`;
  return `${debe} Debe`;
}

function formatPct(n) {
  if (n == null || isNaN(n)) return '—';
  const sign = n > 0 ? '+' : '';
  return `${sign}${Number(n).toFixed(1)}%`;
}

export default function OwnerDashboard() {
  const router = useRouter();
  const [owner, setOwner] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [reminders, setReminders] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const [o, k, r] = await Promise.all([
        api('/dashboard/owner'),
        api('/reports/kpi').catch(() => null),
        api('/reports/upcoming-payments').catch(() => null),
      ]);
      setOwner(o);
      setKpi(k);
      setReminders(r);
    } catch (err) {
      setError(err.message);
      if (err.message.includes('Token') || err.message.includes('401')) router.push('/login');
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
            <h1 className="section-title" style={{ marginBottom: 4 }}>Owner Dashboard</h1>
            <p className="muted">MR_LUPEX99 · Big picture</p>
          </div>
          <button className="btn btn-ghost" onClick={load} disabled={loading}>
            {loading ? '...' : 'Refresh'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}

        {/* Critical alerts */}
        {reminders && reminders.overdueCount > 0 && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <strong>{reminders.overdueCount} OVERDUE</strong> – {formatMoney(reminders.overdueTotal)} ·{' '}
            <Link href="/reminders">Angalia Reminders →</Link>
          </div>
        )}
        {owner?.alerts?.pendingApprovals > 0 && (
          <div className="alert alert-info" style={{ marginBottom: 16 }}>
            <strong>{owner.alerts.pendingApprovals} PENDING</strong> approvals ·{' '}
            <Link href="/operations">Ops →</Link>
          </div>
        )}

        {owner && (
          <>
            <h2 style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 10 }}>FEDHA</h2>
            <div className="grid grid-4" style={{ marginBottom: 24 }}>
              <div className="card">
                <h3>Revenue</h3>
                <div className="value">{formatMoney(owner.money?.revenue)}</div>
              </div>
              <div className="card">
                <h3>Net Profit</h3>
                <div className={`value ${owner.money?.netProfit >= 0 ? 'green' : 'red'}`}>
                  {formatMoney(owner.money?.netProfit)}
                </div>
              </div>
              <div className="card">
                <h3>Receivables</h3>
                <div className="value yellow">{formatMoney(owner.money?.receivables)}</div>
              </div>
              <div className="card">
                <h3>Payables</h3>
                <div className="value">{formatMoney(owner.money?.payables)}</div>
              </div>
            </div>

            {kpi && (
              <>
                <h2 style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 10 }}>
                  KPI MWEZI · <Link href="/kpi" style={{ fontSize: '0.8rem' }}>details →</Link>
                </h2>
                <div className="grid grid-4" style={{ marginBottom: 24 }}>
                  <div className="card">
                    <h3>Sales (mwezi)</h3>
                    <div className="value green" style={{ fontSize: '1.3rem' }}>{formatMoney(kpi.salesThisMonth)}</div>
                  </div>
                  <div className="card">
                    <h3>Growth</h3>
                    <div className={`value ${kpi.salesGrowthPct >= 0 ? 'green' : 'red'}`} style={{ fontSize: '1.3rem' }}>
                      {formatPct(kpi.salesGrowthPct)}
                    </div>
                  </div>
                  <div className="card">
                    <h3>Margin</h3>
                    <div className="value" style={{ fontSize: '1.3rem' }}>{formatPct(kpi.grossMarginPct)}</div>
                  </div>
                  <div className="card">
                    <h3>Collection Days</h3>
                    <div className="value" style={{ fontSize: '1.3rem' }}>{kpi.avgCollectionDays}d</div>
                  </div>
                </div>
              </>
            )}

            <h2 style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 10 }}>
              STOCK · <Link href="/stock" style={{ fontSize: '0.8rem' }}>details →</Link>
            </h2>
            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              {(owner.stock?.items || []).map((item) => (
                <div className="card" key={item.crop}>
                  <h3>{item.crop}</h3>
                  <div className="value" style={{ fontSize: '1.2rem' }}>{formatDebe(item.qtyDebe)}</div>
                  <div className="muted" style={{ marginTop: 4 }}>{formatMoney(item.value)}</div>
                </div>
              ))}
              <div className="card">
                <h3>Jumla Thamani</h3>
                <div className="value green">{formatMoney(owner.stock?.totalValue)}</div>
              </div>
            </div>

            <h2 style={{ fontSize: '0.85rem', color: 'var(--muted)', marginBottom: 10 }}>HARAKA</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              <Link href="/purchases" className="btn btn-ghost">+ Manunuzi</Link>
              <Link href="/sales" className="btn btn-ghost">+ Mauzo</Link>
              <Link href="/reminders" className="btn btn-ghost">Reminders</Link>
              <Link href="/dailyclose" className="btn btn-ghost">Daily Close</Link>
              <Link href="/deal" className="btn btn-ghost">Deal Calc</Link>
              <Link href="/position" className="btn btn-ghost">Position</Link>
            </div>
          </>
        )}

        {!owner && !error && loading && <p className="muted">Inapakia...</p>}
      </div>
    </>
  );
}
