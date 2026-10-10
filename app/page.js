'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from './components/Header';
import Footer from './components/Footer';

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

          {/* Quick links to Services + Contact */}
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
            margin: '0 auto'
          }}>
            {/* Left card — text contact info */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '35px 30px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              borderTop: '4px solid #FF6B00'
            }}>
              <h3 style={{ color: '#003366', fontSize: '1.15rem', fontWeight: 800, marginBottom: '22px' }}>
                📞 Reach Us Directly
              </h3>

              <ContactRow
                icon="📱"
                label="Phone"
                value={c.company_phone}
                href={c.company_phone ? 'tel:' + String(c.company_phone).replace(/\s+/g, '') : null}
              />
              <ContactRow
                icon="💬"
                label="WhatsApp"
                value={c.company_whatsapp}
                href={c.company_whatsapp ? 'https://wa.me/' + String(c.company_whatsapp).replace(/[^\d]/g, '') : null}
              />
              <ContactRow
                icon="📧"
                label="Email"
                value={c.company_email}
                href={c.company_email ? 'mailto:' + c.company_email : null}
              />
              <ContactRow
                icon="🌐"
                label="Website"
                value={c.company_website}
                href={c.company_website ? 'https://' + String(c.company_website).replace(/^https?:\/\//, '') : null}
              />
            </div>

            {/* Right card — WeChat + QR */}
            <div style={{
              background: 'white',
              borderRadius: '12px',
              padding: '35px 30px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              borderTop: '4px solid #00A86B',
              textAlign: 'center'
            }}>
              <h3 style={{ color: '#003366', fontSize: '1.15rem', fontWeight: 800, marginBottom: '22px' }}>
                🟢 WeChat
              </h3>

              {c.company_wechat_qr_url ? (
                <>
                  <div style={{
                    display: 'inline-block',
                    padding: '10px',
                    background: 'white',
                    borderRadius: '10px',
                    border: '2px solid #E9ECEF'
                  }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.company_wechat_qr_url}
                      alt="WeChat QR Code"
                      style={{ width: '180px', height: '180px', display: 'block' }}
                    />
                  </div>
                  <p style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '12px' }}>
                    Scan with WeChat to add us
                  </p>
                </>
              ) : (
                <div style={{
                  fontSize: '4rem',
                  margin: '20px 0',
                  opacity: 0.3
                }}>
                  🟢
                </div>
              )}

              {c.company_wechat && (
                <div style={{
                  marginTop: '18px',
                  padding: '12px 16px',
                  background: '#E8F7EF',
                  border: '2px solid #00A86B',
                  borderRadius: '10px',
                  fontFamily: 'Consolas, monospace',
                  fontWeight: 800,
                  color: '#155724',
                  fontSize: '1rem',
                  wordBreak: 'break-all'
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

function ContactRow({ icon, label, value, href }) {
  if (!value) return null;

  const content = (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '14px',
      padding: '14px 16px',
      borderRadius: '10px',
      background: '#F8F9FA',
      marginBottom: '12px',
      textDecoration: 'none',
      color: 'inherit',
      transition: 'background 0.2s'
    }}>
      <div style={{
        width: '42px',
        height: '42px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #FF6B00 0%, #FF8C33 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.2rem',
        flexShrink: 0,
        boxShadow: '0 4px 10px rgba(255,107,0,0.25)'
      }}>
        {icon}
      </div>
      <div style={{ overflow: 'hidden', flex: 1 }}>
        <div style={{
          fontSize: '0.72rem',
          textTransform: 'uppercase',
          color: '#6C757D',
          fontWeight: 700,
          letterSpacing: '0.5px',
          marginBottom: '2px'
        }}>
          {label}
        </div>
        <div style={{
          fontSize: '0.95rem',
          fontWeight: 700,
          color: '#003366',
          wordBreak: 'break-all'
        }}>
          {value}
        </div>
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
