'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

const emptyForm = {
  buyerId: '', cropId: '', mode: 'DEBE',
  gunia: '', debeExtra: '', totalKg: '', pricePerUnit: '',
  millingCostPerKg: '', payMode: 'full', receivedAmount: '', dueDays: '7',
};

export default function SalesPage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [buyers, setBuyers] = useState([]);
  const [crops, setCrops] = useState([]);
  const [stock, setStock] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [useNewBuyer, setUseNewBuyer] = useState(false);
  const [newBuyerName, setNewBuyerName] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      const [sales, b, c, s] = await Promise.all([
        api('/sales'),
        api('/buyers'),
        api('/stock/crops'),
        api('/stock'),
      ]);
      setList(sales);
      setBuyers(b);
      setCrops(c);
      setStock(s.byCrop || s || []);
    } catch (err) {
      setError(err.message);
    }
  }

  function resetForm() {
    setForm({ ...emptyForm });
    setUseNewBuyer(false);
    setNewBuyerName('');
    setStep(1);
  }

  function openForm() {
    resetForm();
    setShowForm(true);
    setError('');
    setMsg('');
  }

  function calcQty() {
    return (parseFloat(form.gunia) || 0) * 6 + (parseFloat(form.debeExtra) || 0);
  }

  function calcTotal() {
    const price = parseFloat(form.pricePerUnit) || 0;
    if (form.mode === 'KG') {
      return (parseFloat(form.totalKg) || 0) * price;
    }
    return calcQty() * price;
  }

  function getStockForCrop(cropId) {
    const arr = Array.isArray(stock) ? stock : [];
    const item = arr.find((x) => String(x.cropId) === String(cropId) || String(x.crop_id) === String(cropId));
    return item ? Number(item.qtyDebe || item.qty_debe || 0) : 0;
  }

  function getBuyerName() {
    if (useNewBuyer) return newBuyerName.trim();
    const b = buyers.find((x) => String(x.id) === String(form.buyerId));
    return b?.name || '—';
  }

  function getCropName() {
    const c = crops.find((x) => String(x.id) === String(form.cropId));
    return c?.name || '—';
  }

  function applyLastPrice(cropId) {
    const recent = list.find((s) => String(s.crop_id) === String(cropId));
    if (recent && recent.price_per_unit) {
      setForm((f) => ({ ...f, cropId, pricePerUnit: String(recent.price_per_unit) }));
    } else {
      setForm((f) => ({ ...f, cropId }));
    }
  }

  async function submit(e) {
    e.preventDefault();
    setError('');
    setMsg('');
    setSaving(true);

    try {
      let buyerId = form.buyerId;

      if (useNewBuyer) {
        if (!newBuyerName.trim()) {
          setError('Andika jina la buyer');
          setSaving(false);
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
        setSaving(false);
        return;
      }

      // Stock check
      const available = getStockForCrop(form.cropId);
      const need = form.mode === 'KG' ? (parseFloat(form.totalKg) || 0) / 15 : calcQty();
      if (available < need && available >= 0) {
        const ok = window.confirm(
          `Stock ina debe ~${available.toFixed(0)} tu. Unajaribu kuuza zaidi. Endelea hata hivyo?`
        );
        if (!ok) {
          setSaving(false);
          return;
        }
      }

      const total = calcTotal();
      const received = form.payMode === 'full' ? total : (parseFloat(form.receivedAmount) || 0);

      const res = await api('/sales', {
        method: 'POST',
        body: JSON.stringify({
          buyerId,
          cropId: parseInt(form.cropId, 10),
          mode: form.mode,
          qtyDebe: calcQty(),
          totalKg: parseFloat(form.totalKg) || 0,
          pricePerUnit: parseFloat(form.pricePerUnit),
          millingCostPerKg: parseFloat(form.millingCostPerKg) || 0,
          receivedAmount: received,
          dueDays: parseInt(form.dueDays, 10) || 7,
        }),
      });
      setMsg(res.message || 'Mauzo yamehifadhiwa');
      setShowForm(false);
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function statusLabel(s) {
    const balance = Number(s.balance ?? 0);
    if (balance > 0) return { text: 'INCOMPLETE', cls: 'badge-yellow' };
    return { text: 'COMPLETED', cls: 'badge-green' };
  }

  function canNext() {
    if (step === 1) return useNewBuyer ? newBuyerName.trim() : form.buyerId;
    if (step === 2) return form.cropId;
    if (step === 3) return form.mode === 'KG' ? parseFloat(form.totalKg) > 0 : calcQty() > 0;
    if (step === 4) return parseFloat(form.pricePerUnit) > 0;
    return true;
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
          <button className="btn btn-primary" onClick={() => showForm ? (setShowForm(false), resetForm()) : openForm()}>
            {showForm ? 'Funga' : '+ Mauzo mapya'}
          </button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-info">{msg}</div>}

        {showForm && (
          <div className="card" style={{ marginBottom: 24, maxWidth: 520 }}>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <div key={s} style={{
                  flex: 1, height: 4, borderRadius: 2,
                  background: step >= s ? 'var(--primary, #22c55e)' : 'var(--border)',
                }} />
              ))}
            </div>
            <p className="muted" style={{ marginBottom: 16, fontSize: '0.85rem' }}>Hatua {step} / 6</p>

            <form onSubmit={submit}>
              {step === 1 && (
                <div>
                  <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>1. Buyer / Mteja</h3>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
                      <input type="radio" checked={!useNewBuyer} onChange={() => setUseNewBuyer(false)} />
                      Chagua kutoka list
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" checked={useNewBuyer} onChange={() => setUseNewBuyer(true)} />
                      Andika jina jipya
                    </label>
                  </div>
                  {!useNewBuyer ? (
                    <select value={form.buyerId} onChange={(e) => setForm({ ...form, buyerId: e.target.value })}
                      style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                      <option value="">-- Chagua buyer --</option>
                      {buyers.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  ) : (
                    <input type="text" placeholder="Jina la buyer" value={newBuyerName}
                      onChange={(e) => setNewBuyerName(e.target.value)} />
                  )}
                </div>
              )}

              {step === 2 && (
                <div>
                  <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>2. Zao</h3>
                  <select value={form.cropId} onChange={(e) => applyLastPrice(e.target.value)}
                    style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                    <option value="">-- Chagua zao --</option>
                    {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  {form.cropId && (
                    <p className="muted" style={{ marginTop: 8 }}>
                      Stock: ~{getStockForCrop(form.cropId).toFixed(0)} Debe
                    </p>
                  )}
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>3. Mode na Kiasi</h3>
                  <div className="form-group">
                    <label>Mode</label>
                    <select value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}
                      style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                      <option value="DEBE">Debe</option>
                      <option value="KG">Kilo</option>
                    </select>
                  </div>
                  {form.mode === 'DEBE' ? (
                    <>
                      <div className="form-group">
                        <label>Gunia</label>
                        <input type="number" value={form.gunia}
                          onChange={(e) => setForm({ ...form, gunia: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Debe za ziada</label>
                        <input type="number" step="0.01" value={form.debeExtra}
                          onChange={(e) => setForm({ ...form, debeExtra: e.target.value })} />
                      </div>
                      <p className="muted">Jumla: {calcQty().toFixed(1)} Debe</p>
                    </>
                  ) : (
                    <div className="form-group">
                      <label>Jumla ya Kilo</label>
                      <input type="number" step="0.01" value={form.totalKg}
                        onChange={(e) => setForm({ ...form, totalKg: e.target.value })} />
                    </div>
                  )}
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>4. Bei</h3>
                  <div className="form-group">
                    <label>Bei / Unit (Tsh)</label>
                    <input type="number" required value={form.pricePerUnit}
                      onChange={(e) => setForm({ ...form, pricePerUnit: e.target.value })} />
                  </div>
                  {form.mode === 'KG' && (
                    <div className="form-group">
                      <label>Gharama Koboa / Kilo</label>
                      <input type="number" value={form.millingCostPerKg}
                        onChange={(e) => setForm({ ...form, millingCostPerKg: e.target.value })} />
                    </div>
                  )}
                  <p className="muted">Jumla: {formatMoney(calcTotal())}</p>
                </div>
              )}

              {step === 5 && (
                <div>
                  <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>5. Malipo</h3>
                  <p className="muted" style={{ marginBottom: 12 }}>Jumla: {formatMoney(calcTotal())}</p>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 8 }}>
                      <input type="radio" checked={form.payMode === 'full'}
                        onChange={() => setForm({ ...form, payMode: 'full', receivedAmount: '' })} />
                      Amelipa yote
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" checked={form.payMode === 'partial'}
                        onChange={() => setForm({ ...form, payMode: 'partial' })} />
                      Amelipa kiasi
                    </label>
                  </div>
                  {form.payMode === 'partial' && (
                    <>
                      <div className="form-group">
                        <label>Kiasi alicholipa (Tsh)</label>
                        <input type="number" required value={form.receivedAmount}
                          onChange={(e) => setForm({ ...form, receivedAmount: e.target.value })} />
                      </div>
                      <div className="form-group">
                        <label>Due days (siku za deni)</label>
                        <select value={form.dueDays}
                          onChange={(e) => setForm({ ...form, dueDays: e.target.value })}
                          style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                          <option value="7">7 siku</option>
                          <option value="14">14 siku</option>
                          <option value="30">30 siku</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 6 && (
                <div>
                  <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>6. Muhtasari – Thibitisha</h3>
                  <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, fontSize: '0.9rem' }}>
                    <p><strong>Buyer:</strong> {getBuyerName()}</p>
                    <p><strong>Zao:</strong> {getCropName()}</p>
                    <p><strong>Mode:</strong> {form.mode}</p>
                    <p><strong>Kiasi:</strong> {form.mode === 'KG' ? `${form.totalKg} Kg` : `${calcQty().toFixed(1)} Debe`}</p>
                    <p><strong>Bei:</strong> {form.pricePerUnit} Tsh</p>
                    <p><strong>Jumla:</strong> {formatMoney(calcTotal())}</p>
                    <p><strong>Malipo:</strong> {form.payMode === 'full' ? 'Yote' : formatMoney(form.receivedAmount)}</p>
                    {form.payMode === 'partial' && (
                      <p style={{ color: '#eab308' }}>
                        <strong>Deni:</strong> {formatMoney(calcTotal() - (parseFloat(form.receivedAmount) || 0))}
                      </p>
                    )}
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                {step > 1 && (
                  <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>Nyuma</button>
                )}
                {step < 6 ? (
                  <button type="button" className="btn btn-primary" disabled={!canNext()}
                    onClick={() => setStep(step + 1)}>Endelea</button>
                ) : (
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Inahifadhi...' : 'Hifadhi Mauzo'}
                  </button>
                )}
              </div>
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
              {list.map((s) => {
                const st = statusLabel(s);
                return (
                  <tr key={s.id}>
                    <td>{s.sale_code}</td>
                    <td>{s.date?.slice?.(0, 10) || s.date}</td>
                    <td>{s.buyer_name}</td>
                    <td>{s.crop_name}</td>
                    <td>{s.mode}</td>
                    <td>{formatMoney(s.total_amount)}</td>
                    <td>{formatMoney(s.balance)}</td>
                    <td><span className={`badge ${st.cls}`}>{st.text}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <p className="muted" style={{ padding: 12 }}>Hakuna mauzo bado.</p>}
        </div>
      </div>
    </>
  );
}
