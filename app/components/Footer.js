'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function Footer() {
  const year = new Date().getFullYear();

  const [c, setC] = useState({
    company_phone: '+852 60480171',
    company_email: 'admin@sxl-logistics.com',
    company_website: 'www.sxl-logistics.com',
    company_wechat: 'sXL-Logistics',
    company_whatsapp: '+852 60480171',
  });

  useEffect(() => {
    fetch('/api/company-info')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.company) {
          setC((prev) => ({ ...prev, ...d.company }));
        }
      })
      .catch(() => { /* silent — fallbacks stay */ });
  }, []);

  const waNumber = c.company_whatsapp ? String(c.company_whatsapp).replace(/[^\d]/g, '') : '';
  const phoneClean = c.company_phone ? String(c.company_phone).replace(/\s+/g, '') : '';
  const webUrl = c.company_website
    ? 'https://' + String(c.company_website).replace(/^https?:\/\//, '')
    : '';

  const iconBtn = {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    textDecoration: 'none',
    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
    transition: 'transform 0.15s',
  };

  return (
    <footer style={{
      background: '#002347',
      color: 'rgba(255,255,255,0.75)',
      padding: '40px 20px 25px',
      marginTop: '60px',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>

        {/* ---- TOP: Logo + Contact Icons ---- */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '25px',
          paddingBottom: '25px',
          borderBottom: '1px solid rgba(255,255,255,0.12)',
        }}>
          {/* Official sXL logo — clickable → home */}
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '12px', textDecoration: 'none' }}>
            <div style={{
              width: '48px',
              height: '48px',
              background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C33 100%)',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 800,
              fontSize: '1.1rem',
              letterSpacing: '-0.5px',
              boxShadow: '0 6px 16px rgba(255,107,0,0.35)',
            }}>
              sXL
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
              <span style={{ fontWeight: 800, fontSize: '1.2rem', color: 'white', letterSpacing: '-0.5px' }}>
                Super Express
              </span>
              <span style={{
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.55)',
                letterSpacing: '1px',
                textTransform: 'uppercase',
                fontWeight: 600,
              }}>
                Logistics Center
              </span>
            </div>
          </Link>

          {/* Contact icon buttons */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {waNumber && (
              <a
                href={'https://wa.me/' + waNumber}
                target="_blank"
                rel="noopener noreferrer"
                title={'WhatsApp: ' + c.company_whatsapp}
                aria-label="WhatsApp"
                style={{ ...iconBtn, background: '#25D366' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            )}

            {phoneClean && (
              <a
                href={'tel:' + phoneClean}
                title={'Phone: ' + c.company_phone}
                aria-label="Phone"
                style={{ ...iconBtn, background: '#FF6B00' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
                </svg>
              </a>
            )}

            {c.company_email && (
              <a
                href={'mailto:' + c.company_email}
                title={'Email: ' + c.company_email}
                aria-label="Email"
                style={{ ...iconBtn, background: '#0066CC' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                  <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
                </svg>
              </a>
            )}

            {webUrl && (
              <a
                href={webUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={'Website: ' + c.company_website}
                aria-label="Website"
                style={{ ...iconBtn, background: '#00A86B' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </a>
            )}

            {c.company_wechat && (
              <a
                href={'weixin://dl/chat'}
                title={'WeChat ID: ' + c.company_wechat}
                aria-label="WeChat"
                style={{ ...iconBtn, background: '#07C160' }}
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
                  <path d="M8.5 4C4.9 4 2 6.5 2 9.5c0 1.7 1 3.2 2.5 4.2-.1.4-.4 1.5-.6 2 0 0 .1.1.2 0 .4-.2 1.8-1 2.4-1.3.6.1 1.3.2 2 .2.2 0 .4 0 .6-.1-.2-.6-.4-1.2-.4-1.9 0-3.4 3.3-6.1 7.3-6.1h.5C15.7 5.1 12.4 4 8.5 4z" />
                  <path d="M22 13c0-2.5-2.4-4.5-5.4-4.5S11.2 10.5 11.2 13s2.4 4.5 5.4 4.5c.6 0 1.2-.1 1.7-.2.5.3 1.7.9 2 .9 0 0 .1-.1 0-.2-.2-.4-.4-1.3-.4-1.5.7-.8 1.1-1.8 1.1-2.5z" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* ---- MIDDLE: Contact details as text ---- */}
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '18px 40px',
          justifyContent: 'center',
          padding: '22px 0',
          fontSize: '0.88rem',
          color: 'rgba(255,255,255,0.75)',
          textAlign: 'center',
        }}>
          {c.company_phone && <span>📱 {c.company_phone}</span>}
          {c.company_whatsapp && <span>💬 {c.company_whatsapp}</span>}
          {c.company_email && <span>📧 {c.company_email}</span>}
          {c.company_website && <span>🌐 {c.company_website}</span>}
          {c.company_wechat && <span>🟢 WeChat: {c.company_wechat}</span>}
        </div>

        {/* ---- BOTTOM: Copyright ---- */}
        <div style={{
          textAlign: 'center',
          paddingTop: '20px',
          borderTop: '1px solid rgba(255,255,255,0.12)',
          fontSize: '0.85rem',
          color: 'rgba(255,255,255,0.6)',
        }}>
          <p style={{ margin: 0 }}>
            © {year} sXL - Super Express Logistics Center. All rights reserved.
          </p>
          <p style={{ fontSize: '0.78rem', opacity: 0.75, marginTop: '6px' }}>
            Ship Faster. Track Smarter.
          </p>
        </div>
      </div>
    </footer>
  );
}
