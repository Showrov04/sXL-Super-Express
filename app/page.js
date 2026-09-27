'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './components/Header';
import Footer from './components/Footer';

export default function Home() {
  const router = useRouter();
  const [trackInput, setTrackInput] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
        </div>
      </section>

      <section style={{ padding: '80px 20px', background: 'white' }}>
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

      <Footer />
    </>
  );
}
