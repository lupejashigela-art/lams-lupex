'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Nav from '../../components/Nav';
import { getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

export default function DealCalculatorPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    crop: 'Mahindi',
    gunia: '10',
    debeExtra: '0',
    buyPrice: '20000',
    transport: '1500',
    loading: '500',
    storage: '300',
    other: '200',
    sellPrice: '27000',
  });

  useEffect(() => {
    if (!getUser()) router.push('/login');
  }, []);

  const qty = (parseFloat(form.gunia) || 0) * 6 + (parseFloat(form.debeExtra) || 0);
  const buy = parseFloat(form.buyPrice) || 0;
  const transport = parseFloat(form.transport) || 0;
  const loading = parseFloat(form.loading) || 0;
  const storage = parseFloat(form.storage) || 0;
  const other = parseFloat(form.other) || 0;
  const sell = parseFloat(form.sellPrice) || 0;

  const landed = buy + transport + loading + storage + other;
  const profitPer = sell - landed;
  const margin = sell > 0 ? (profitPer / sell) * 100 : 0;
  const totalCapital = landed * qty;
  const totalSales = sell * qty;
  const totalProfit = profitPer * qty;

  let rating = 'RED - HIGH RISK';
  let ratingClass = 'red';
  if (margin >= 15) { rating = 'GREEN - GOOD DEAL'; ratingClass = 'green'; }
  else if (margin >= 8) { rating = 'YELLOW - ACCEPTABLE'; ratingClass = 'yellow'; }
  else if (margin > 0) { rating = 'ORANGE - LOW MARGIN'; ratingClass = 'yellow'; }

  return (
    <>
      <Nav />
      <div className="container">
        <h1 className="section-title">Deal Calculator</h1>
        <p className="muted" style={{ marginBottom: 20 }}>Hesabu kabla hujanunua mzigo</p>

        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ color: 'var(--text)', marginBottom: 16 }}>Ingiza bei</h3>
            <div className="form-group">
              <label>Zao</label>
              <select value={form.crop} onChange={(e) => setForm({ ...form, crop: e.target.value })}
                style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                <option>Mahindi</option>
                <option>Mpunga</option>
              </select>
            </div>
            <div className="grid grid-2">
              <div className="form-group">
                <label>Gunia</label>
                <input type="number" value={form.gunia} onChange={(e) => setForm({ ...form, gunia: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Debe (zaidi)</label>
                <input type="number" value={form.debeExtra} onChange={(e) => setForm({ ...form, debeExtra: e.target.value })} />
              </div>
            </div>
            <div className="form-group">
              <label>Bei kununua / Debe</label>
              <input type="number" value={form.buyPrice} onChange={(e) => setForm({ ...form, buyPrice: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Transport / Debe</label>
              <input type="number" value={form.transport} onChange={(e) => setForm({ ...form, transport: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Loading / Debe</label>
              <input type="number" value={form.loading} onChange={(e) => setForm({ ...form, loading: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Storage / Debe</label>
              <input type="number" value={form.storage} onChange={(e) => setForm({ ...form, storage: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Other / Debe</label>
              <input type="number" value={form.other} onChange={(e) => setForm({ ...form, other: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Bei unayotarajia kuuza / Debe</label>
              <input type="number" value={form.sellPrice} onChange={(e) => setForm({ ...form, sellPrice: e.target.value })} />
            </div>
          </div>

          <div className="card">
            <h3 style={{ color: 'var(--text)', marginBottom: 16 }}>Muhtasari – {form.crop}</h3>
            <p className="muted" style={{ marginBottom: 12 }}>Kiasi: {qty} Debe</p>
            <table className="table">
              <tbody>
                <tr><td>Buying price</td><td style={{ textAlign: 'right' }}>{formatMoney(buy)}</td></tr>
                <tr><td>Transport</td><td style={{ textAlign: 'right' }}>{formatMoney(transport)}</td></tr>
                <tr><td>Loading</td><td style={{ textAlign: 'right' }}>{formatMoney(loading)}</td></tr>
                <tr><td>Storage + Other</td><td style={{ textAlign: 'right' }}>{formatMoney(storage + other)}</td></tr>
                <tr><td><strong>LANDED COST</strong></td><td style={{ textAlign: 'right' }}><strong>{formatMoney(landed)}</strong></td></tr>
                <tr><td>Expected sell</td><td style={{ textAlign: 'right' }}>{formatMoney(sell)}</td></tr>
                <tr><td>Profit / Debe</td><td style={{ textAlign: 'right' }}>{formatMoney(profitPer)}</td></tr>
                <tr><td>Margin</td><td style={{ textAlign: 'right' }}>{margin.toFixed(1)}%</td></tr>
              </tbody>
            </table>
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
              <p>Total capital: <strong>{formatMoney(totalCapital)}</strong></p>
              <p>Expected sales: <strong>{formatMoney(totalSales)}</strong></p>
              <p>Expected profit: <strong className={totalProfit >= 0 ? 'value green' : 'value red'} style={{ fontSize: '1.2rem' }}>{formatMoney(totalProfit)}</strong></p>
            </div>
            <div style={{ marginTop: 20, padding: 14, borderRadius: 8, textAlign: 'center', fontWeight: 700,
              background: ratingClass === 'green' ? '#14532d55' : ratingClass === 'yellow' ? '#78350f55' : '#7f1d1d55',
              color: ratingClass === 'green' ? '#86efac' : ratingClass === 'yellow' ? '#fcd34d' : '#fca5a5' }}>
              {rating}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
