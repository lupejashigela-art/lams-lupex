'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

export default function SettingsPage() {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [crops, setCrops] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [limits, setLimits] = useState({ staffLimit: '', managerLimit: '', maxLossPct: '' });
  const [lock, setLock] = useState({
    cropId: '', minBuyPrice: '', maxBuyPrice: '', minSellPrice: '', maxSellPrice: '',
  });
  const [pwd, setPwd] = useState({ current: '', newPass: '', confirm: '' });
  const [pwdMsg, setPwdMsg] = useState('');
  const [pwdError, setPwdError] = useState('');
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoMsg, setLogoMsg] = useState('');
  const [logoError, setLogoError] = useState('');
  const [uploading, setUploading] = useState(false);

  const user = typeof window !== 'undefined' ? getUser() : null;
  const isOwner = user?.role === 'OWNER';

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      const [s, c] = await Promise.all([api('/settings'), api('/stock/crops')]);
      setData(s);
      setCrops(c);
      if (s.business) {
        setLimits({
          staffLimit: s.business.staff_limit || '',
          managerLimit: s.business.manager_limit || '',
          maxLossPct: s.business.max_loss_pct || '',
        });
        if (s.business.logo_image) setLogoPreview(s.business.logo_image);
      }
      if (c[0]) setLock((l) => ({ ...l, cropId: c[0].id }));
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveLimits(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      await api('/settings/limits', {
        method: 'PUT',
        body: JSON.stringify({
          staffLimit: parseFloat(limits.staffLimit),
          managerLimit: parseFloat(limits.managerLimit),
          maxLossPct: parseFloat(limits.maxLossPct),
        }),
      });
      setMsg('Limits zimehifadhiwa');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function saveLock(e) {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      await api('/settings/price-lock', {
        method: 'PUT',
        body: JSON.stringify({
          cropId: parseInt(lock.cropId, 10),
          minBuyPrice: parseFloat(lock.minBuyPrice),
          maxBuyPrice: parseFloat(lock.maxBuyPrice),
          minSellPrice: parseFloat(lock.minSellPrice),
          maxSellPrice: parseFloat(lock.maxSellPrice),
        }),
      });
      setMsg('Price lock imewekwa');
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function changePassword(e) {
    e.preventDefault();
    setPwdMsg('');
    setPwdError('');
    if (pwd.newPass !== pwd.confirm) {
      setPwdError('New password na confirm hazifanani');
      return;
    }
    if (pwd.newPass.length < 4) {
      setPwdError('Password mpya iwe angalau herufi 4');
      return;
    }
    try {
      await api('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({
          currentPassword: pwd.current,
          newPassword: pwd.newPass,
        }),
      });
      setPwdMsg('Password imebadilishwa kikamilifu');
      setPwd({ current: '', newPass: '', confirm: '' });
    } catch (err) {
      setPwdError(err.message);
    }
  }

  function handleLogoSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoError('');
    setLogoMsg('');

    if (!file.type.startsWith('image/')) {
      setLogoError('Chagua picha tu (JPG, PNG, n.k.)');
      return;
    }
    if (file.size > 400000) {
      setLogoError('Picha ni kubwa. Tumia picha chini ya 400KB');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setLogoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  }

  async function saveLogo(e) {
    e.preventDefault();
    if (!logoPreview) {
      setLogoError('Chagua picha kwanza');
      return;
    }
    setUploading(true);
    setLogoError('');
    setLogoMsg('');
    try {
      await api('/settings/logo', {
        method: 'PUT',
        body: JSON.stringify({ logoImage: logoPreview }),
      });
      setLogoMsg('Picha imehifadhiwa! Refresh ukurasa uione kwenye Nav.');
    } catch (err) {
      setLogoError(err.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <>
      <Nav />
      <div className="container">
        <h1 className="section-title">Settings</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          Approval limits · Price lock · Password · Logo
        </p>

        {error && <div className="alert alert-error">{error}</div>}
        {msg && <div className="alert alert-info">{msg}</div>}

        {isOwner && (
          <div className="card" style={{ marginBottom: 24, maxWidth: 480 }}>
            <h3 style={{ color: 'var(--text)', marginBottom: 16 }}>Picha ya Biashara (Logo)</h3>
            <p className="muted" style={{ marginBottom: 12, fontSize: '0.85rem' }}>
              Picha hii itaonekana kwa users wote juu kwenye menu.
            </p>
            {logoError && <div className="alert alert-error">{logoError}</div>}
            {logoMsg && <div className="alert alert-info">{logoMsg}</div>}
            <form onSubmit={saveLogo}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
                {logoPreview ? (
                  <img
                    src={logoPreview}
                    alt="Preview"
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      objectFit: 'cover',
                      border: '3px solid var(--primary, #22c55e)',
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: 'var(--border)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--muted)',
                      fontSize: '0.75rem',
                    }}
                  >
                    Hakuna
                  </div>
                )}
                <input type="file" accept="image/*" onChange={handleLogoSelect} />
              </div>
              <button type="submit" className="btn btn-primary" disabled={uploading || !logoPreview}>
                {uploading ? 'Inahifadhi...' : 'Hifadhi Picha'}
              </button>
            </form>
          </div>
        )}

        <div className="grid grid-2">
          <div className="card">
            <h3 style={{ color: 'var(--text)', marginBottom: 16 }}>Approval Limits</h3>
            <form onSubmit={saveLimits}>
              <div className="form-group">
                <label>Staff limit (Tsh)</label>
                <input type="number" value={limits.staffLimit}
                  onChange={(e) => setLimits({ ...limits, staffLimit: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Manager limit (Tsh)</label>
                <input type="number" value={limits.managerLimit}
                  onChange={(e) => setLimits({ ...limits, managerLimit: e.target.value })} />
              </div>
              <div className="form-group">
                <label>Max loss %</label>
                <input type="number" step="0.1" value={limits.maxLossPct}
                  onChange={(e) => setLimits({ ...limits, maxLossPct: e.target.value })} />
              </div>
              <button type="submit" className="btn btn-primary">Hifadhi Limits</button>
            </form>
          </div>

          <div className="card">
            <h3 style={{ color: 'var(--text)', marginBottom: 16 }}>Price Lock</h3>
            <form onSubmit={saveLock}>
              <div className="form-group">
                <label>Zao</label>
                <select value={lock.cropId} onChange={(e) => setLock({ ...lock, cropId: e.target.value })}
                  style={{ width: '100%', padding: 10, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}>
                  {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="grid grid-2">
                <div className="form-group">
                  <label>Min Buy</label>
                  <input type="number" required value={lock.minBuyPrice}
                    onChange={(e) => setLock({ ...lock, minBuyPrice: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Max Buy</label>
                  <input type="number" required value={lock.maxBuyPrice}
                    onChange={(e) => setLock({ ...lock, maxBuyPrice: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Min Sell</label>
                  <input type="number" required value={lock.minSellPrice}
                    onChange={(e) => setLock({ ...lock, minSellPrice: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Max Sell</label>
                  <input type="number" required value={lock.maxSellPrice}
                    onChange={(e) => setLock({ ...lock, maxSellPrice: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary">Hifadhi Price Lock</button>
            </form>
          </div>
        </div>

        <div className="card" style={{ marginTop: 24, maxWidth: 480 }}>
          <h3 style={{ color: 'var(--text)', marginBottom: 16 }}>Badilisha Password</h3>
          {pwdError && <div className="alert alert-error">{pwdError}</div>}
          {pwdMsg && <div className="alert alert-info">{pwdMsg}</div>}
          <form onSubmit={changePassword}>
            <div className="form-group">
              <label>Password ya sasa</label>
              <input type="password" required value={pwd.current}
                onChange={(e) => setPwd({ ...pwd, current: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Password mpya</label>
              <input type="password" required value={pwd.newPass}
                onChange={(e) => setPwd({ ...pwd, newPass: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Thibitisha password mpya</label>
              <input type="password" required value={pwd.confirm}
                onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
            </div>
            <button type="submit" className="btn btn-primary">Badilisha Password</button>
          </form>
        </div>
      </div>
    </>
  );
}
