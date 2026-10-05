'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

function TrackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tn = (searchParams.get('tn') || '').trim().toUpperCase();

  const [input, setInput] = useState(tn);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (tn) {
      fetchTracking(tn);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tn]);

  async function fetchTracking(trackingNumber) {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/track?tn=' + encodeURIComponent(trackingNumber));
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Tracking number not found.');
        setLoading(false);
        return;
      }
      setResult(data);
      setLoading(false);
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    const clean = input.trim();
    if (!clean) return;
    router.push('/track?tn=' + encodeURIComponent(clean));
  }

  function formatDateTime(d) {
    if (!d) return '—';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    } catch (e) { return String(d); }
  }

  function formatDate(d) {
    if (!d) return '—';
    try {
      const date = new Date(d);
      if (isNaN(date.getTime())) return String(d);
      return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    } catch (e) { return String(d); }
  }

  return (
    <>
      <Header />

      <div style={{ maxWidth: '900px', margin: '40px auto', padding: '0 20px', minHeight: '60vh' }}>
        <form onSubmit={handleSubmit} style={{
          background: 'white',
          borderRadius: '10px',
          padding: '10px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
          display: 'flex',
          gap: '10px',
          flexWrap: 'wrap',
          marginBottom: '30px'
        }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Enter tracking number"
            style={{
              flex: 1,
              minWidth: '220px',
              padding: '14px 18px',
              fontSize: '1rem',
              border: 'none',
              outline: 'none',
              background: 'transparent'
            }}
          />
          <button
            type="submit"
            style={{
              padding: '14px 28px',
              background: '#FF6B00',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            🔍 Track
          </button>
        </form>

        {loading && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{
              width: '45px',
              height: '45px',
              border: '4px solid #E9ECEF',
              borderTopColor: '#FF6B00',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 15px'
            }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ color: '#6C757D' }}>Fetching shipment info...</p>
          </div>
        )}

        {error && !loading && (
          <div style={{
            background: '#F8D7DA',
            color: '#721C24',
            borderLeft: '4px solid #DC3545',
            borderRadius: '10px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            ❌ {error}
          </div>
        )}

        {!loading && !error && !result && !tn && (
          <div style={{
            background: '#D1ECF1',
            color: '#0C5460',
            borderLeft: '4px solid #17A2B8',
            borderRadius: '10px',
            padding: '20px',
            textAlign: 'center'
          }}>
            Enter a tracking number above to see shipment status.
          </div>
        )}

        {result && !loading && (
          <div>
            <div style={{
              background: 'white',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
              overflow: 'hidden',
              marginBottom: '25px'
            }}>
              <div style={{
                background: 'linear-gradient(135deg, #003366 0%, #002347 100%)',
                color: 'white',
                padding: '25px 30px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '15px'
              }}>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', opacity: 0.7, marginBottom: '4px' }}>
                    Tracking Number
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, letterSpacing: '0.5px', fontFamily: 'Consolas, monospace' }}>
                    {result.shipment.trackingNumber}
                  </div>
                </div>
                <div style={{
                  padding: '8px 18px',
                  borderRadius: '30px',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  background: result.shipment.status === 'Delivered' ? '#D4EDDA' :
                              result.shipment.status === 'In Transit' ? '#CCE5FF' :
                              result.shipment.status === 'Out for Delivery' ? '#FFE5B4' : '#FFF3CD',
                  color: result.shipment.status === 'Delivered' ? '#155724' :
                         result.shipment.status === 'In Transit' ? '#004085' :
                         result.shipment.status === 'Out for Delivery' ? '#8B4500' : '#856404'
                }}>
                  {result.shipment.status}
                </div>
              </div>

              {!result.isException && result.stepper.length > 0 && (
                <div style={{ padding: '30px 30px 10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative' }}>
                    {result.stepper.map((step, idx) => (
                      <div key={idx} style={{
                        flex: 1,
                        textAlign: 'center',
                        position: 'relative',
                        zIndex: 2
                      }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: step.state === 'done' ? '#00A86B' :
                                      step.state === 'active' ? '#FF6B00' : '#E9ECEF',
                          border: '3px solid white',
                          boxShadow: step.state === 'done' ? '0 0 0 2px #00A86B' :
                                     step.state === 'active' ? '0 0 0 2px #FF6B00, 0 0 0 8px rgba(255,107,0,0.15)' :
                                     '0 0 0 2px #E9ECEF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          margin: '0 auto 8px',
                          fontWeight: 800,
                          color: step.state === 'pending' ? '#6C757D' : 'white',
                          fontSize: '1rem'
                        }}>
                          {step.state === 'done' ? '✓' : (idx + 1)}
                        </div>
                        <div style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          color: step.state === 'pending' ? '#6C757D' : '#003366',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          {step.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.isException && (
                <div style={{ padding: '20px 30px 0' }}>
                  <div style={{
                    background: '#F8D7DA',
                    color: '#721C24',
                    borderLeft: '4px solid #DC3545',
                    borderRadius: '8px',
                    padding: '15px'
                  }}>
                    ⚠️ This shipment has an exception.
                  </div>
                </div>
              )}

              <div style={{ padding: '30px' }}>
                {/* ESTIMATED DELIVERY (HIGHLIGHTED) */}
                <div style={{
                  background: '#FFF5EB',
                  border: '2px solid #FF6B00',
                  borderRadius: '12px',
                  padding: '18px 22px',
                  marginBottom: '25px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '1.5px',
                      color: '#8B4500',
                      fontWeight: 700,
                      marginBottom: '4px'
                    }}>
                      📅 Estimated Delivery
                    </div>
                    <div style={{
                      fontSize: '1.6rem',
                      fontWeight: 800,
                      color: '#FF6B00',
                      letterSpacing: '0.3px'
                    }}>
                      {result.shipment.estimatedDelivery ? formatDate(result.shipment.estimatedDelivery) : 'Pending'}
                    </div>
                  </div>
                </div>

                {/* OTHER DETAILS GRID — G.24: removed Shipper & Consignee cells */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                  gap: '20px',
                  paddingBottom: '30px',
                  borderBottom: '1px solid #E9ECEF'
                }}>
                  {[
                    { label: 'Shipment Type', value: result.shipment.shipmentType || '—' },
                    ...(result.shipment.deliveryTimeline ? [{ label: 'Delivery Timeline', value: result.shipment.deliveryTimeline }] : []),
                    { label: 'From', value: result.shipment.origin || '—' },
                    { label: 'To', value: result.shipment.destination || '—' },
                    { label: 'Weight', value: `${result.shipment.weight || '—'} kg` },
                    { label: 'Packages', value: result.shipment.packages || '—' },
                    { label: 'Last Update', value: formatDateTime(result.shipment.lastUpdate) },
                  ].map((item, i) => (
                    <div key={i}>
                      <div style={{
                        fontSize: '0.75rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: '#6C757D',
                        marginBottom: '5px',
                        fontWeight: 600
                      }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#343A40' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: '30px' }}>
                  <div style={{ fontSize: '1.15rem', fontWeight: 700, color: '#003366', marginBottom: '25px' }}>
                    📍 Tracking Timeline
                  </div>

                  {result.history.length === 0 ? (
                    <p style={{ color: '#6C757D' }}>No tracking events yet.</p>
                  ) : (
                    <div style={{ position: 'relative', paddingLeft: '35px' }}>
                      <div style={{
                        position: 'absolute',
                        left: '10px',
                        top: '10px',
                        bottom: '10px',
                        width: '2px',
                        background: '#E9ECEF'
                      }} />
                      {result.history.map((item, i) => (
                        <div key={i} style={{ position: 'relative', paddingBottom: '25px' }}>
                          <div style={{
                            position: 'absolute',
                            left: '-35px',
                            top: '4px',
                            width: '22px',
                            height: '22px',
                            borderRadius: '50%',
                            background: i === 0 ? '#00A86B' : '#E9ECEF',
                            border: '4px solid white',
                            boxShadow: i === 0 ? '0 0 0 2px #00A86B, 0 0 0 6px rgba(0,168,107,0.15)' : '0 0 0 2px #E9ECEF'
                          }} />
                          <div style={{ fontWeight: 700, color: '#343A40', marginBottom: '2px' }}>
                            {item.status}
                          </div>
                          <div style={{ fontSize: '0.9rem', color: '#6C757D' }}>
                            📍 {item.location || '—'}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: '#ADB5BD', marginTop: '3px' }}>
                            🕐 {formatDateTime(item.timestamp)}
                          </div>
                          {item.notes && (
                            <div style={{
                              fontSize: '0.85rem',
                              color: '#6C757D',
                              fontStyle: 'italic',
                              marginTop: '5px',
                              padding: '8px 12px',
                              background: '#F8F9FA',
                              borderRadius: '6px'
                            }}>
                              {item.notes}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </>
  );
}

export default function TrackPage() {
  return (
    <Suspense fallback={<div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>}>
      <TrackContent />
    </Suspense>
  );
}
