'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

function formatDebe(qty) {
  const total = Math.round(Number(qty) || 0);
  const g = Math.floor(total / 6);
  const d = total % 6;
  if (g > 0 && d > 0) return `${g} Gunia na ${d} Debe`;
  if (g > 0) return `${g} Gunia`;
  return `${d} Debe`;
}

export default function StockPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [showCount, setShowCount] = useState(false);
  const [crops, setCrops] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [form, setForm] = useState({ cropId: '', warehouseId: '', physicalQtyDebe: '', reason: '', adjust: true });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      const [stock, c, w] = await Promise.all([
        api('/stock'),
        api('/stock/crops'),
        api('/stock/warehouses'),
      ]);
      setData(stock);
      setCrops(c);
      setWarehouses(w);
      if (c[0]) setForm((f) => ({ ...f, cropId: c[0].id }));
      if (w[0]) setForm((f) => ({ ...f, warehouseId: w[0].id }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submitCount(e) {
    e.preventDefault();
    setMsg('');
    try {
      const res = await api('/stock/physical-count', {
        method: 'POST',
        body: JSON.stringify({
          cropId: parseInt(form.cropId, 10),
          warehouseId: parseInt(form.warehouseId, 10),
          physicalQtyDebe: parseFloat(form.physicalQtyDebe),
          reason: form.reason,
          adjust: form.adjust,
        }),
      });
      setMsg(res.warning || 'Physical count recorded');
      setShowCount(false);
      load();
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <>
      <Nav />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 className="section-title" style={{ marginBottom: 4 }}>Stock</h1>
            <p className="muted">Inventory + Valuation</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCount(!showCount)}>
            Physical Count
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-info">{msg}</div>}

        {showCount && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ marginBottom: 16, color: 'var(--text)' }}>Physical Stock Count</h3>
            <form onSubmit={submitCount}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Zao</label>
                  <select
                    value={form.cropId}
                    onChange={(e) => setForm({ ...form, cropId: e.target.value })}
                    style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  >
                    {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Warehouse</label>
                  <select
                    value={form.warehouseId}
                    onChange={(e) => setForm({ ...form, warehouseId: e.target.value })}
                    style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  >
                    {warehouses.map((w) => <option key={w.id} value={w.id}>{w.code} – {w.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Physical Qty (Debe)</label>
                  <input type="number" step="0.01" required value={form.physicalQtyDebe}
                    onChange={(e) => setForm({ ...form, physicalQtyDebe: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Reason</label>
                  <input type="text" value={form.reason}
                    onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="Sababu ya tofauti" />
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.9rem' }}>
                <input type="checkbox" checked={form.adjust}
                  onChange={(e) => setForm({ ...form, adjust: e.target.checked })} />
                Sasisha system stock iwe physical
              </label>
              <button type="submit" className="btn btn-primary">Save Count</button>
            </form>
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-3" style={{ marginBottom: 24 }}>
              {(data.summary || []).map((s) => (
                <div className="card" key={s.crop}>
                  <h3>{s.crop}</h3>
                  <div className="value" style={{ fontSize: '1.3rem' }}>{formatDebe(s.qtyDebe)}</div>
                  <div className="muted" style={{ marginTop: 6 }}>Thamani: {formatMoney(s.value)}</div>
                </div>
              ))}
              <div className="card">
                <h3>Jumla Thamani</h3>
                <div className="value green">{formatMoney(data.totalValue)}</div>
              </div>
            </div>

            <div className="card">
              <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>Kwa Warehouse</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Zao</th>
                    <th>Warehouse</th>
                    <th>Kiasi</th>
                    <th>Avg Cost</th>
                    <th>Thamani</th>
                  </tr>
                </thead>
                <tbody>
                  {(data.details || []).filter((r) => parseFloat(r.qty_debe) > 0).map((r, i) => (
                    <tr key={i}>
                      <td>{r.crop}</td>
                      <td>{r.warehouse_code}</td>
                      <td>{formatDebe(r.qty_debe)}</td>
                      <td>{formatMoney(r.avg_cost)}/debe</td>
                      <td>{formatMoney(r.value)}</td>
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
