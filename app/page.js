'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';

/* ---- Small inline SVG icons (match the footer brand style) ---- */
function IconPhone() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
    </svg>
  );
}

function IconWhatsApp() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="white">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function IconEmail() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
    </svg>
  );
}

function IconWeb() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function IconWeChat({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="white">
      <path d="M8.5 4C4.9 4 2 6.5 2 9.5c0 1.7 1 3.2 2.5 4.2-.1.4-.4 1.5-.6 2 0 0 .1.1.2 0 .4-.2 1.8-1 2.4-1.3.6.1 1.3.2 2 .2.2 0 .4 0 .6-.1-.2-.6-.4-1.2-.4-1.9 0-3.4 3.3-6.1 7.3-6.1h.5C15.7 5.1 12.4 4 8.5 4z" />
      <path d="M22 13c0-2.5-2.4-4.5-5.4-4.5S11.2 10.5 11.2 13s2.4 4.5 5.4 4.5c.6 0 1.2-.1 1.7-.2.5.3 1.7.9 2 .9 0 0 .1-.1 0-.2-.2-.4-.4-1.3-.4-1.5.7-.8 1.1-1.8 1.1-2.5z" />
    </svg>
  );
}

export default function Home() {
  const router = useRouter();
  const [trackInput, setTrackInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [company, setCompany] = useState(null);

  useEffect(() => {
    fetch('/api/company-info')
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.company) setCompany(d.company);
      })
      .catch(() => { /* silent — section shows fallbacks */ });
  }, []);

  async function handleTrack(e) {
    e.preventDefault();
    setError('');

    const tn = trackInput.trim();
    if (!tn) {
      setError('Please enter a tracking number.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/track?tn=' + encodeURIComponent(tn));
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Tracking number not found.');
        setLoading(false);
        return;
      }

      router.push('/track?tn=' + encodeURIComponent(tn));
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  }

  const c = company || {};

  return (
    <>
      <Header />

      <section style={{
        background: 'linear-gradient(135deg, #003366 0%, #002347 100%)',
        color: 'white',
        padding: '80px 20px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ maxWidth: '900px', margin: '0 auto', textAlign: 'center', position: 'relative', zIndex: 2 }}>
          <h1 style={{
            fontSize: '3rem',
            fontWeight: 800,
            marginBottom: '15px',
            letterSpacing: '-1px',
            lineHeight: 1.1
          }}>
            Ship <span style={{ color: '#FF6B00' }}>Faster.</span> Track <span style={{ color: '#FF6B00' }}>Smarter.</span>
          </h1>
          <p style={{
            fontSize: '1.15rem',
            opacity: 0.85,
            marginBottom: '40px',
            maxWidth: '700px',
            marginLeft: 'auto',
            marginRight: 'auto'
          }}>
            Courier, Air &amp; Sea Freight, and Internal Cargo — worldwide delivery you can trust.
          </p>

          <form onSubmit={handleTrack} style={{
            background: 'white',
            borderRadius: '10px',
            padding: '10px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
            display: 'flex',
            gap: '10px',
            maxWidth: '700px',
            margin: '0 auto',
            flexWrap: 'wrap'
          }}>
            <input
              type="text"
              value={trackInput}
              onChange={(e) => setTrackInput(e.target.value)}
              placeholder="Enter your tracking number"
              autoComplete="off"
              style={{
                flex: 1,
                minWidth: '220px',
                padding: '16px 20px',
                fontSize: '1rem',
                border: 'none',
                outline: 'none',
                background: 'transparent',
                color: '#343A40'
              }}
            />
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '16px 32px',
                background: '#FF6B00',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                whiteSpace: 'nowrap'
              }}
            >
              {loading ? 'Searching...' : '🔍 Track'}
            </button>
          </form>

          {error && (
            <div style={{
              marginTop: '15px',
              padding: '12px 20px',
              background: 'rgba(220,53,69,0.2)',
              border: '1px solid #DC3545',
              borderRadius: '8px',
              color: '#FFE5E5',
              fontSize: '0.95rem',
              maxWidth: '700px',
              margin: '15px auto 0'
            }}>
              ❌ {error}
            </div>
          )}

          <div style={{
            marginTop: '30px',
            display: 'flex',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: 'wrap'
          }}>
            <a
              href="#services"
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.4)',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none'
              }}
            >
              Our Services ↓
            </a>
            <a
              href="#contact"
              style={{
                padding: '12px 24px',
                background: 'transparent',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.4)',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '0.9rem',
                textDecoration: 'none'
              }}
            >
              Contact Us ↓
            </a>
          </div>
        </div>
      </section>

      {/* ============ OUR SERVICES ============ */}
      <section id="services" style={{ padding: '80px 20px', background: 'white', scrollMarginTop: '80px' }}>
        <div className="sxl-container">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#003366', marginBottom: '10px' }}>
              Our Services
            </h2>
            <p style={{ color: '#6C757D', fontSize: '1.05rem' }}>
              Complete logistics solutions for your business
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '25px',
            maxWidth: '1100px',
            margin: '0 auto'
          }}>
            {[
              { icon: '📦', title: 'Courier Express', desc: 'Fast door-to-door delivery for documents and parcels worldwide.' },
              { icon: '✈️', title: 'Air Freight', desc: 'Time-critical shipments delivered by air to any destination.' },
              { icon: '🚢', title: 'Sea Freight', desc: 'Cost-effective ocean shipping for bulk cargo and containers.' },
              { icon: '🏢', title: 'Internal Cargo', desc: 'Company transfers and internal logistics between branches.' }
            ].map((s, i) => (
              <div key={i} style={{
                padding: '30px 25px',
                borderRadius: '10px',
                background: '#F8F9FA',
                border: '2px solid transparent',
                textAlign: 'center',
                transition: 'all 0.3s'
              }}>
                <div style={{
                  width: '70px',
                  height: '70px',
                  margin: '0 auto 20px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C33 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  boxShadow: '0 10px 20px rgba(255,107,0,0.25)'
                }}>
                  {s.icon}
                </div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '10px', color: '#003366' }}>{s.title}</h3>
                <p style={{ fontSize: '0.95rem', color: '#6C757D', lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ STATS ============ */}
      <section style={{ padding: '60px 20px', background: '#003366', color: 'white' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '30px',
          maxWidth: '1000px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          {[
            { num: '250+', lbl: 'Countries' },
            { num: '24/7', lbl: 'Support' },
            { num: '100%', lbl: 'Trackable' },
            { num: 'sXL', lbl: 'Trusted' }
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#FF6B00', marginBottom: '5px' }}>
                {s.num}
              </div>
              <div style={{ fontSize: '0.95rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px' }}>
                {s.lbl}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ CONTACT US ============ */}
      <section id="contact" style={{ padding: '80px 20px', background: '#F8F9FA', scrollMarginTop: '80px' }}>
        <style>{`
          .sxl-contact-row:hover {
            background: #FFFFFF !important;
            box-shadow: 0 6px 18px rgba(0,0,0,0.08) !important;
            transform: translateY(-2px);
          }
          .sxl-contact-row:hover .sxl-contact-arrow {
            color: #FF6B00 !important;
            transform: translateX(2px);
          }
        `}</style>

        <div className="sxl-container">
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <h2 style={{ fontSize: '2.2rem', fontWeight: 800, color: '#003366', marginBottom: '10px' }}>
              Contact Us
            </h2>
            <p style={{ color: '#6C757D', fontSize: '1.05rem' }}>
              Get in touch — we respond fast
            </p>
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '25px',
            maxWidth: '1000px',
            margin: '0 auto',
            alignItems: 'stretch'
          }}>
            {/* Left card — text contact info (all rows clickable) */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px 28px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              borderTop: '4px solid #FF6B00'
            }}>
              <h3 style={{ color: '#003366', fontSize: '1.15rem', fontWeight: 800, marginBottom: '22px' }}>
                📞 Reach Us Directly
              </h3>

              <ContactRow
                icon={<IconPhone />}
                brandColor="#FF6B00"
                label="Phone"
                value={c.company_phone}
                href={c.company_phone ? 'tel:' + String(c.company_phone).replace(/\s+/g, '') : null}
              />
              <ContactRow
                icon={<IconWhatsApp />}
                brandColor="#25D366"
                label="WhatsApp"
                value={c.company_whatsapp}
                href={c.company_whatsapp ? 'https://wa.me/' + String(c.company_whatsapp).replace(/[^\d]/g, '') : null}
              />
              <ContactRow
                icon={<IconEmail />}
                brandColor="#0066CC"
                label="Email"
                value={c.company_email}
                href={c.company_email ? 'mailto:' + c.company_email : null}
              />
              <ContactRow
                icon={<IconWeb />}
                brandColor="#00A86B"
                label="Website"
                value={c.company_website}
                href={c.company_website ? 'https://' + String(c.company_website).replace(/^https?:\/\//, '') : null}
              />
            </div>

            {/* Right card — WeChat (compact & vertically centered) */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '30px 28px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              borderTop: '4px solid #07C160',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center'
            }}>
              <div style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: '#07C160',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '14px',
                boxShadow: '0 8px 20px rgba(7,193,96,0.35)'
              }}>
                <IconWeChat size={30} />
              </div>

              <h3 style={{ color: '#003366', fontSize: '1.15rem', fontWeight: 800, margin: '0 0 6px' }}>
                WeChat
              </h3>
              <p style={{ color: '#6C757D', fontSize: '0.85rem', margin: '0 0 16px' }}>
                Scan or search to add us
              </p>

              {c.company_wechat_qr_url ? (
                <div style={{
                  display: 'inline-block',
                  padding: '10px',
                  background: 'white',
                  borderRadius: '10px',
                  border: '2px solid #E9ECEF',
                  marginBottom: '14px'
                }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={c.company_wechat_qr_url}
                    alt="WeChat QR Code"
                    style={{ width: '160px', height: '160px', display: 'block' }}
                  />
                </div>
              ) : (
                <div style={{
                  fontSize: '3.5rem',
                  margin: '14px 0 18px',
                  opacity: 0.35
                }}>
                  🟢
                </div>
              )}

              {c.company_wechat && (
                <div style={{
                  padding: '12px 16px',
                  background: '#E8F7EF',
                  border: '2px solid #07C160',
                  borderRadius: '10px',
                  fontFamily: 'Consolas, monospace',
                  fontWeight: 800,
                  color: '#155724',
                  fontSize: '1rem',
                  wordBreak: 'break-all',
                  width: '100%',
                  boxSizing: 'border-box'
                }}>
                  {c.company_wechat}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function ContactRow({ icon, brandColor, label, value, href }) {
  if (!value) return null;

  const content = (
    <div
      className="sxl-contact-row"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '14px',
        padding: '14px 16px',
        borderRadius: '12px',
        background: '#F8F9FA',
        marginBottom: '10px',
        textDecoration: 'none',
        color: 'inherit',
        border: '2px solid transparent',
        transition: 'all 0.2s'
      }}
    >
      <div style={{
        width: '44px',
        height: '44px',
        borderRadius: '50%',
        background: brandColor,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
      }}>
        {icon}
      </div>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div style={{
          fontSize: '0.68rem',
          textTransform: 'uppercase',
          color: '#6C757D',
          fontWeight: 700,
          letterSpacing: '0.8px',
          marginBottom: '2px'
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: '#003366',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}>
          {value}
        </div>
      </div>
      <div
        className="sxl-contact-arrow"
        style={{
          color: '#ADB5BD',
          fontSize: '1.1rem',
          flexShrink: 0,
          transition: 'all 0.2s'
        }}
      >
        →
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        target={href.startsWith('http') ? '_blank' : undefined}
        rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
        style={{ textDecoration: 'none', display: 'block' }}
      >
        {content}
      </a>
    );
  }
  return content;
}
