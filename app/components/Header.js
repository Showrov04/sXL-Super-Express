'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Header() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Read user from localStorage (set by login page later)
    try {
      const stored = localStorage.getItem('sxl_user');
      if (stored) setUser(JSON.parse(stored));
    } catch (e) { /* ignore */ }

    // Listen for login/logout events
    function onAuthChange() {
      try {
        const stored = localStorage.getItem('sxl_user');
        setUser(stored ? JSON.parse(stored) : null);
      } catch (e) { /* ignore */ }
    }
    window.addEventListener('sxl-auth-change', onAuthChange);
    return () => window.removeEventListener('sxl-auth-change', onAuthChange);
  }, []);

  function logout() {
    localStorage.removeItem('sxl_user');
    localStorage.removeItem('sxl_token');
    window.dispatchEvent(new Event('sxl-auth-change'));
    window.location.href = '/';
  }

  const isAdmin = user && (user.role === 'admin' || user.role === 'staff');

  return (
    <header className="sxl-header">
      <div className="sxl-header-inner">
        <Link href="/" className="sxl-logo">
          <div className="sxl-logo-mark">sXL</div>
          <div className="sxl-logo-text">
            <span className="brand">Super Express</span>
            <span className="tag">Logistics Center</span>
          </div>
        </Link>

        <nav className="sxl-nav">
          {user ? (
            <>
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/book">Book</Link>
              <Link href="/track">Track</Link>
              {isAdmin && <Link href="/admin">Admin</Link>}
              <Link href="/account">Account</Link>
              <button onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link href="/">Home</Link>
              <Link href="/#services">Services</Link>
              <Link href="/#contact">Contact</Link>
              <Link href="/track">Track</Link>
              <Link href="/login">Login</Link>
              <Link href="/register" className="btn-primary">Sign Up</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
