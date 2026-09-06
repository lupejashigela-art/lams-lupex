'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { getUser, clearAuth } from '../lib/api';
import { useEffect, useState } from 'react';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  function logout() {
    clearAuth();
    router.push('/login');
  }

  const links = [
    { href: '/dashboard', label: 'Owner' },
    { href: '/kpi', label: 'KPI' },
    { href: '/operations', label: 'Ops' },
    { href: '/purchases', label: 'Manunuzi' },
    { href: '/sales', label: 'Mauzo' },
    { href: '/stock', label: 'Stock' },
    { href: '/lots', label: 'Lots' },
    { href: '/debts', label: 'Madeni' },
    { href: '/reminders', label: 'Reminders' },
    { href: '/expenses', label: 'Gharama' },
    { href: '/cashflow', label: 'Cash' },
    { href: '/position', label: 'Position' },
    { href: '/reports', label: 'Ripoti' },
    { href: '/dailyclose', label: 'Daily' },
    { href: '/farmers', label: 'Wakulima' },
    { href: '/buyers', label: 'Buyers' },
    { href: '/payments', label: 'Malipo' },
    { href: '/deal', label: 'Deal' },
    { href: '/audit', label: 'Audit' },
    { href: '/settings', label: 'Settings' },
  ];

  return (
    <nav className="nav" style={{ flexWrap: 'wrap', gap: 2 }}>
      <div className="nav-brand" style={{ fontSize: '0.8rem' }}>
        <span>LAMS</span> · MR_LUPEX99
      </div>
      <div className="nav-links" style={{ flexWrap: 'wrap' }}>
        {links.map((l) => (
          <Link key={l.href} href={l.href} className={pathname === l.href ? 'active' : ''}
            style={{ fontSize: '0.7rem', padding: '2px 5px' }}>
            {l.label}
          </Link>
        ))}
        {user && <span className="muted" style={{ fontSize: '0.65rem' }}>{user.username}</span>}
        <button className="btn btn-ghost" style={{ padding: '2px 5px', fontSize: '0.65rem' }} onClick={logout}>
          Out
        </button>
      </div>
    </nav>
  );
}
