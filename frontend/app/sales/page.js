'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

export default function SalesPage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [crops, setCrops] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [useNewBuyer, setUseNewBuyer] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [form, setForm] = useState({
    buyerId: '', cropId: '', mode: 'DEBE',
    gunia: '', debeExtra: '', totalKg: '', pricePerUnit: '',
    millingCostPerKg: '', receivedAmount: '', dueDays: '7',
  });

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      const [sales, b, c] = await Promise.all([
        api('/sales'),
        api('/buyers'),
        api('/stock/crops'),
      ]);
      setList(sales);
      setBuyers(b);
      setCrops(c);
      if (b[0]) setForm((x) => ({ ...x, buyerId: b[0].id }));
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
      let buyerId = form.buyerId;

      if (useNewBuyer) {
        if (!newBuyerName.trim()) {
          setError('Andika jina la buyer');
          return;
        }
        const created = await api('/buyers', {
          method: 'POST',
          body: JSON.stringify({ name: newBuyerName.trim() }),
        });
        buyerId = created.id;
      }

      if (!buyerId) {
        setError('Chagua au andika jina la buyer');
        return;
      }

      const res = await api('/sales', {
        method: 'POST',
        body: JSON.stringify({
          buyerId,
          cropId: parseInt(form.cropId, 10),
          mode: form.mode,
          qtyDebe,
          totalKg: parseFloat(form.totalKg) || 0,
          pricePerUnit: parseFloat(form.pricePerUnit),
          millingCostPerKg: parseFloat(form.millingCostPerKg) || 0,
          receivedAmount: parseFloat(form.receivedAmount) || 0,
          dueDays: parseInt(form.dueDays, 10) || 7,
        }),
      });
      setMsg(res.message || 'Sale saved');
      setShowForm(false);
      setUseNewBuyer(false);
      setNewBuyerName('');
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
            <h1 className="section-title" style={{ marginBottom: 4 }}>Mauzo</h1>
            <p className="muted">Sales to buyers</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Funga' : '+ Mauzo mapya'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-info">{msg}</div>}

        {showForm && (
          <div className="card" style={{ marginBottom: 24 }}>
            <form onSubmit={submit}>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Buyer (Boss)</label>
                  <div style={{ marginBottom: 8 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' }}>
                      <input type="radio" checked={!useNewBuyer} onChange={() => setUseNewBuyer(false)} />
                      Chagua kutoka list
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer', marginTop: 4 }}>
                      <input type="radio" checked={useNewBuyer} onChange={() => setUseNewBuyer(true)} />
                      Andika jina jipya
                    </label>
                  </div>
                  {!useNewBuyer ? (
                    <select
                      value={form.buyerId}
                      onChange={(e) => setForm({ ...form, buyerId: e.target.value })}
                      style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                    >
                      <option value="">-- Chagua buyer --</option>
                      {buyers.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Jina la buyer"
                      value={newBuyerName}
                      onChange={(e) => setNewBuyerName(e.target.value)}
                      required
                    />
                  )}
                </div>
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
                  <label>Mode</label>
                  <select
                    value={form.mode}
                    onChange={(e) => setForm({ ...form, mode: e.target.value })}
                    style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  >
                    <option value="DEBE">Debe</option>
                    <option value="KG">Kilo</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Gunia</label>
                  <input type="number" value={form.gunia} onChange={(e) => setForm({ ...form, gunia: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Debe za ziada</label>
                  <input type="number" step="0.01" value={form.debeExtra} onChange={(e) => setForm({ ...form, debeExtra: e.target.value })} />
                </div>
                {form.mode === 'KG' && (
                  <div className="form-group">
                    <label>Jumla ya Kilo</label>
                    <input type="number" step="0.01" value={form.totalKg} onChange={(e) => setForm({ ...form, totalKg: e.target.value })} />
                  </div>
                )}
                <div className="form-group">
                  <label>Bei / Unit (Tsh)</label>
                  <input type="number" required value={form.pricePerUnit} onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} />
                </div>
                {form.mode === 'KG' && (
                  <div className="form-group">
                    <label>Gharama Koboa / Kilo</label>
                    <input type="number" value={form.millingCostPerKg} onChange={(e) => setForm({ ...form, millingCostPerKg: e.target.value })} />
                  </div>
                )}
                <div className="form-group">
                  <label>Amelipa (Tsh)</label>
                  <input type="number" value={form.receivedAmount} onChange={(e) => setForm({ ...form, receivedAmount: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Due days (kama deni)</label>
                  <select
                    value={form.dueDays}
                    onChange={(e) => setForm({ ...form, dueDays: e.target.value })}
                    style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                  >
                    <option value="7">7 siku</option>
                    <option value="14">14 siku</option>
                    <option value="30">30 siku</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Hifadhi Mauzo</button>
            </form>
          </div>
        )}

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Tarehe</th>
                <th>Buyer</th>
                <th>Zao</th>
                <th>Mode</th>
                <th>Jumla</th>
                <th>Deni</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr key={s.id}>
                  <td>{s.sale_code}</td>
                  <td>{s.date?.slice?.(0, 10) || s.date}</td>
                  <td>{s.buyer_name}</td>
                  <td>{s.crop_name}</td>
                  <td>{s.mode}</td>
                  <td>{formatMoney(s.total_amount)}</td>
                  <td>{formatMoney(s.balance)}</td>
                  <td>
                    <span className={`badge ${s.status === 'COMPLETED' ? 'badge-green' : s.status === 'PENDING' ? 'badge-yellow' : 'badge-red'}`}>
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="muted" style={{ padding: 12 }}>Hakuna mauzo bado.</p>}
        </div>
      </div>
    </>
  );
}
