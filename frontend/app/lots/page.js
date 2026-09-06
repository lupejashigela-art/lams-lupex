'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Nav from '../../components/Nav';
import { api, getUser } from '../../lib/api';

function formatMoney(n) {
  return Number(n || 0).toLocaleString('en-TZ', { maximumFractionDigits: 0 }) + ' Tsh';
}

function formatDebe(qty) {
  const t = Math.round(Number(qty) || 0);
  const g = Math.floor(t / 6);
  const d = t % 6;
  if (g > 0 && d > 0) return `${g}G ${d}D`;
  if (g > 0) return `${g} Gunia`;
  return `${d} Debe`;
}

export default function LotsPage() {
  const router = useRouter();
  const [list, setList] = useState([]);
  const [detail, setDetail] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!getUser()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    try {
      setList(await api('/lots'));
    } catch (err) {
      setError(err.message);
    }
  }

  async function openLot(id) {
    try {
      setDetail(await api(`/lots/${id}`));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <Nav />
      <div className="container">
        <h1 className="section-title">Lots (Traceability)</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          Farmer → Purchase → Warehouse → Sale
        </p>

        {error && <div className="alert alert-error">{error}</div>}

        {detail && (
          <div className="card" style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <h3 style={{ color: 'var(--text)' }}>{detail.lot.lot_code}</h3>
              <button className="btn btn-ghost" onClick={() => setDetail(null)}>Funga</button>
            </div>
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              <div>
                <p><strong>Zao:</strong> {detail.lot.crop_name}</p>
                <p><strong>Mkulima:</strong> {detail.lot.farmer_name || '—'} {detail.lot.farmer_phone ? `(${detail.lot.farmer_phone})` : ''}</p>
                <p><strong>Warehouse:</strong> {detail.lot.warehouse_code || '—'}</p>
                <p><strong>Purchase:</strong> {detail.lot.purchase_code || '—'} · {formatMoney(detail.lot.total_cost)}</p>
              </div>
              <div>
                <p><strong>Initial:</strong> {formatDebe(detail.lot.initial_qty_debe)}</p>
                <p><strong>Current:</strong> {formatDebe(detail.lot.current_qty_debe)}</p>
                <p><strong>Avg cost:</strong> {formatMoney(detail.lot.avg_cost_per_debe)}/debe</p>
                <p><strong>Status:</strong> {detail.lot.status}</p>
              </div>
            </div>
            {(detail.sales || []).length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p className="muted">Sales from this lot:</p>
                {detail.sales.map((s) => (
                  <div key={s.sale_code} className="muted" style={{ fontSize: '0.85rem' }}>
                    {s.sale_code} · {s.buyer_name} · {formatDebe(s.qty_debe)} · {formatMoney(s.total_amount)}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="card">
          <table className="table">
            <thead>
              <tr>
                <th>Lot</th><th>Zao</th><th>Mkulima</th><th>Warehouse</th>
                <th>Initial</th><th>Current</th><th>Status</th><th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id}>
                  <td>{l.lot_code}</td>
                  <td>{l.crop_name}</td>
                  <td>{l.farmer_name || '—'}</td>
                  <td>{l.warehouse_code || '—'}</td>
                  <td>{formatDebe(l.initial_qty_debe)}</td>
                  <td>{formatDebe(l.current_qty_debe)}</td>
                  <td>
                    <span className={`badge ${l.status === 'ACTIVE' ? 'badge-green' : 'badge-yellow'}`}>
                      {l.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-ghost" style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                      onClick={() => openLot(l.id)}>
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 && <p className="muted" style={{ padding: 12 }}>Hakuna lots bado. Ongeza manunuzi kwanza.</p>}
        </div>
      </div>
    </>
  );
}
