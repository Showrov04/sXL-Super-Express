'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

export default function Header() {
  const [user, setUser] = useState(null);
  const pathname = usePathname();

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

  // Helper: is this nav link the current page?
  function isActive(href) {
    if (!pathname) return false;
    // Home link exact match (but ignore hash links like /#services)
    if (href === '/') return pathname === '/';
    // For hash-anchored routes like /#services — treat as "home" only
    if (href.startsWith('/#')) return false;
    // Prefix match for nested routes (e.g. /admin/anything still activates "Admin")
    return pathname === href || pathname.startsWith(href + '/');
  }

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
              <Link href="/dashboard" className={'sxl-nav-link' + (isActive('/dashboard') ? ' active' : '')}>
                Dashboard
              </Link>
              <Link href="/book" className={'sxl-nav-link' + (isActive('/book') ? ' active' : '')}>
                Book
              </Link>
              <Link href="/track" className={'sxl-nav-link' + (isActive('/track') ? ' active' : '')}>
                Track
              </Link>
              {isAdmin && (
                <Link href="/admin" className={'sxl-nav-link' + (isActive('/admin') ? ' active' : '')}>
                  Admin
                </Link>
              )}
              <Link href="/account" className={'sxl-nav-link' + (isActive('/account') ? ' active' : '')}>
                Account
              </Link>
              <button onClick={logout} className="sxl-nav-link">
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/" className={'sxl-nav-link' + (isActive('/') ? ' active' : '')}>
                Home
              </Link>
              <Link href="/#services" className="sxl-nav-link">
                Services
              </Link>
              <Link href="/#contact" className="sxl-nav-link">
                Contact
              </Link>
              <Link href="/track" className={'sxl-nav-link' + (isActive('/track') ? ' active' : '')}>
                Track
              </Link>
              <Link href="/login" className={'sxl-nav-link' + (isActive('/login') ? ' active' : '')}>
                Login
              </Link>
              <Link href="/register" className="btn-primary">
                Sign Up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
