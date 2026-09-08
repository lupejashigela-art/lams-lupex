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
  const [useNewFarmer, setUseNewFarmer] = useState(false);
  const [newFarmerName, setNewFarmerName] = useState('');
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
      let farmerId = form.farmerId;

      if (useNewFarmer) {
        if (!newFarmerName.trim()) {
          setError('Andika jina la mkulima');
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
        return;
      }

      const res = await api('/purchases', {
        method: 'POST',
        body: JSON.stringify({
          farmerId,
          cropId: parseInt(form.cropId, 10),
          qtyDebe,
          pricePerDebe: parseFloat(form.pricePerDebe),
          transportCost: parseFloat(form.transportCost) || 0,
          loadingCost: parseFloat(form.loadingCost) || 0,

