'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

const emptyForm = {
  farmerId: '', cropId: '', gunia: '', debeExtra: '',
  pricePerDebe: '', transportCost: '', loadingCost: '', otherCost: '',
  payMode: 'full', paidAmount: '',
};

export default function PurchasesPage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [farmers, setFarmers] = useState([]);
  const [crops, setCrops] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [useNewFarmer, setUseNewFarmer] = useState(false);
  const [newFarmerName, setNewFarmerName] = useState('');
  const [form, setForm] = useState({ ...emptyForm });
  const [saving, setSaving] = useState(false);

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
    } catch (err) {
      setError(err.message);
    }
  }

  function resetForm() {
    setForm({ ...emptyForm });
    setUseNewFarmer(false);
    setNewFarmerName('');
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
    const qty = calcQty();
    const price = parseFloat(form.pricePerDebe) || 0;
    const transport = parseFloat(form.transportCost) || 0;
    const loading = parseFloat(form.loadingCost) || 0;
    const other = parseFloat(form.otherCost) || 0;
    return qty * price + transport + loading + other;
  }

  function getFarmerName() {
    if (useNewFarmer) return newFarmerName.trim();
    const f = farmers.find((x) => String(x.id) === String(form.farmerId));
    return f?.name || '—';
  }

  function getCropName() {
    const c = crops.find((x) => String(x.id) === String(form.cropId));
    return c?.name || '—';
  }

  function applyLastPrice(cropId) {
    const recent = list.find((p) => String(p.crop_id) === String(cropId));
    if (recent && recent.price_per_debe) {
      setForm((f) => ({ ...f, cropId, pricePerDebe: String(recent.price_per_debe) }));
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
      let farmerId = form.farmerId;
      if (useNewFarmer) {
        if (!newFarmerName.trim()) {
          setError('Andika jina la mkulima');
          setSaving(false);
          return;
        }
        const created = await api('/farmers', {
          method: 'POST',
          body: JSON.stringify({ name: newFarmerName.trim() }),
        });
        farmerId = created.id;
      }
      if (!farmerId) {
        setError('Chagua au andika jina la mkulima');
        setSaving(false);
        return;
      }
      const total = calcTotal();
      const paid = form.payMode === 'full' ? total : (parseFloat(form.paidAmount) || 0);
      await api('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          farmerId,
          cropId: parseInt(form.cropId, 10),
          qtyDebe: calcQty(),
          pricePerDebe: parseFloat(form.pricePerDebe),
          transportCost: parseFloat(form.transportCost) || 0,
          loadingCost: parseFloat(form.loadingCost) || 0,
          otherCost: parseFloat(form.otherCost) || 0,
          paidAmount: paid,
        }),
      });
      setMsg('Manunuzi yamehifadhiwa');
      setShowForm(false);
      resetForm();
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function statusLabel(p) {
    const balance = Number(p.balance ?? (Number(p.total_cost) - Number(p.paid_amount || 0)));
    if (balance > 0) return { text: 'INCOMPLETE', cls: 'badge-yellow' };
    return { text: 'COMPLETED', cls: 'badge-green' };
  }

  function canNext() {
    if (step === 1) return useNewFarmer ? newFarmerName.trim() : form.farmerId;
    if (step === 2) return form.cropId;
    if (step === 3) return calcQty() > 0;
    if (step === 4) return parseFloat(form.pricePerDebe) > 0;
    if (step === 5) {
      if (form.payMode === 'partial') return parseFloat(form.paidAmount) >= 0;
      return true;
    }
    return true;
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
          <button className="btn btn-primary" onClick={() => showForm ? (setShowForm(false), resetForm()) : openForm()}>
            {showForm ? 'Funga' : '+ Manunuzi mapya'}
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
                  <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>1. Mkulima</h3>
                  <div style={{ marginBottom: 12 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 6 }}>
                      <input type="radio" checked={!useNewFarmer} onChange={() => setUseNewFarmer(false)} />
                      Chagua kutoka list
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" checked={useNewFarmer} onChange={() => setUseNewFarmer(true)} />
                      Andika jina jipya
                    </label>
                  </div>
                  {!useNewFarmer ? (
                    <select value={form.farmerId} onChange={(e) => setForm({ ...form, farmerId: e.target.value })}
                      style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                      <option value="">-- Chagua mkulima --</option>
                      {farmers.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  ) : (
                    <input type="text" placeholder="Jina la mkulima" value={newFarmerName}
                      onChange={(e) => setNewFarmerName(e.target.value)} />
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
                  {form.pricePerDebe && (
                    <p className="muted" style={{ marginTop: 8 }}>Bei ya mwisho: {form.pricePerDebe} Tsh/debe</p>
                  )}
                </div>
              )}

              {step === 3 && (
                <div>
                  <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>3. Kiasi</h3>
                  <div className="form-group">
                    <label>Gunia</label>
                    <input type="number" step="1" value={form.gunia}
                      onChange={(e) => setForm({ ...form, gunia: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Debe za ziada</label>
                    <input type="number" step="0.01" value={form.debeExtra}
                      onChange={(e) => setForm({ ...form, debeExtra: e.target.value })} />
                  </div>
                  <p className="muted">Jumla: {calcQty().toFixed(1)} Debe</p>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>4. Bei na gharama</h3>
                  <div className="form-group">
                    <label>Bei / Debe (Tsh)</label>
                    <input type="number" required value={form.pricePerDebe}
                      onChange={(e) => setForm({ ...form, pricePerDebe: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Usafiri</label>
                    <input type="number" value={form.transportCost}
                      onChange={(e) => setForm({ ...form, transportCost: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Kupakia</label>
                    <input type="number" value={form.loadingCost}
                      onChange={(e) => setForm({ ...form, loadingCost: e.target.value })} />
                  </div>
                  <div className="form-group">
                    <label>Nyingine</label>
                    <input type="number" value={form.otherCost}
                      onChange={(e) => setForm({ ...form, otherCost: e.target.value })} />
                  </div>
                  <p className="muted">Jumla: {formatMoney(calcTotal())}</p>
                </div>
              )}

              {step === 5 && (
                <div>
                  <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>5. Malipo</h3>
                  <p style={{ marginBottom: 12 }}>
                    <strong>Jumla ya gharama:</strong> {formatMoney(calcTotal())}
                  </p>
                  <div style={{ marginBottom: 16 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', marginBottom: 10 }}>
                      <input type="radio" checked={form.payMode === 'full'}
                        onChange={() => setForm({ ...form, payMode: 'full', paidAmount: '' })} />
                      <span>Nmelipa yote ({formatMoney(calcTotal())})</span>
                    </label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="radio" checked={form.payMode === 'partial'}
                        onChange={() => setForm({ ...form, payMode: 'partial' })} />
                      <span>Nmelipa kiasi (deni / incomplete)</span>
                    </label>
                  </div>
                  {form.payMode === 'partial' && (
                    <div>
                      <div className="form-group">
                        <label>Kiasi nilicholipa (Tsh)</label>
                        <input type="number" required value={form.paidAmount}
                          onChange={(e) => setForm({ ...form, paidAmount: e.target.value })}
                          placeholder="Andika kiasi" />
                      </div>
                      <p style={{ marginTop: 8 }}>
                        <strong>Kilichobaki (deni):</strong>{' '}
                        <span style={{ color: '#eab308' }}>
                          {formatMoney(Math.max(0, calcTotal() - (parseFloat(form.paidAmount) || 0)))}
                        </span>
                      </p>
                    </div>
                  )}
                </div>
              )}

              {step === 6 && (
                <div>
                  <h3 style={{ marginBottom: 12, color: 'var(--text)' }}>6. Muhtasari – Thibitisha</h3>
                  <div style={{ background: 'var(--bg)', padding: 12, borderRadius: 8, fontSize: '0.9rem' }}>
                    <p><strong>Mkulima:</strong> {getFarmerName()}</p>
                    <p><strong>Zao:</strong> {getCropName()}</p>
                    <p><strong>Kiasi:</strong> {calcQty().toFixed(1)} Debe</p>
                    <p><strong>Bei/Debe:</strong> {form.pricePerDebe} Tsh</p>
                    <p><strong>Jumla:</strong> {formatMoney(calcTotal())}</p>
                    <p><strong>Malipo:</strong> {form.payMode === 'full' ? `Yote (${formatMoney(calcTotal())})` : formatMoney(form.paidAmount)}</p>
                    {form.payMode === 'partial' && (
                      <p style={{ color: '#eab308' }}>
                        <strong>Deni:</strong> {formatMoney(Math.max(0, calcTotal() - (parseFloat(form.paidAmount) || 0)))}
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
                    {saving ? 'Inahifadhi...' : 'Hifadhi Manunuzi'}
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
                <th>Mkulima</th>
                <th>Zao</th>
                <th>Kiasi</th>
                <th>Jumla</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const st = statusLabel(p);
                return (
                  <tr key={p.id}>
                    <td>{p.purchase_code}</td>
                    <td>{p.date?.slice?.(0, 10) || p.date}</td>
                    <td>{p.farmer_name}</td>
                    <td>{p.crop_name}</td>
                    <td>{Number(p.qty_debe).toFixed(0)} Debe</td>
                    <td>{formatMoney(p.total_cost)}</td>
                    <td><span className={`badge ${st.cls}`}>{st.text}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {list.length === 0 && <p className="muted" style={{ padding: 12 }}>Hakuna manunuzi bado.</p>}
        </div>
      </div>
    </>
  );
}
