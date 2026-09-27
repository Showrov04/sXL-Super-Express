'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../components/Header';
import Footer from '../components/Footer';

export default function BookPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [countries, setCountries] = useState([]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  // Form data
  const [shipMode, setShipMode] = useState('');
  const [parcelType, setParcelType] = useState('');
  const [parcelTypeCustom, setParcelTypeCustom] = useState('');
  const [shipper, setShipper] = useState({
    name: '', fullAddress: '', city: '', state: '', country: '', email: '', phone: ''
  });
  const [consignee, setConsignee] = useState({
    name: '', fullAddress: '', city: '', state: '', country: '', email: '', phone: '', bin: ''
  });
  const [shipment, setShipment] = useState({
    shipperRef: '', shipmentDate: new Date().toISOString().slice(0, 10),
    description: '', packages: 1, totalWeight: '', totalValue: '',
    valueCurrency: 'USD', specialInstruction: '',
    parcelReadyDate: new Date().toISOString().slice(0, 10),
    parcelReadyTime: '10:00', pickupSameAsShipper: true,
    pickupAddress: '', pickupCity: '', pickupState: '', pickupCountry: '',
    hsCode: '', totalCbm: '', dimensions: ''
  });
  const [paymentTerms, setPaymentTerms] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');

  useEffect(() => {
    const stored = localStorage.getItem('sxl_user');
    if (!stored) {
      router.push('/login');
      return;
    }
    try {
      setUser(JSON.parse(stored));
    } catch (e) {
      router.push('/login');
    }

    // Load countries
    fetch('/api/countries')
      .then((r) => r.json())
      .then((d) => setCountries(d.countries || []))
      .catch(() => setCountries([]));
  }, [router]);

  function setShipperField(k, v) { setShipper((s) => ({ ...s, [k]: v })); }
  function setConsigneeField(k, v) { setConsignee((s) => ({ ...s, [k]: v })); }
  function setShipmentField(k, v) { setShipment((s) => ({ ...s, [k]: v })); }

  const isSea = shipMode === 'SEA';

  // Stepper configuration
  const totalSteps = isSea ? 5 : 6;
  const steps = isSea
    ? ['Ship Mode', 'Shipper & Consignee', 'Shipment Details', 'Payment', 'Review']
    : ['Ship Mode', 'Parcel Type', 'Shipper & Consignee', 'Shipment Details', 'Payment', 'Review'];

  // Navigation helpers that account for SEA skipping Step 2
  function getNextStep(current) {
    if (current === 1 && isSea) return 2; // skip parcel type
    if (current === 1 && !isSea) return 2;
    return current + 1;
  }
  function getPrevStep(current) {
    if (current === 2 && isSea) return 1;
    return current - 1;
  }

  // Validation per step
  function validateStep1() {
    if (!shipMode) return 'Please select a ship mode.';
    return null;
  }
  function validateStep2Parcel() {
    if (!parcelType) return 'Please select a parcel type.';
    if (parcelType === 'Others' && !parcelTypeCustom.trim()) return 'Please specify the parcel type.';
    return null;
  }
  function validateStepParties() {
    if (!shipper.name || !shipper.fullAddress || !shipper.country || !shipper.email || !shipper.phone) {
      return 'Shipper: Name, Full Address, Country, Email and Phone are required.';
    }
    if (!consignee.name || !consignee.fullAddress || !consignee.country || !consignee.email || !consignee.phone || !consignee.bin) {
      return 'Consignee: Name, Full Address, Country, Email, Phone and BIN are required.';
    }
    return null;
  }
  function validateShipment() {
    if (!shipment.description.trim()) return 'Description of goods is required.';
    if (!shipment.totalWeight || parseFloat(shipment.totalWeight) <= 0) return 'Enter a valid weight.';
    if (isSea) {
      if (!shipment.hsCode.trim()) return 'HS Code is required for SEA shipments.';
      if (!shipment.totalCbm || parseFloat(shipment.totalCbm) <= 0) return 'Total CBM is required.';
      if (!shipment.dimensions.trim()) return 'Dimensions are required.';
    } else {
      if (!shipment.totalValue || parseFloat(shipment.totalValue) <= 0) return 'Total value for customs is required.';
    }
    return null;
  }
  function validatePayment() {
    if (!paymentTerms) return 'Please select a payment type.';
    if (!paymentMethod) return 'Please select a payment method.';
    return null;
  }

  function goNext() {
    setError('');
    let err = null;
    // Determine current step semantics
    if (step === 1) err = validateStep1();
    else if (step === 2 && !isSea) err = validateStep2Parcel();
    else if ((step === 2 && isSea) || (step === 3 && !isSea)) err = validateParties();
    else if ((step === 3 && isSea) || (step === 4 && !isSea)) err = validateShipment();
    else if ((step === 4 && isSea) || (step === 5 && !isSea)) err = validatePayment();

    if (err) { setError(err); return; }
    setStep(getNextStep(step));
  }

  function validateParties() { return validateStepParties(); }

  function goPrev() {
    setError('');
    setStep(getPrevStep(step));
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);

    const token = localStorage.getItem('sxl_token');
    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          shipMode, parcelType, parcelTypeCustom,
          shipper, consignee, shipment,
          paymentTerms, paymentMethod,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Booking failed.');
        setLoading(false);
        return;
      }

      setSuccess({ trackingNumber: data.trackingNumber });
      setLoading(false);
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  }

  // ================== RENDER ==================
  if (!user) {
    return (
      <>
        <Header />
        <div style={{ padding: '80px 20px', textAlign: 'center' }}>
          <div style={{ width: '45px', height: '45px', border: '4px solid #E9ECEF', borderTopColor: '#FF6B00', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
        <Footer />
      </>
    );
  }

  // Success screen
  if (success) {
    return (
      <>
        <Header />
        <div style={{ maxWidth: '700px', margin: '60px auto', padding: '0 20px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{
              width: '80px', height: '80px', background: '#00A86B', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '2.5rem', margin: '0 auto 20px', color: 'white'
            }}>✓</div>
            <h2 style={{ color: '#003366', fontSize: '1.6rem', marginBottom: '10px' }}>Booking Confirmed!</h2>
            <p style={{ color: '#6C757D', marginBottom: '25px' }}>Your shipment has been registered.</p>

            <div style={{
              fontFamily: 'Consolas, monospace', fontSize: '1.8rem', fontWeight: 800, color: '#FF6B00',
              margin: '15px 0', padding: '15px', background: 'white',
              borderRadius: '10px', border: '2px dashed #FF6B00'
            }}>
              {success.trackingNumber}
            </div>

            <div style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/dashboard" style={{
                padding: '12px 24px', background: '#FF6B00', color: 'white',
                borderRadius: '8px', fontWeight: 700, textDecoration: 'none'
              }}>Go to Dashboard</a>
              <a href={'/track?tn=' + success.trackingNumber} style={{
                padding: '12px 24px', background: 'transparent', color: '#003366',
                border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, textDecoration: 'none'
              }}>Track Shipment</a>
            </div>
          </div>
        </div>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />

      <div style={{ maxWidth: '1000px', margin: '30px auto', padding: '0 20px 60px' }}>
        {/* Stepper */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '30px', overflowX: 'auto', paddingBottom: '5px' }}>
          {steps.map((label, idx) => {
            const num = idx + 1;
            const state = num === step ? 'active' : (num < step ? 'done' : 'pending');
            const bg = state === 'active' ? '#FFF5EB' : state === 'done' ? '#E8F7EF' : 'white';
            const border = state === 'active' ? '#FF6B00' : state === 'done' ? '#00A86B' : '#E9ECEF';
            const color = state === 'active' ? '#FF6B00' : state === 'done' ? '#00A86B' : '#6C757D';
            return (
              <div key={idx} style={{
                flex: 1, minWidth: '110px', padding: '12px 14px',
                background: bg, borderRadius: '10px', border: '2px solid ' + border,
                textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color
              }}>
                <div style={{ display: 'block', fontSize: '1rem', marginBottom: '3px' }}>
                  {state === 'done' ? '✓' : num}
                </div>
                {label}
              </div>
            );
          })}
        </div>

        {error && (
          <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '10px', padding: '15px 20px', marginBottom: '20px' }}>
            {error}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          {/* STEP 1: Ship Mode */}
          {step === 1 && (
            <>
              <h3 style={{ color: '#003366', fontSize: '1.2rem', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5' }}>
                Step 1 — Select Ship Mode
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                {[
                  { value: 'SEA', icon: '🚢', label: 'SEA Freight', sub: 'Cost-effective ocean shipping' },
                  { value: 'AIR', icon: '✈️', label: 'AIR Freight', sub: 'Fast air delivery' },
                ].map((m) => (
                  <button key={m.value} onClick={() => setShipMode(m.value)} style={{
                    padding: '25px 15px', border: '3px solid ' + (shipMode === m.value ? '#FF6B00' : '#E9ECEF'),
                    borderRadius: '12px', textAlign: 'center', cursor: 'pointer',
                    background: shipMode === m.value ? '#FFF5EB' : 'white',
                    fontFamily: 'inherit'
                  }}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>{m.icon}</span>
                    <div style={{ fontWeight: 800, color: '#003366', fontSize: '1.05rem' }}>{m.label}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6C757D', marginTop: '4px' }}>{m.sub}</div>
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <a href="/dashboard" style={{
                  padding: '14px 26px', background: 'transparent', color: '#003366',
                  border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700,
                  textDecoration: 'none'
                }}>Cancel</a>
                <button onClick={goNext} disabled={!shipMode} style={{
                  padding: '14px 26px', background: '#FF6B00', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 700,
                  cursor: shipMode ? 'pointer' : 'not-allowed', opacity: shipMode ? 1 : 0.5,
                  fontFamily: 'inherit'
                }}>Next →</button>
              </div>
            </>
          )}

          {/* STEP 2 (AIR only): Parcel Type */}
          {step === 2 && !isSea && (
            <>
              <h3 style={{ color: '#003366', fontSize: '1.2rem', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5' }}>
                Step 2 — Parcel Type
              </h3>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {['Document', 'No-Document (Sample)', 'Hand Carry', 'Others'].map((p) => (
                  <button key={p} onClick={() => setParcelType(p)} style={{
                    padding: '10px 20px', borderRadius: '30px',
                    border: '2px solid ' + (parcelType === p ? '#FF6B00' : '#E9ECEF'),
                    background: parcelType === p ? '#FF6B00' : 'white',
                    color: parcelType === p ? 'white' : '#343A40',
                    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}>{p}</button>
                ))}
              </div>
              {parcelType === 'Others' && (
                <div style={{ marginTop: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>
                    Please specify the parcel type *
                  </label>
                  <input type="text" value={parcelTypeCustom} onChange={(e) => setParcelTypeCustom(e.target.value)}
                    placeholder="e.g., Fragile equipment"
                    style={{ width: '100%', padding: '13px 15px', fontSize: '0.95rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none' }} />
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} style={{
                  padding: '14px 26px', background: 'transparent', color: '#003366',
                  border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }}>← Back</button>
                <button onClick={goNext} style={{
                  padding: '14px 26px', background: '#FF6B00', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }}>Next →</button>
              </div>
            </>
          )}

          {/* STEP 2 (SEA) / STEP 3 (AIR): Shipper & Consignee */}
          {((step === 2 && isSea) || (step === 3 && !isSea)) && (
            <>
              <h3 style={{ color: '#003366', fontSize: '1.2rem', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5' }}>
                {isSea ? 'Step 2' : 'Step 3'} — Shipper & Consignee
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h4 style={{ color: '#003366', marginBottom: '10px' }}>FROM (Shipper)</h4>
                  <Field label="Name *" value={shipper.name} onChange={(v) => setShipperField('name', v)} />
                  <Field label="Full Address *" value={shipper.fullAddress} onChange={(v) => setShipperField('fullAddress', v)} textarea />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Field label="City" value={shipper.city} onChange={(v) => setShipperField('city', v)} />
                    <Field label="State" value={shipper.state} onChange={(v) => setShipperField('state', v)} />
                  </div>
                  <SelectField label="Country *" value={shipper.country} onChange={(v) => setShipperField('country', v)} countries={countries} />
                  <Field label="Email *" value={shipper.email} onChange={(v) => setShipperField('email', v)} type="email" />
                  <Field label="Phone *" value={shipper.phone} onChange={(v) => setShipperField('phone', v)} type="tel" />
                </div>

                <div>
                  <h4 style={{ color: '#003366', marginBottom: '10px' }}>TO (Consignee)</h4>
                  <Field label="Name *" value={consignee.name} onChange={(v) => setConsigneeField('name', v)} />
                  <Field label="Full Address *" value={consignee.fullAddress} onChange={(v) => setConsigneeField('fullAddress', v)} textarea />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Field label="City" value={consignee.city} onChange={(v) => setConsigneeField('city', v)} />
                    <Field label="State" value={consignee.state} onChange={(v) => setConsigneeField('state', v)} />
                  </div>
                  <SelectField label="Country *" value={consignee.country} onChange={(v) => setConsigneeField('country', v)} countries={countries} />
                  <Field label="Email *" value={consignee.email} onChange={(v) => setConsigneeField('email', v)} type="email" />
                  <Field label="Phone *" value={consignee.phone} onChange={(v) => setConsigneeField('phone', v)} type="tel" />
                  <Field label="BIN *" value={consignee.bin} onChange={(v) => setConsigneeField('bin', v)} placeholder="Business Identification Number" />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} style={{
                  padding: '14px 26px', background: 'transparent', color: '#003366',
                  border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }}>← Back</button>
                <button onClick={goNext} style={{
                  padding: '14px 26px', background: '#FF6B00', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }}>Next →</button>
              </div>
            </>
          )}

          {/* STEP 3 (SEA) / STEP 4 (AIR): Shipment Details */}
          {((step === 3 && isSea) || (step === 4 && !isSea)) && (
            <>
              <h3 style={{ color: '#003366', fontSize: '1.2rem', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5' }}>
                {isSea ? 'Step 3' : 'Step 4'} — Shipment Details
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <Field label="Shipper Reference Number" value={shipment.shipperRef} onChange={(v) => setShipmentField('shipperRef', v)} />
                <Field label="Shipment Date" type="date" value={shipment.shipmentDate} onChange={(v) => setShipmentField('shipmentDate', v)} />
              </div>

              <Field label="Description of Goods *" value={shipment.description} onChange={(v) => setShipmentField('description', v)} textarea />

              {isSea && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                    <Field label="HS Code *" value={shipment.hsCode} onChange={(v) => setShipmentField('hsCode', v)} />
                    <Field label="Total CBM *" type="number" value={shipment.totalCbm} onChange={(v) => setShipmentField('totalCbm', v)} placeholder="Cubic meters" />
                  </div>
                  <Field label="Dimensions (LxWxH in cm) *" value={shipment.dimensions} onChange={(v) => setShipmentField('dimensions', v)} placeholder="e.g., 120x80x100" />
                </>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <Field label="No. of Packages *" type="number" value={shipment.packages} onChange={(v) => setShipmentField('packages', v)} />
                <Field label="Total Weight (kg) *" type="number" value={shipment.totalWeight} onChange={(v) => setShipmentField('totalWeight', v)} />
              </div>

              {!isSea && (
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                  <Field label="Total Value for Customs *" type="number" value={shipment.totalValue} onChange={(v) => setShipmentField('totalValue', v)} />
                  <SelectField label="Currency" value={shipment.valueCurrency} onChange={(v) => setShipmentField('valueCurrency', v)} options={['USD', 'HKD', 'CNY', 'BDT']} />
                </div>
              )}

              <Field label="Special Instruction" value={shipment.specialInstruction} onChange={(v) => setShipmentField('specialInstruction', v)} textarea />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <Field label={(isSea ? 'Goods' : 'Parcel') + ' Ready Date'} type="date" value={shipment.parcelReadyDate} onChange={(v) => setShipmentField('parcelReadyDate', v)} />
                <Field label={(isSea ? 'Goods' : 'Parcel') + ' Ready Time'} type="time" value={shipment.parcelReadyTime} onChange={(v) => setShipmentField('parcelReadyTime', v)} />
              </div>

              <div style={{ marginTop: '20px' }}>
                <h4 style={{ marginBottom: '10px', color: '#003366' }}>Pickup Address</h4>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                  <button onClick={() => setShipmentField('pickupSameAsShipper', true)} style={{
                    padding: '10px 20px', borderRadius: '30px',
                    border: '2px solid ' + (shipment.pickupSameAsShipper ? '#FF6B00' : '#E9ECEF'),
                    background: shipment.pickupSameAsShipper ? '#FF6B00' : 'white',
                    color: shipment.pickupSameAsShipper ? 'white' : '#343A40',
                    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}>Same as Shipper</button>
                  <button onClick={() => setShipmentField('pickupSameAsShipper', false)} style={{
                    padding: '10px 20px', borderRadius: '30px',
                    border: '2px solid ' + (!shipment.pickupSameAsShipper ? '#FF6B00' : '#E9ECEF'),
                    background: !shipment.pickupSameAsShipper ? '#FF6B00' : 'white',
                    color: !shipment.pickupSameAsShipper ? 'white' : '#343A40',
                    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}>Different Address</button>
                </div>

                {!shipment.pickupSameAsShipper && (
                  <>
                    <Field label="Pickup Address" value={shipment.pickupAddress} onChange={(v) => setShipmentField('pickupAddress', v)} textarea />
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      <Field label="City" value={shipment.pickupCity} onChange={(v) => setShipmentField('pickupCity', v)} />
                      <Field label="State" value={shipment.pickupState} onChange={(v) => setShipmentField('pickupState', v)} />
                    </div>
                    <SelectField label="Country" value={shipment.pickupCountry} onChange={(v) => setShipmentField('pickupCountry', v)} countries={countries} />
                  </>
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} style={{
                  padding: '14px 26px', background: 'transparent', color: '#003366',
                  border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }}>← Back</button>
                <button onClick={goNext} style={{
                  padding: '14px 26px', background: '#FF6B00', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }}>Next →</button>
              </div>
            </>
          )}

          {/* STEP 4 (SEA) / STEP 5 (AIR): Payment */}
          {((step === 4 && isSea) || (step === 5 && !isSea)) && (
            <>
              <h3 style={{ color: '#003366', fontSize: '1.2rem', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5' }}>
                {isSea ? 'Step 4' : 'Step 5'} — Payment Terms
              </h3>

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '10px' }}>Payment Type *</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {['Prepaid', 'Collect', 'Credit Account'].map((t) => (
                  <button key={t} onClick={() => setPaymentTerms(t)} style={{
                    padding: '10px 20px', borderRadius: '30px',
                    border: '2px solid ' + (paymentTerms === t ? '#FF6B00' : '#E9ECEF'),
                    background: paymentTerms === t ? '#FF6B00' : 'white',
                    color: paymentTerms === t ? 'white' : '#343A40',
                    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}>{t}</button>
                ))}
              </div>

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '10px' }}>Payment Method *</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {['Bank Transfer', 'Cash'].map((m) => (
                  <button key={m} onClick={() => setPaymentMethod(m)} style={{
                    padding: '10px 20px', borderRadius: '30px',
                    border: '2px solid ' + (paymentMethod === m ? '#FF6B00' : '#E9ECEF'),
                    background: paymentMethod === m ? '#FF6B00' : 'white',
                    color: paymentMethod === m ? 'white' : '#343A40',
                    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}>{m}</button>
                ))}
              </div>

              <div style={{ background: '#FFF5EB', padding: '15px', borderRadius: '8px', fontSize: '0.85rem', color: '#6C757D', borderLeft: '3px solid #FF6B00' }}>
                ℹ️ Shipping cost will be provided by our team after review.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} style={{
                  padding: '14px 26px', background: 'transparent', color: '#003366',
                  border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }}>← Back</button>
                <button onClick={goNext} style={{
                  padding: '14px 26px', background: '#FF6B00', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }}>Next →</button>
              </div>
            </>
          )}

          {/* STEP 5 (SEA) / STEP 6 (AIR): Review */}
          {((step === 5 && isSea) || (step === 6 && !isSea)) && (
            <>
              <h3 style={{ color: '#003366', fontSize: '1.2rem', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5' }}>
                {isSea ? 'Step 5' : 'Step 6'} — Review & Submit
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '0.9rem', lineHeight: 1.8 }}>
                <div>
                  <h4 style={{ color: '#003366', marginBottom: '8px' }}>📤 Shipment</h4>
                  <div><b>Mode:</b> {shipMode}</div>
                  {!isSea && <div><b>Parcel Type:</b> {parcelType === 'Others' ? `Others: ${parcelTypeCustom}` : parcelType}</div>}
                  <div><b>Description:</b> {shipment.description || '—'}</div>
                  <div><b>Packages:</b> {shipment.packages}</div>
                  <div><b>Weight:</b> {shipment.totalWeight} kg</div>
                  {isSea && <div><b>CBM:</b> {shipment.totalCbm} m³</div>}
                  {!isSea && <div><b>Value:</b> {shipment.totalValue} {shipment.valueCurrency}</div>}
                </div>
                <div>
                  <h4 style={{ color: '#003366', marginBottom: '8px' }}>👤 Shipper</h4>
                  <div>{shipper.name}</div>
                  <div>{shipper.city}, {shipper.country}</div>
                  <div>{shipper.phone}</div>
                  <div>{shipper.email}</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', fontSize: '0.9rem', lineHeight: 1.8, marginTop: '20px' }}>
                <div>
                  <h4 style={{ color: '#003366', marginBottom: '8px' }}>👥 Consignee</h4>
                  <div>{consignee.name}</div>
                  <div>{consignee.city}, {consignee.country}</div>
                  <div>{consignee.phone}</div>
                  <div>{consignee.email}</div>
                  {consignee.bin && <div>BIN: {consignee.bin}</div>}
                </div>
                <div>
                  <h4 style={{ color: '#003366', marginBottom: '8px' }}>💳 Payment</h4>
                  <div><b>Type:</b> {paymentTerms}</div>
                  <div><b>Method:</b> {paymentMethod}</div>
                  <div><b>Currency:</b> USD</div>
                </div>
              </div>

              <div style={{ background: '#FFF5EB', padding: '15px', borderRadius: '8px', marginTop: '20px', fontSize: '0.9rem', borderLeft: '3px solid #FF6B00' }}>
                ℹ️ After submission, our admin team will review your booking and provide the shipping cost.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} disabled={loading} style={{
                  padding: '14px 26px', background: 'transparent', color: '#003366',
                  border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit'
                }}>← Back</button>
                <button onClick={handleSubmit} disabled={loading} style={{
                  padding: '14px 26px', background: '#FF6B00', color: 'white',
                  border: 'none', borderRadius: '8px', fontWeight: 700,
                  cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
                  fontFamily: 'inherit'
                }}>
                  {loading ? 'Submitting...' : '✅ Submit Booking'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <Footer />
    </>
  );
}

// ==================== Reusable Field Components ====================

function Field({ label, value, onChange, type = 'text', placeholder = '', textarea = false }) {
  const baseStyle = {
    width: '100%',
    padding: '13px 15px',
    fontSize: '0.95rem',
    border: '2px solid #E9ECEF',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'inherit'
  };
  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>
        {label}
      </label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...baseStyle, minHeight: '80px', resize: 'vertical' }} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={baseStyle} />
      )}
    </div>
  );
}

function SelectField({ label, value, onChange, countries, options }) {
  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>
        {label}
      </label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        width: '100%', padding: '13px 15px', fontSize: '0.95rem',
        border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none',
        background: 'white', fontFamily: 'inherit'
      }}>
        <option value="">-- Select --</option>
        {countries && countries.map((c) => (
          <option key={c.code} value={c.code}>{c.name}</option>
        ))}
        {options && options.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
      </select>
    </div>
  );
}
