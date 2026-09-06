'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

export default function PurchasesPage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [crops, setCrops] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    farmerId: '', cropId: '', gunia: '', debeExtra: '',
    pricePerDebe: '', transportCost: '', loadingCost: '', otherCost: '', paidAmount: '',
  });

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      const [purchases, f, c] = await Promise.all([
        api('/purchases'),
        api('/farmers'),
        api('/stock/crops'),
      ]);
      setList(purchases);
      setFarmers(f);
      setCrops(c);
      if (f[0]) setForm((x) => ({ ...x, farmerId: f[0].id }));
      if (c[0]) setForm((x) => ({ ...x, cropId: c[0].id }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    const qtyDebe = (parseFloat(form.gunia) || 0) * 6 + (parseFloat(form.debeExtra) || 0);
    try {
      const res = await api('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          farmerId: form.farmerId,
          cropId: parseInt(form.cropId, 10),
          qtyDebe,
          pricePerDebe: parseFloat(form.pricePerDebe),
          transportCost: parseFloat(form.transportCost) || 0,
          loadingCost: parseFloat(form.loadingCost) || 0,
          otherCost: parseFloat(form.otherCost) || 0,
          paidAmount: parseFloat(form.paidAmount) || 0,
        }),
      });
      setMsg(res.message || 'Purchase saved');
      setShowForm(false);
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Nav />
      <div className="container">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <h1 className="section-title" style={{ marginBottom: 4 }}>Manunuzi</h1>
            <p className="muted">Purchases from farmers</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            + Ongeza Manunuzi
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-info">{msg}</div>}

        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <form onSubmit={submit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Mkulima (Farmer)</label>
                  <select value={form.farmerId} onChange={(e) => setForm({ ...form, farmerId: e.target.value })}
                    style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }} required>
                    {farmers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Zao</label>
                  <select value={form.cropId} onChange={(e) => setForm({ ...form, cropId: e.target.value })}
                    style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                    {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Gunia</label>
                  <input type="number" step="1" value={form.gunia} onChange={(e) => setForm({ ...form, gunia: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Debe (zaidi)</label>
                  <input type="number" step="0.01" value={form.debeExtra} onChange={(e) => setForm({ ...form, debeExtra: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Bei / Debe (Tsh)</label>
                  <input type="number" required value={form.pricePerDebe} onChange={(e) => setForm({ ...form, pricePerDebe: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Usafiri</label>
                  <input type="number" value={form.transportCost} onChange={(e) => setForm({ ...form, transportCost: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Kupakia</label>
                  <input type="number" value={form.loadingCost} onChange={(e) => setForm({ ...form, loadingCost: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Nyingine</label>
                  <input type="number" value={form.otherCost} onChange={(e) => setForm({ ...form, otherCost: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Nimelipa (Tsh)</label>
                  <input type="number" value={form.paidAmount} onChange={(e) => setForm({ ...form, paidAmount: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Hifadhi Manunuzi</button>
            </form>
          </div>
        )}

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Tarehe</th>
                <th>Mkulima</th>
                <th>Zao</th>
                <th>Kiasi</th>
                <th>Jumla</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id}>
                  <td>{p.purchase_code}</td>
                  <td>{p.date?.slice?.(0, 10) || p.date}</td>
                  <td>{p.farmer_name}</td>
                  <td>{p.crop_name}</td>
                  <td>{Number(p.qty_debe).toFixed(0)} Debe</td>
                  <td>{formatMoney(p.total_cost)}</td>
                  <td>
                    <span className={`badge ${p.status === 'COMPLETED' ? 'badge-green' : p.status === 'PENDING' ? 'badge-yellow' : 'badge-red'}`}>
                      {p.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="muted" style={{ padding: 12 }}>Hakuna manunuzi bado.</p>}
        </div>
      </div>
    </>
  );
}
