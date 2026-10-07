'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '../components/Header';
import Footer from '../components/Footer';

const COUNTRY_NAMES = {
  AF: 'Afghanistan', AL: 'Albania', DZ: 'Algeria', AD: 'Andorra', AO: 'Angola',
  AR: 'Argentina', AM: 'Armenia', AU: 'Australia', AT: 'Austria', AZ: 'Azerbaijan',
  BS: 'Bahamas', BH: 'Bahrain', BD: 'Bangladesh', BB: 'Barbados', BY: 'Belarus',
  BE: 'Belgium', BZ: 'Belize', BJ: 'Benin', BT: 'Bhutan', BO: 'Bolivia',
  BA: 'Bosnia and Herzegovina', BW: 'Botswana', BR: 'Brazil', BN: 'Brunei',
  BG: 'Bulgaria', BF: 'Burkina Faso', BI: 'Burundi', KH: 'Cambodia',
  CM: 'Cameroon', CA: 'Canada', CV: 'Cape Verde', CF: 'Central African Republic',
  TD: 'Chad', CL: 'Chile', CN: 'China', CO: 'Colombia', KM: 'Comoros',
  CG: 'Congo', CD: 'Congo (DRC)', CR: 'Costa Rica', CI: 'Ivory Coast',
  HR: 'Croatia', CU: 'Cuba', CY: 'Cyprus', CZ: 'Czechia', DK: 'Denmark',
  DJ: 'Djibouti', DM: 'Dominica', DO: 'Dominican Republic', EC: 'Ecuador',
  EG: 'Egypt', SV: 'El Salvador', GQ: 'Equatorial Guinea', ER: 'Eritrea',
  EE: 'Estonia', ET: 'Ethiopia', FJ: 'Fiji', FI: 'Finland', FR: 'France',
  GA: 'Gabon', GM: 'Gambia', GE: 'Georgia', DE: 'Germany', GH: 'Ghana',
  GR: 'Greece', GD: 'Grenada', GT: 'Guatemala', GN: 'Guinea', GY: 'Guyana',
  HT: 'Haiti', HN: 'Honduras', HK: 'Hong Kong', HU: 'Hungary', IS: 'Iceland',
  IN: 'India', ID: 'Indonesia', IR: 'Iran', IQ: 'Iraq', IE: 'Ireland',
  IL: 'Israel', IT: 'Italy', JM: 'Jamaica', JP: 'Japan', JO: 'Jordan',
  KZ: 'Kazakhstan', KE: 'Kenya', KW: 'Kuwait', KG: 'Kyrgyzstan', LA: 'Laos',
  LV: 'Latvia', LB: 'Lebanon', LS: 'Lesotho', LR: 'Liberia', LY: 'Libya',
  LI: 'Liechtenstein', LT: 'Lithuania', LU: 'Luxembourg', MO: 'Macao',
  MG: 'Madagascar', MW: 'Malawi', MY: 'Malaysia', MV: 'Maldives', ML: 'Mali',
  MT: 'Malta', MH: 'Marshall Islands', MR: 'Mauritania', MU: 'Mauritius',
  MX: 'Mexico', FM: 'Micronesia', MD: 'Moldova', MC: 'Monaco', MN: 'Mongolia',
  ME: 'Montenegro', MA: 'Morocco', MZ: 'Mozambique', MM: 'Myanmar',
  NA: 'Namibia', NP: 'Nepal', NL: 'Netherlands', NZ: 'New Zealand',
  NI: 'Nicaragua', NE: 'Niger', NG: 'Nigeria', NO: 'Norway', OM: 'Oman',
  PK: 'Pakistan', PA: 'Panama', PG: 'Papua New Guinea', PY: 'Paraguay',
  PE: 'Peru', PH: 'Philippines', PL: 'Poland', PT: 'Portugal', QA: 'Qatar',
  RO: 'Romania', RU: 'Russia', RW: 'Rwanda', SA: 'Saudi Arabia', SN: 'Senegal',
  RS: 'Serbia', SC: 'Seychelles', SG: 'Singapore', SK: 'Slovakia', SI: 'Slovenia',
  SB: 'Solomon Islands', SO: 'Somalia', ZA: 'South Africa', KR: 'South Korea',
  SS: 'South Sudan', ES: 'Spain', LK: 'Sri Lanka', SD: 'Sudan', SR: 'Suriname',
  SE: 'Sweden', CH: 'Switzerland', SY: 'Syria', TW: 'Taiwan', TJ: 'Tajikistan',
  TZ: 'Tanzania', TH: 'Thailand', TL: 'Timor-Leste', TG: 'Togo', TO: 'Tonga',
  TT: 'Trinidad and Tobago', TN: 'Tunisia', TR: 'Turkey', TM: 'Turkmenistan',
  UG: 'Uganda', UA: 'Ukraine', AE: 'United Arab Emirates', GB: 'United Kingdom',
  US: 'United States', UY: 'Uruguay', UZ: 'Uzbekistan', VU: 'Vanuatu',
  VE: 'Venezuela', VN: 'Vietnam', YE: 'Yemen', ZM: 'Zambia', ZW: 'Zimbabwe'
};

function countryName(code) {
  if (!code) return '';
  const upper = String(code).toUpperCase().trim();
  return COUNTRY_NAMES[upper] || code;
}

const FIELD_ERROR_STYLE = {
  borderColor: '#DC3545',
  borderWidth: '2px',
  borderStyle: 'solid',
  background: '#FFF5F5',
};

function FieldError({ message }) {
  if (!message) return null;
  return (
    <div style={{ fontSize: '0.75rem', color: '#DC3545', marginTop: '4px', fontWeight: 600 }}>
      ⚠ {message}
    </div>
  );
}

export default function BookPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [countries, setCountries] = useState([]);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);

  // G.28 — per-field error map (key → message)
  const [fieldErrors, setFieldErrors] = useState({});

  const [savedShippers, setSavedShippers] = useState([]);
  const [savedConsignees, setSavedConsignees] = useState([]);
  const [selectedShipper, setSelectedShipper] = useState('');
  const [selectedConsignee, setSelectedConsignee] = useState('');

  const [creditApproved, setCreditApproved] = useState(false);
  const [creditLimit, setCreditLimit] = useState(0);
  const [creditTermsDays, setCreditTermsDays] = useState(30);

  const [profileIncomplete, setProfileIncomplete] = useState(false);
  const [profileChecked, setProfileChecked] = useState(false);

  const [shipMode, setShipMode] = useState('');
  const [seaLoadType, setSeaLoadType] = useState('');
  const [parcelType, setParcelType] = useState('');
  const [parcelTypeCustom, setParcelTypeCustom] = useState('');
  const [shipper, setShipper] = useState({ name: '', fullAddress: '', city: '', state: '', country: '', email: '', phone: '' });
  const [consignee, setConsignee] = useState({ name: '', fullAddress: '', city: '', state: '', country: '', email: '', phone: '', bin: '' });
  const [saveShipper, setSaveShipper] = useState(false);
  const [saveConsignee, setSaveConsignee] = useState(false);
  const [shipment, setShipment] = useState({
    shipperRef: '', shipmentDate: new Date().toISOString().slice(0, 10),
    description: '', packages: 1, totalWeight: '', totalValue: '',
    valueCurrency: 'USD', specialInstruction: '',
    parcelReadyDate: new Date().toISOString().slice(0, 10),
    parcelReadyTime: '10:00',
    pickupService: true,
    pickupSameAsShipper: true,
    pickupAddress: '', pickupCity: '', pickupState: '', pickupCountry: '',
    hsCode: '', totalCbm: '',
    originCountry: '',
    dimLength: '', dimWidth: '', dimHeight: '',
    packagingType: '', packagingTypeCustom: '',
    deliveryTimeline: ''
  });
  const [paymentTerms, setPaymentTerms] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [freightBillTo, setFreightBillTo] = useState('');
  const [dutyTaxBillTo, setDutyTaxBillTo] = useState('');
  const [invoiceFiles, setInvoiceFiles] = useState([]);
  const [packingListFiles, setPackingListFiles] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [customService, setCustomService] = useState('sxl');
  const [deliveryService, setDeliveryService] = useState('sxl');

  useEffect(() => {
    const stored = localStorage.getItem('sxl_user');
    if (!stored) { router.push('/login'); return; }
    try { setUser(JSON.parse(stored)); } catch (e) { router.push('/login'); }

    fetch('/api/countries')
      .then((r) => r.json())
      .then((d) => setCountries(d.countries || []))
      .catch(() => setCountries([]));

    loadAddresses();
    loadCreditStatus();
  }, [router]);

  async function loadAddresses() {
    const token = localStorage.getItem('sxl_token');
    if (!token) return;
    try {
      const [r1, r2] = await Promise.all([
        fetch('/api/customer/addresses?type=Shipper', { headers: { Authorization: 'Bearer ' + token } }).then((r) => r.json()),
        fetch('/api/customer/addresses?type=Consignee', { headers: { Authorization: 'Bearer ' + token } }).then((r) => r.json()),
      ]);
      if (r1.success) setSavedShippers(r1.addresses || []);
      if (r2.success) setSavedConsignees(r2.addresses || []);
    } catch (e) { /* silent */ }
  }

  async function loadCreditStatus() {
    const token = localStorage.getItem('sxl_token');
    if (!token) return;
    try {
      const res = await fetch('/api/customer/profile', { headers: { Authorization: 'Bearer ' + token } });
      const data = await res.json();
      if (data.success && data.profile) {
        const p = data.profile;
        setCreditApproved(p.creditApproved === true);
        setCreditLimit(p.creditLimit || 0);
        setCreditTermsDays(p.creditTermsDays || 30);

        const missing = !p.companyName || !p.companyAddress || !p.companyCity || !p.companyCountry || !p.contactPerson || !p.phone;
        setProfileIncomplete(missing);

        if (p.companyName && !shipper.name) {
          setShipper({
            name: p.companyName || '',
            fullAddress: p.companyAddress || '',
            city: p.companyCity || '',
            state: p.companyState || '',
            country: p.companyCountry || '',
            email: p.email || '',
            phone: p.phone || '',
          });
        }
      }
      setProfileChecked(true);
    } catch (e) {
      setProfileChecked(true);
    }
  }

  // ===== G.28 — field error helpers =====
  function clearFieldError(key) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function clearFields(keys) {
    setFieldErrors((prev) => {
      const next = { ...prev };
      let changed = false;
      keys.forEach((k) => { if (next[k]) { delete next[k]; changed = true; } });
      return changed ? next : prev;
    });
  }

  function fieldErrProps(key) {
    return fieldErrors[key] ? FIELD_ERROR_STYLE : {};
  }

  function setShipperField(k, v) {
    setShipper((s) => ({ ...s, [k]: v }));
    clearFieldError('shipper.' + k);
  }
  function setConsigneeField(k, v) {
    setConsignee((s) => ({ ...s, [k]: v }));
    clearFieldError('consignee.' + k);
  }
  function setShipmentField(k, v) {
    setShipment((s) => ({ ...s, [k]: v }));
    clearFieldError('shipment.' + k);
  }

  function pickShipper(id) {
    setSelectedShipper(id);
    const a = savedShippers.find((x) => x.addressId === id);
    if (!a) return;
    setShipper({
      name: a.name || '', fullAddress: a.fullAddress || '', city: a.city || '',
      state: a.state || '', country: a.country || '', email: a.email || '', phone: a.phone || '',
    });
    clearFields(['shipper.name', 'shipper.fullAddress', 'shipper.country', 'shipper.email', 'shipper.phone']);
  }

  function pickConsignee(id) {
    setSelectedConsignee(id);
    const a = savedConsignees.find((x) => x.addressId === id);
    if (!a) return;
    setConsignee({
      name: a.name || '', fullAddress: a.fullAddress || '', city: a.city || '',
      state: a.state || '', country: a.country || '', email: a.email || '',
      phone: a.phone || '', bin: a.bin || '',
    });
    clearFields(['consignee.name', 'consignee.fullAddress', 'consignee.country', 'consignee.email', 'consignee.phone', 'consignee.bin']);
  }

  function pickParcelType(p) {
    setParcelType(p);
    clearFields(['parcelType', 'parcelTypeCustom', 'shipment.deliveryTimeline']);
    if (p !== 'Others') setParcelTypeCustom('');
    if (p !== 'Special Parcel') {
      setShipmentField('deliveryTimeline', '');
    }
  }

  const isSea = shipMode === 'SEA';
  const isSpecialParcel = parcelType === 'Special Parcel';
  const showBillingParty = !(!isSea && isSpecialParcel);

  const steps = isSea
    ? ['Ship Mode', 'Shipper & Consignee', 'Shipment Details', 'Select Packaging', 'Pickup Service', 'Custom & Delivery', 'Payment', 'Review']
    : ['Ship Mode', 'Parcel Type', 'Shipper & Consignee', 'Shipment Details', 'Select Packaging', 'Pickup Service', 'Custom & Delivery', 'Payment', 'Review'];

  function getNextStep(current) { return current + 1; }
  function getPrevStep(current) {
    if (current === 2 && isSea) return 1;
    return current - 1;
  }

  // ===== Validation — returns { message, fields } =====
  function validateStep1() {
    const errs = {};
    if (!shipMode) errs.shipMode = 'Please select a ship mode';
    if (shipMode === 'SEA' && !seaLoadType) errs.seaLoadType = 'Please select LCL or FCL';
    const count = Object.keys(errs).length;
    return count === 0 ? null : { message: count + ' field(s) need attention', fields: errs };
  }
  function validateParcel() {
    const errs = {};
    if (!parcelType) errs.parcelType = 'Please select a parcel type';
    if (parcelType === 'Others' && !parcelTypeCustom.trim()) errs.parcelTypeCustom = 'Please specify the parcel type';
    if (parcelType === 'Special Parcel' && !shipment.deliveryTimeline.trim()) {
      errs['shipment.deliveryTimeline'] = 'Please select a Delivery Timeline';
    }
    const count = Object.keys(errs).length;
    return count === 0 ? null : { message: count + ' field(s) need attention', fields: errs };
  }
  function validateParties() {
    const errs = {};
    if (!shipper.name) errs['shipper.name'] = 'Required';
    if (!shipper.fullAddress) errs['shipper.fullAddress'] = 'Required';
    if (!shipper.country) errs['shipper.country'] = 'Required';
    if (!shipper.email) errs['shipper.email'] = 'Required';
    if (!shipper.phone) errs['shipper.phone'] = 'Required';
    if (!consignee.name) errs['consignee.name'] = 'Required';
    if (!consignee.fullAddress) errs['consignee.fullAddress'] = 'Required';
    if (!consignee.country) errs['consignee.country'] = 'Required';
    if (!consignee.email) errs['consignee.email'] = 'Required';
    if (!consignee.phone) errs['consignee.phone'] = 'Required';
    if (!consignee.bin) errs['consignee.bin'] = 'Required';
    const count = Object.keys(errs).length;
    return count === 0 ? null : { message: count + ' field(s) need attention', fields: errs };
  }
  function validateShipment() {
    const errs = {};
    if (!shipment.description.trim()) errs['shipment.description'] = 'Required';
    if (!shipment.hsCode.trim()) errs['shipment.hsCode'] = 'Required';
    if (!shipment.originCountry) errs['shipment.originCountry'] = 'Required';
    const count = Object.keys(errs).length;
    return count === 0 ? null : { message: count + ' field(s) need attention', fields: errs };
  }
  function validatePackaging() {
    const errs = {};
    if (!shipment.packagingType) errs['shipment.packagingType'] = 'Required';
    if (shipment.packagingType === 'Others' && !shipment.packagingTypeCustom.trim()) {
      errs['shipment.packagingTypeCustom'] = 'Required';
    }
    if (!shipment.dimLength || parseFloat(shipment.dimLength) <= 0) errs['shipment.dimLength'] = 'Required';
    if (!shipment.dimWidth || parseFloat(shipment.dimWidth) <= 0) errs['shipment.dimWidth'] = 'Required';
    if (!shipment.dimHeight || parseFloat(shipment.dimHeight) <= 0) errs['shipment.dimHeight'] = 'Required';
    if (!shipment.packages || parseInt(shipment.packages, 10) <= 0) errs['shipment.packages'] = 'Required';
    if (!shipment.totalWeight || parseFloat(shipment.totalWeight) <= 0) errs['shipment.totalWeight'] = 'Required';
    if (isSea) {
      if (!shipment.totalCbm || parseFloat(shipment.totalCbm) <= 0) errs['shipment.totalCbm'] = 'Required';
    }
    if (!shipment.totalValue || parseFloat(shipment.totalValue) <= 0) {
      errs['shipment.totalValue'] = 'Required';
    }
    if (showBillingParty) {
      if (!freightBillTo) errs.freightBillTo = 'Please select';
      if (!dutyTaxBillTo) errs.dutyTaxBillTo = 'Please select';
    }
    const count = Object.keys(errs).length;
    return count === 0 ? null : { message: count + ' field(s) need attention', fields: errs };
  }
  function validatePickup() {
    const errs = {};
    if (shipment.pickupService && !shipment.pickupSameAsShipper) {
      if (!shipment.pickupAddress.trim()) errs['shipment.pickupAddress'] = 'Required';
      if (!shipment.pickupCity.trim()) errs['shipment.pickupCity'] = 'Required';
      if (!shipment.pickupCountry.trim()) errs['shipment.pickupCountry'] = 'Required';
    }
    if (!shipment.parcelReadyDate) errs['shipment.parcelReadyDate'] = 'Required';
    if (!shipment.parcelReadyTime) errs['shipment.parcelReadyTime'] = 'Required';
    const count = Object.keys(errs).length;
    return count === 0 ? null : { message: count + ' field(s) need attention', fields: errs };
  }
  function validateCustomDelivery() {
    const errs = {};
    if (!customService) errs.customService = 'Please select';
    if (!deliveryService) errs.deliveryService = 'Please select';
    const count = Object.keys(errs).length;
    return count === 0 ? null : { message: count + ' field(s) need attention', fields: errs };
  }
  function validatePayment() {
    const errs = {};
    if (!paymentTerms) errs.paymentTerms = 'Please select';
    if (!paymentMethod) errs.paymentMethod = 'Please select';
    if (paymentTerms === 'Credit Account' && !creditApproved) {
      errs.paymentTerms = 'Credit Account is not available';
    }
    if (invoiceFiles.length === 0) errs.invoiceFiles = 'Please upload at least one Invoice file';
    if (packingListFiles.length === 0) errs.packingListFiles = 'Please upload at least one Packing List file';
    const count = Object.keys(errs).length;
    return count === 0 ? null : { message: count + ' field(s) need attention', fields: errs };
  }

  function goNext() {
    setError('');
    setFieldErrors({});

    let result = null;
    if (step === 1) result = validateStep1();
    else if (step === 2 && !isSea) result = validateParcel();
    else if ((step === 2 && isSea) || (step === 3 && !isSea)) result = validateParties();
    else if ((step === 3 && isSea) || (step === 4 && !isSea)) result = validateShipment();
    else if ((step === 4 && isSea) || (step === 5 && !isSea)) result = validatePackaging();
    else if ((step === 5 && isSea) || (step === 6 && !isSea)) result = validatePickup();
    else if ((step === 6 && isSea) || (step === 7 && !isSea)) result = validateCustomDelivery();
    else if ((step === 7 && isSea) || (step === 8 && !isSea)) result = validatePayment();

    if (result) {
      // G.28 — show inline errors on each missing field + scroll to top
      setFieldErrors(result.fields);
      setError('⚠ Please fix the highlighted fields before continuing.');
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
      return;
    }
    setStep(getNextStep(step));
  }

  function goPrev() { setError(''); setFieldErrors({}); setStep(getPrevStep(step)); }

  async function uploadFileToSupabase(file, kind) {
    const token = localStorage.getItem('sxl_token');
    const formData = new FormData();
    formData.append('file', file);
    formData.append('kind', kind);

    const res = await fetch('/api/bookings/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token },
      body: formData,
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Upload failed');
    return data.url;
  }

  function handleFileDrop(e, kind) {
    e.preventDefault();
    e.stopPropagation();
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;
    addFiles(files, kind);
  }

  function handleFileInput(e, kind) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    addFiles(files, kind);
  }

  function addFiles(files, kind) {
    const validFiles = files.filter((f) => f.size <= 10 * 1024 * 1024);
    if (validFiles.length !== files.length) {
      setError('Some files exceed the 10 MB limit and were skipped.');
    }
    if (kind === 'invoice') {
      setInvoiceFiles((prev) => [...prev, ...validFiles]);
      clearFieldError('invoiceFiles');
    } else {
      setPackingListFiles((prev) => [...prev, ...validFiles]);
      clearFieldError('packingListFiles');
    }
  }

  function removeFile(kind, index) {
    if (kind === 'invoice') setInvoiceFiles((prev) => prev.filter((_, i) => i !== index));
    else setPackingListFiles((prev) => prev.filter((_, i) => i !== index));
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  }

  async function saveAddressIfChecked(type, data, checked) {
    if (!checked) return;
    const token = localStorage.getItem('sxl_token');
    try {
      await fetch('/api/customer/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ type, ...data }),
      });
    } catch (e) { /* silent */ }
  }

  async function handleSubmit() {
    setError('');
    setLoading(true);

    const token = localStorage.getItem('sxl_token');
    if (!token) {
      setError('Your session has expired. Please logout and login again.');
      setLoading(false);
      return;
    }

    await saveAddressIfChecked('Shipper', shipper, saveShipper);
    await saveAddressIfChecked('Consignee', consignee, saveConsignee);

    let invoiceUrls = [];
    let packingListUrls = [];
    try {
      setUploading(true);
      for (const file of invoiceFiles) {
        const url = await uploadFileToSupabase(file, 'invoice');
        invoiceUrls.push({ name: file.name, url, size: file.size });
      }
      for (const file of packingListFiles) {
        const url = await uploadFileToSupabase(file, 'packingList');
        packingListUrls.push({ name: file.name, url, size: file.size });
      }
      setUploading(false);
    } catch (uploadErr) {
      setError('File upload failed: ' + uploadErr.message);
      setUploading(false);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/bookings/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token,
        },
        body: JSON.stringify({
          shipMode, seaLoadType, parcelType, parcelTypeCustom,
          shipper, consignee, shipment,
          freightBillTo, dutyTaxBillTo,
          paymentTerms, paymentMethod,
          invoiceUrls, packingListUrls,
          customService, deliveryService,
        }),
      });
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Booking failed.');
        setLoading(false);
        return;
      }

      setSuccess({ trackingNumber: data.trackingNumber, invoiceUrls, packingListUrls });
      setLoading(false);
    } catch (err) {
      setError('Connection error. Please try again.');
      setLoading(false);
    }
  }

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

  if (success) {
    const invoices = success.invoiceUrls || [];
    const packingLists = success.packingListUrls || [];

    return (
      <>
        <Header />
        <div style={{ maxWidth: '700px', margin: '60px auto', padding: '0 20px 60px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '40px', textAlign: 'center', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
            <div style={{ width: '80px', height: '80px', background: '#00A86B', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', margin: '0 auto 20px', color: 'white' }}>✓</div>
            <h2 style={{ color: '#003366', fontSize: '1.6rem', marginBottom: '10px' }}>Booking Confirmed!</h2>
            <p style={{ color: '#6C757D', marginBottom: '25px' }}>Your shipment has been registered.</p>
            <div style={{ fontFamily: 'Consolas, monospace', fontSize: '1.8rem', fontWeight: 800, color: '#FF6B00', margin: '15px 0', padding: '15px', background: '#FFF5EB', borderRadius: '10px', border: '2px dashed #FF6B00' }}>
              {success.trackingNumber}
            </div>

            <div style={{ margin: '25px auto', maxWidth: '500px', padding: '20px', background: '#E8F7EF', borderRadius: '12px', border: '2px solid #00A86B' }}>
              <p style={{ fontWeight: 700, color: '#003366', marginBottom: '12px' }}>Save your booking confirmation</p>
              <a href={'/api/pdf/booking/' + success.trackingNumber} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', width: '100%', padding: '14px 26px', background: '#00A86B', color: 'white', borderRadius: '8px', fontWeight: 700, textDecoration: 'none', fontSize: '1rem', textAlign: 'center', boxSizing: 'border-box' }}>Download Booking PDF</a>
            </div>

            <div style={{ margin: '25px auto', maxWidth: '500px', padding: '20px', background: '#FFF5EB', borderRadius: '12px', border: '2px solid #FF6B00', textAlign: 'left' }}>
              <p style={{ fontWeight: 800, color: '#8B4500', marginBottom: '10px', fontSize: '1rem' }}>
                ⚠️ IMPORTANT — Print & Attach with your parcel
              </p>
              <p style={{ fontSize: '0.9rem', color: '#343A40', marginBottom: '15px' }}>
                Please print and attach the following documents with your shipment:
              </p>
              <div style={{ fontSize: '0.95rem', lineHeight: 2, color: '#003366' }}>
                <div>📄 Booking Confirmation ....... <b>3 copies</b></div>
                <div>📄 Invoice ................... <b>3 copies</b></div>
                <div>📄 Packing List .............. <b>3 copies</b></div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '15px' }}>
                <a href={'/api/pdf/booking/' + success.trackingNumber} target="_blank" rel="noopener noreferrer" style={{ padding: '10px 16px', background: '#003366', color: 'white', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', textDecoration: 'none' }}>
                  🖨️ Print Booking
                </a>
                {invoices.length > 0 && (
                  <button type="button" onClick={() => invoices.forEach((f) => window.open(f.url, '_blank', 'noopener'))} style={{ padding: '10px 16px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                    🖨️ Print Invoice ({invoices.length})
                  </button>
                )}
                {packingLists.length > 0 && (
                  <button type="button" onClick={() => packingLists.forEach((f) => window.open(f.url, '_blank', 'noopener'))} style={{ padding: '10px 16px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'inherit' }}>
                    🖨️ Print Packing List ({packingLists.length})
                  </button>
                )}
              </div>
            </div>

            <div style={{ marginTop: '25px', display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/dashboard" style={{ padding: '12px 24px', background: '#FF6B00', color: 'white', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>Go to Dashboard</Link>
              <Link href={'/track?tn=' + success.trackingNumber} style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>Track Shipment</Link>
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

        {step === 1 && profileChecked && profileIncomplete && (
          <div style={{
            background: '#FFF3CD', border: '2px solid #FFC107', borderLeft: '5px solid #FF6B00',
            borderRadius: '12px', padding: '16px 20px', marginBottom: '20px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px', flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '1.6rem' }}>💡</span>
              <div>
                <div style={{ fontWeight: 800, color: '#856404', fontSize: '0.95rem', marginBottom: '2px' }}>
                  Complete your Shipper Information
                </div>
                <div style={{ color: '#856404', fontSize: '0.85rem' }}>
                  You can add your company address, city, and country in My Account for faster bookings.
                </div>
              </div>
            </div>
            <Link href="/account" style={{
              padding: '10px 18px', background: '#FF6B00', color: 'white',
              borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem',
              textDecoration: 'none', whiteSpace: 'nowrap'
            }}>
              Update My Account →
            </Link>
          </div>
        )}

        <div style={{ display: 'flex', gap: '8px', marginBottom: '30px', overflowX: 'auto', paddingBottom: '5px' }}>
          {steps.map((label, idx) => {
            const num = idx + 1;
            const state = num === step ? 'active' : (num < step ? 'done' : 'pending');
            return (
              <div key={idx} style={{
                flex: 1, minWidth: '110px', padding: '12px 14px',
                background: state === 'active' ? '#FFF5EB' : state === 'done' ? '#E8F7EF' : 'white',
                borderRadius: '10px',
                border: '2px solid ' + (state === 'active' ? '#FF6B00' : state === 'done' ? '#00A86B' : '#E9ECEF'),
                textAlign: 'center', fontSize: '0.75rem', fontWeight: 700,
                color: state === 'active' ? '#FF6B00' : state === 'done' ? '#00A86B' : '#6C757D'
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
          <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '10px', padding: '15px 20px', marginBottom: '20px', fontWeight: 600 }}>
            {error}
          </div>
        )}

        <div style={{ background: 'white', borderRadius: '12px', padding: '30px', boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>

          {step === 1 && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>Step 1 - Select Ship Mode</h3>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                {[{ value: 'SEA', icon: '🚢', label: 'SEA Freight', sub: 'Cost-effective ocean shipping' },
                  { value: 'AIR', icon: '✈️', label: 'AIR Freight', sub: 'Fast air delivery' }].map((m) => (
                  <button key={m.value} onClick={() => { setShipMode(m.value); clearFieldError('shipMode'); if (m.value !== 'SEA') setSeaLoadType(''); }} style={{
                    padding: '25px 15px',
                    border: '3px solid ' + (shipMode === m.value ? '#FF6B00' : (fieldErrors.shipMode ? '#DC3545' : '#E9ECEF')),
                    borderRadius: '12px', textAlign: 'center', cursor: 'pointer',
                    background: shipMode === m.value ? '#FFF5EB' : (fieldErrors.shipMode ? '#FFF5F5' : 'white'),
                    fontFamily: 'inherit'
                  }}>
                    <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '8px' }}>{m.icon}</span>
                    <div style={{ fontWeight: 800, color: '#003366', fontSize: '1.05rem' }}>{m.label}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6C757D', marginTop: '4px' }}>{m.sub}</div>
                  </button>
                ))}
              </div>
              <FieldError message={fieldErrors.shipMode} />

              {shipMode === 'SEA' && (
                <div style={{
                  marginTop: '20px', padding: '18px 20px',
                  background: '#F0F7FF', borderLeft: '4px solid #003366',
                  borderRadius: '10px'
                }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#003366', marginBottom: '10px' }}>
                    Sea Load Type *
                  </label>
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {[
                      { value: 'LCL', label: 'LCL', sub: 'Less than Container Load' },
                      { value: 'FCL', label: 'FCL', sub: 'Full Container Load' },
                    ].map((opt) => (
                      <button key={opt.value} type="button" onClick={() => { setSeaLoadType(opt.value); clearFieldError('seaLoadType'); }} style={{
                        flex: 1, minWidth: '180px', padding: '14px 18px',
                        border: '3px solid ' + (seaLoadType === opt.value ? '#003366' : (fieldErrors.seaLoadType ? '#DC3545' : '#E9ECEF')),
                        background: seaLoadType === opt.value ? '#E0EDFF' : (fieldErrors.seaLoadType ? '#FFF5F5' : 'white'),
                        borderRadius: '10px', cursor: 'pointer',
                        fontFamily: 'inherit', textAlign: 'left'
                      }}>
                        <div style={{ fontWeight: 800, color: '#003366', fontSize: '1rem', marginBottom: '3px' }}>
                          {opt.label}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#6C757D' }}>
                          {opt.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                  <FieldError message={fieldErrors.seaLoadType} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <Link href="/dashboard" style={{ padding: '14px 26px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, textDecoration: 'none' }}>Cancel</Link>
                <button onClick={goNext} style={{ padding: '14px 26px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Next</button>
              </div>
            </>
          )}

          {step === 2 && !isSea && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>Step 2 - Parcel Type</h3>
                <button onClick={goPrev} style={{ padding: '6px 14px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>◀ Back</button>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                {['Document', 'No-Document (Sample)', 'Special Parcel', 'Others'].map((p) => (
                  <button key={p} onClick={() => pickParcelType(p)} style={{
                    padding: '10px 20px', borderRadius: '30px',
                    border: '2px solid ' + (parcelType === p ? '#FF6B00' : (fieldErrors.parcelType ? '#DC3545' : '#E9ECEF')),
                    background: parcelType === p ? '#FF6B00' : (fieldErrors.parcelType ? '#FFF5F5' : 'white'),
                    color: parcelType === p ? 'white' : '#343A40',
                    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}>{p}</button>
                ))}
              </div>
              <FieldError message={fieldErrors.parcelType} />

              {parcelType === 'Others' && (
                <div style={{ marginTop: '10px', marginBottom: '15px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '6px' }}>Please specify *</label>
                  <input type="text" value={parcelTypeCustom} onChange={(e) => { setParcelTypeCustom(e.target.value); clearFieldError('parcelTypeCustom'); }}
                    placeholder="e.g., Fragile equipment, Perishable goods"
                    style={{ width: '100%', padding: '13px 15px', fontSize: '0.95rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', ...fieldErrProps('parcelTypeCustom') }} />
                  <FieldError message={fieldErrors.parcelTypeCustom} />
                </div>
              )}

              {isSpecialParcel && (
                <div style={{
                  marginTop: '20px', padding: '18px 20px',
                  background: '#FFF5EB', borderLeft: '4px solid #FF6B00',
                  borderRadius: '10px'
                }}>
                  <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: 700, color: '#8B4500', marginBottom: '10px' }}>
                    ⚡ Delivery Timeline *
                  </label>
                  <select
                    value={shipment.deliveryTimeline}
                    onChange={(e) => setShipmentField('deliveryTimeline', e.target.value)}
                    style={{
                      width: '100%', padding: '13px 15px', fontSize: '0.95rem',
                      border: '2px solid ' + (fieldErrors['shipment.deliveryTimeline'] ? '#DC3545' : '#FF6B00'),
                      borderRadius: '8px', outline: 'none',
                      background: 'white', fontFamily: 'inherit', boxSizing: 'border-box'
                    }}>
                    <option value="">-- Select Delivery Timeline --</option>
                    <option value="1 Day Express — China (Guangzhou) ↔ Bangladesh">1 Day Express — China (Guangzhou) ↔ Bangladesh</option>
                    <option value="1-2 Days — Hong Kong ↔ Bangladesh">1-2 Days — Hong Kong ↔ Bangladesh</option>
                    <option value="3-4 Days — Hong Kong ↔ Bangladesh">3-4 Days — Hong Kong ↔ Bangladesh</option>
                  </select>
                  <div style={{ fontSize: '0.8rem', color: '#8B4500', marginTop: '8px', fontStyle: 'italic' }}>
                    💡 Choose the delivery speed that matches your route
                  </div>
                  <FieldError message={fieldErrors['shipment.deliveryTimeline']} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} style={{ padding: '14px 26px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
                <button onClick={goNext} style={{ padding: '14px 26px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Next</button>
              </div>
            </>
          )}

          {((step === 2 && isSea) || (step === 3 && !isSea)) && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>
                  {isSea ? 'Step 2' : 'Step 3'} - Shipper & Consignee
                </h3>
                <button onClick={goPrev} style={{ padding: '6px 14px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>◀ Back</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <h4 style={{ color: '#003366', marginBottom: '10px' }}>FROM (Shipper)</h4>

                  {savedShippers.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FF6B00', marginBottom: '6px' }}>
                        📒 Shipper Address Book
                      </label>
                      <select value={selectedShipper} onChange={(e) => pickShipper(e.target.value)} style={{
                        width: '100%', padding: '12px', fontSize: '0.9rem',
                        border: '2px solid #FF6B00', borderRadius: '8px', outline: 'none',
                        background: '#FFF5EB', fontFamily: 'inherit', color: '#003366', fontWeight: 600
                      }}>
                        <option value="">-- Choose a Saved Address --</option>
                        {savedShippers.map((a) => (
                          <option key={a.addressId} value={a.addressId}>
                            {a.name} - {a.city}{a.city && countryName(a.country) ? ', ' : ''}{countryName(a.country)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Field label="Name *" value={shipper.name} onChange={(v) => setShipperField('name', v)} error={fieldErrors['shipper.name']} />
                  <Field label="Full Address *" value={shipper.fullAddress} onChange={(v) => setShipperField('fullAddress', v)} textarea error={fieldErrors['shipper.fullAddress']} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Field label="City" value={shipper.city} onChange={(v) => setShipperField('city', v)} />
                    <Field label="State" value={shipper.state} onChange={(v) => setShipperField('state', v)} />
                  </div>
                  <SelectField label="Country *" value={shipper.country} onChange={(v) => setShipperField('country', v)} countries={countries} error={fieldErrors['shipper.country']} />
                  <Field label="Email *" value={shipper.email} onChange={(v) => setShipperField('email', v)} type="email" error={fieldErrors['shipper.email']} />
                  <Field label="Phone *" value={shipper.phone} onChange={(v) => setShipperField('phone', v)} type="tel" error={fieldErrors['shipper.phone']} />

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', marginTop: '5px' }}>
                    <input type="checkbox" checked={saveShipper} onChange={(e) => setSaveShipper(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#FF6B00', cursor: 'pointer' }} />
                    Save to my address book
                  </label>
                </div>

                <div>
                  <h4 style={{ color: '#003366', marginBottom: '10px' }}>TO (Consignee)</h4>

                  {savedConsignees.length > 0 && (
                    <div style={{ marginBottom: '15px' }}>
                      <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#FF6B00', marginBottom: '6px' }}>
                        📒 Consignee Address Book
                      </label>
                      <select value={selectedConsignee} onChange={(e) => pickConsignee(e.target.value)} style={{
                        width: '100%', padding: '12px', fontSize: '0.9rem',
                        border: '2px solid #FF6B00', borderRadius: '8px', outline: 'none',
                        background: '#FFF5EB', fontFamily: 'inherit', color: '#003366', fontWeight: 600
                      }}>
                        <option value="">-- Choose a Saved Address --</option>
                        {savedConsignees.map((a) => (
                          <option key={a.addressId} value={a.addressId}>
                            {a.name} - {a.city}{a.city && countryName(a.country) ? ', ' : ''}{countryName(a.country)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Field label="Name *" value={consignee.name} onChange={(v) => setConsigneeField('name', v)} error={fieldErrors['consignee.name']} />
                  <Field label="Full Address *" value={consignee.fullAddress} onChange={(v) => setConsigneeField('fullAddress', v)} textarea error={fieldErrors['consignee.fullAddress']} />
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <Field label="City" value={consignee.city} onChange={(v) => setConsigneeField('city', v)} />
                    <Field label="State" value={consignee.state} onChange={(v) => setConsigneeField('state', v)} />
                  </div>
                  <SelectField label="Country *" value={consignee.country} onChange={(v) => setConsigneeField('country', v)} countries={countries} error={fieldErrors['consignee.country']} />
                  <Field label="Email *" value={consignee.email} onChange={(v) => setConsigneeField('email', v)} type="email" error={fieldErrors['consignee.email']} />
                  <Field label="Phone *" value={consignee.phone} onChange={(v) => setConsigneeField('phone', v)} type="tel" error={fieldErrors['consignee.phone']} />
                  <Field label="BIN *" value={consignee.bin} onChange={(v) => setConsigneeField('bin', v)} placeholder="Business Identification Number" error={fieldErrors['consignee.bin']} />

                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', cursor: 'pointer', marginTop: '5px' }}>
                    <input type="checkbox" checked={saveConsignee} onChange={(e) => setSaveConsignee(e.target.checked)} style={{ width: '16px', height: '16px', accentColor: '#FF6B00', cursor: 'pointer' }} />
                    Save to my address book
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} style={{ padding: '14px 26px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
                <button onClick={goNext} style={{ padding: '14px 26px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Next</button>
              </div>
            </>
          )}

          {((step === 3 && isSea) || (step === 4 && !isSea)) && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>
                  {isSea ? 'Step 3' : 'Step 4'} - Shipment Details
                </h3>
                <button onClick={goPrev} style={{ padding: '6px 14px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>◀ Back</button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <Field label="Shipper Reference Number" value={shipment.shipperRef} onChange={(v) => setShipmentField('shipperRef', v)} />
                <Field label="Shipment Date" type="date" value={shipment.shipmentDate} onChange={(v) => setShipmentField('shipmentDate', v)} />
              </div>
              <Field label="Description of Goods *" value={shipment.description} onChange={(v) => setShipmentField('description', v)} textarea error={fieldErrors['shipment.description']} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <Field label="HS Code *" value={shipment.hsCode} onChange={(v) => setShipmentField('hsCode', v)} placeholder="Harmonized System Code" error={fieldErrors['shipment.hsCode']} />
                <SelectField label="Country of Origin *" value={shipment.originCountry} onChange={(v) => setShipmentField('originCountry', v)} countries={countries} error={fieldErrors['shipment.originCountry']} />
              </div>
              <Field label="Special Instruction" value={shipment.specialInstruction} onChange={(v) => setShipmentField('specialInstruction', v)} textarea />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} style={{ padding: '14px 26px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
                <button onClick={goNext} style={{ padding: '14px 26px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Next</button>
              </div>
            </>
          )}

          {((step === 4 && isSea) || (step === 5 && !isSea)) && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>
                  {isSea ? 'Step 4' : 'Step 5'} - Select Packaging
                </h3>
                <button onClick={goPrev} style={{ padding: '6px 14px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>◀ Back</button>
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>
                  Packaging Type *
                </label>
                <select
                  value={shipment.packagingType}
                  onChange={(e) => setShipmentField('packagingType', e.target.value)}
                  style={{
                    width: '100%', padding: '13px 15px', fontSize: '0.95rem',
                    border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none',
                    background: 'white', fontFamily: 'inherit', boxSizing: 'border-box', ...fieldErrProps('shipment.packagingType')
                  }}>
                  <option value="">-- Select Packaging Type --</option>
                  <option value="Carton">Carton</option>
                  <option value="Pallet">Pallet</option>
                  <option value="Roll">Roll</option>
                  <option value="Flyer">Flyer</option>
                  <option value="Bag / Sack">Bag / Sack</option>
                  <option value="Others">Others (specify)</option>
                </select>
                <FieldError message={fieldErrors['shipment.packagingType']} />
                {shipment.packagingType === 'Others' && (
                  <input
                    type="text"
                    placeholder="Please specify packaging type *"
                    value={shipment.packagingTypeCustom}
                    onChange={(e) => setShipmentField('packagingTypeCustom', e.target.value)}
                    style={{
                      width: '100%', padding: '13px 15px', fontSize: '0.95rem',
                      border: '2px solid #FF6B00', borderRadius: '8px', outline: 'none',
                      fontFamily: 'inherit', boxSizing: 'border-box', marginTop: '10px', ...fieldErrProps('shipment.packagingTypeCustom')
                    }}
                  />
                )}
                {shipment.packagingType === 'Others' && <FieldError message={fieldErrors['shipment.packagingTypeCustom']} />}
              </div>

              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>
                  Dimensions (cm) *
                </label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                  <div>
                    <input type="number" step="0.01" min="0" placeholder="Length"
                      value={shipment.dimLength} onChange={(e) => setShipmentField('dimLength', e.target.value)}
                      style={{ width: '100%', padding: '13px 15px', fontSize: '0.95rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', ...fieldErrProps('shipment.dimLength') }} />
                    <div style={{ fontSize: '0.72rem', color: '#6C757D', marginTop: '4px', textAlign: 'center' }}>Length</div>
                    <FieldError message={fieldErrors['shipment.dimLength']} />
                  </div>
                  <div>
                    <input type="number" step="0.01" min="0" placeholder="Width"
                      value={shipment.dimWidth} onChange={(e) => setShipmentField('dimWidth', e.target.value)}
                      style={{ width: '100%', padding: '13px 15px', fontSize: '0.95rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', ...fieldErrProps('shipment.dimWidth') }} />
                    <div style={{ fontSize: '0.72rem', color: '#6C757D', marginTop: '4px', textAlign: 'center' }}>Width</div>
                    <FieldError message={fieldErrors['shipment.dimWidth']} />
                  </div>
                  <div>
                    <input type="number" step="0.01" min="0" placeholder="Height"
                      value={shipment.dimHeight} onChange={(e) => setShipmentField('dimHeight', e.target.value)}
                      style={{ width: '100%', padding: '13px 15px', fontSize: '0.95rem', border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', ...fieldErrProps('shipment.dimHeight') }} />
                    <div style={{ fontSize: '0.72rem', color: '#6C757D', marginTop: '4px', textAlign: 'center' }}>Height</div>
                    <FieldError message={fieldErrors['shipment.dimHeight']} />
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <Field label="No. of Packages *" type="number" value={shipment.packages} onChange={(v) => setShipmentField('packages', v)} error={fieldErrors['shipment.packages']} />
                <Field label="Total Weight (kg) *" type="number" value={shipment.totalWeight} onChange={(v) => setShipmentField('totalWeight', v)} error={fieldErrors['shipment.totalWeight']} />
              </div>

              {isSea && (
                <Field label="Total CBM *" type="number" value={shipment.totalCbm} onChange={(v) => setShipmentField('totalCbm', v)} error={fieldErrors['shipment.totalCbm']} />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '15px' }}>
                <Field label="Total Customs Value *" type="number" value={shipment.totalValue} onChange={(v) => setShipmentField('totalValue', v)} error={fieldErrors['shipment.totalValue']} />
                <SelectField label="Currency" value={shipment.valueCurrency} onChange={(v) => setShipmentField('valueCurrency', v)} options={['USD', 'HKD', 'CNY', 'BDT']} />
              </div>

              {showBillingParty && (
                <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '2px solid #F1F3F5' }}>
                  <h4 style={{ marginBottom: '6px', color: '#003366', fontSize: '1.05rem' }}>💰 Billing Party</h4>
                  <p style={{ color: '#6C757D', fontSize: '0.85rem', marginBottom: '15px' }}>
                    Who should be billed for this shipment?
                  </p>

                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px' }}>Who pays Freight Cost? *</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '18px' }}>
                    {['Shipper', 'Consignee', 'Third Party'].map((t) => (
                      <button key={t} type="button" onClick={() => {
                        // G.28 — toggle off if already selected
                        const next = freightBillTo === t ? '' : t;
                        setFreightBillTo(next);
                        if (next) clearFieldError('freightBillTo');
                      }} style={{
                        padding: '10px 20px', borderRadius: '30px',
                        border: '2px solid ' + (freightBillTo === t ? '#FF6B00' : (fieldErrors.freightBillTo ? '#DC3545' : '#E9ECEF')),
                        background: freightBillTo === t ? '#FF6B00' : (fieldErrors.freightBillTo ? '#FFF5F5' : 'white'),
                        color: freightBillTo === t ? 'white' : '#343A40',
                        fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit'
                      }}>{t}</button>
                    ))}
                  </div>
                  <FieldError message={fieldErrors.freightBillTo} />

                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '8px', marginTop: '15px' }}>Who pays Duty & Taxes? *</label>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                    {['Shipper', 'Consignee', 'Third Party'].map((t) => (
                      <button key={t} type="button" onClick={() => {
                        // G.28 — toggle off if already selected
                        const next = dutyTaxBillTo === t ? '' : t;
                        setDutyTaxBillTo(next);
                        if (next) clearFieldError('dutyTaxBillTo');
                      }} style={{
                        padding: '10px 20px', borderRadius: '30px',
                        border: '2px solid ' + (dutyTaxBillTo === t ? '#FF6B00' : (fieldErrors.dutyTaxBillTo ? '#DC3545' : '#E9ECEF')),
                        background: dutyTaxBillTo === t ? '#FF6B00' : (fieldErrors.dutyTaxBillTo ? '#FFF5F5' : 'white'),
                        color: dutyTaxBillTo === t ? 'white' : '#343A40',
                        fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit'
                      }}>{t}</button>
                    ))}
                  </div>
                  <FieldError message={fieldErrors.dutyTaxBillTo} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} style={{ padding: '14px 26px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
                <button onClick={goNext} style={{ padding: '14px 26px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Next</button>
              </div>
            </>
          )}

          {((step === 5 && isSea) || (step === 6 && !isSea)) && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>
                  {isSea ? 'Step 5' : 'Step 6'} - Pickup Service
                </h3>
                <button onClick={goPrev} style={{ padding: '6px 14px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>◀ Back</button>
              </div>

              <h4 style={{ marginBottom: '6px', color: '#003366', fontSize: '1.05rem' }}>🚚 Pickup Service</h4>
              <p style={{ color: '#6C757D', fontSize: '0.85rem', marginBottom: '15px' }}>
                Do you want sXL to arrange pickup from your location?
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
                <button
                  type="button"
                  onClick={() => setShipmentField('pickupService', true)}
                  style={{
                    flex: 1, minWidth: '200px', padding: '18px 20px',
                    border: '3px solid ' + (shipment.pickupService === true ? '#28A745' : '#E9ECEF'),
                    background: shipment.pickupService === true ? '#E8F7EF' : 'white',
                    borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left'
                  }}>
                  <div style={{ fontWeight: 800, color: shipment.pickupService === true ? '#155724' : '#343A40', fontSize: '1rem', marginBottom: '4px' }}>
                    ✅ Yes — Pickup by sXL
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6C757D' }}>
                    We will collect the shipment from your location
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setShipmentField('pickupService', false)}
                  style={{
                    flex: 1, minWidth: '200px', padding: '18px 20px',
                    border: '3px solid ' + (shipment.pickupService === false ? '#FF6B00' : '#E9ECEF'),
                    background: shipment.pickupService === false ? '#FFF5EB' : 'white',
                    borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left'
                  }}>
                  <div style={{ fontWeight: 800, color: shipment.pickupService === false ? '#8B4500' : '#343A40', fontSize: '1rem', marginBottom: '4px' }}>
                    📦 No — I will deliver to your warehouse
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6C757D' }}>
                    You will send the goods to our warehouse
                  </div>
                </button>
              </div>

              {shipment.pickupService === true && (
                <>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '15px' }}>
                    <button onClick={() => setShipmentField('pickupSameAsShipper', true)} style={{ padding: '10px 20px', borderRadius: '30px', border: '2px solid ' + (shipment.pickupSameAsShipper ? '#FF6B00' : '#E9ECEF'), background: shipment.pickupSameAsShipper ? '#FF6B00' : 'white', color: shipment.pickupSameAsShipper ? 'white' : '#343A40', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>Same as Shipper Address</button>
                    <button onClick={() => setShipmentField('pickupSameAsShipper', false)} style={{ padding: '10px 20px', borderRadius: '30px', border: '2px solid ' + (!shipment.pickupSameAsShipper ? '#FF6B00' : '#E9ECEF'), background: !shipment.pickupSameAsShipper ? '#FF6B00' : 'white', color: !shipment.pickupSameAsShipper ? 'white' : '#343A40', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>Different Pickup Address</button>
                  </div>

                  {!shipment.pickupSameAsShipper && (
                    <div style={{ marginTop: '15px' }}>
                      <Field label="Pickup Address *" value={shipment.pickupAddress} onChange={(v) => setShipmentField('pickupAddress', v)} textarea error={fieldErrors['shipment.pickupAddress']} />
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                        <Field label="City *" value={shipment.pickupCity} onChange={(v) => setShipmentField('pickupCity', v)} error={fieldErrors['shipment.pickupCity']} />
                        <Field label="State" value={shipment.pickupState} onChange={(v) => setShipmentField('pickupState', v)} />
                      </div>
                      <SelectField label="Country *" value={shipment.pickupCountry} onChange={(v) => setShipmentField('pickupCountry', v)} countries={countries} error={fieldErrors['shipment.pickupCountry']} />
                    </div>
                  )}
                </>
              )}

              {shipment.pickupService === false && (
                <div style={{
                  background: '#FFF5EB', borderLeft: '4px solid #FF6B00',
                  borderRadius: '8px', padding: '15px 18px', fontSize: '0.9rem', color: '#8B4500', marginBottom: '20px'
                }}>
                  <b>📧 Warehouse details will be sent after booking confirmation.</b><br />
                  Our team will email you the full warehouse address and operating hours so you can deliver your goods.
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '20px' }}>
                <Field label={(isSea ? 'Goods' : 'Parcel') + ' Ready Date *'} type="date" value={shipment.parcelReadyDate} onChange={(v) => setShipmentField('parcelReadyDate', v)} error={fieldErrors['shipment.parcelReadyDate']} />
                <Field label={(isSea ? 'Goods' : 'Parcel') + ' Ready Time *'} type="time" value={shipment.parcelReadyTime} onChange={(v) => setShipmentField('parcelReadyTime', v)} error={fieldErrors['shipment.parcelReadyTime']} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} style={{ padding: '14px 26px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
                <button onClick={goNext} style={{ padding: '14px 26px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Next</button>
              </div>
            </>
          )}

          {((step === 6 && isSea) || (step === 7 && !isSea)) && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>
                  {isSea ? 'Step 6' : 'Step 7'} - Custom & Delivery Service
                </h3>
                <button onClick={goPrev} style={{ padding: '6px 14px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>◀ Back</button>
              </div>

              <h4 style={{ marginBottom: '6px', color: '#003366', fontSize: '1.05rem' }}>🛃 Customs Clearance</h4>
              <p style={{ color: '#6C757D', fontSize: '0.85rem', marginBottom: '15px' }}>
                Who will handle the customs clearance for this shipment?
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '28px' }}>
                <button
                  type="button"
                  onClick={() => {
                    // G.28 — toggle off if already selected
                    const next = customService === 'sxl' ? '' : 'sxl';
                    setCustomService(next);
                    if (next) clearFieldError('customService');
                  }}
                  style={{
                    flex: 1, minWidth: '200px', padding: '18px 20px',
                    border: '3px solid ' + (customService === 'sxl' ? '#28A745' : (fieldErrors.customService ? '#DC3545' : '#E9ECEF')),
                    background: customService === 'sxl' ? '#E8F7EF' : (fieldErrors.customService ? '#FFF5F5' : 'white'),
                    borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left'
                  }}>
                  <div style={{ fontWeight: 800, color: customService === 'sxl' ? '#155724' : '#343A40', fontSize: '1rem', marginBottom: '4px' }}>
                    ✅ Yes — Customs handled by sXL
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6C757D' }}>
                    sXL will manage the customs clearance process
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = customService === 'consignee' ? '' : 'consignee';
                    setCustomService(next);
                    if (next) clearFieldError('customService');
                  }}
                  style={{
                    flex: 1, minWidth: '200px', padding: '18px 20px',
                    border: '3px solid ' + (customService === 'consignee' ? '#FF6B00' : (fieldErrors.customService ? '#DC3545' : '#E9ECEF')),
                    background: customService === 'consignee' ? '#FFF5EB' : (fieldErrors.customService ? '#FFF5F5' : 'white'),
                    borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left'
                  }}>
                  <div style={{ fontWeight: 800, color: customService === 'consignee' ? '#8B4500' : '#343A40', fontSize: '1rem', marginBottom: '4px' }}>
                    ⬜ No — Consignee will handle customs
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6C757D' }}>
                    Consignee is responsible for customs clearance
                  </div>
                </button>
              </div>
              <FieldError message={fieldErrors.customService} />

              <h4 style={{ marginBottom: '6px', color: '#003366', fontSize: '1.05rem', marginTop: '10px' }}>📦 Delivery Service</h4>
              <p style={{ color: '#6C757D', fontSize: '0.85rem', marginBottom: '15px' }}>
                Who will handle the final delivery to the consignee?
              </p>

              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '18px' }}>
                <button
                  type="button"
                  onClick={() => {
                    const next = deliveryService === 'sxl' ? '' : 'sxl';
                    setDeliveryService(next);
                    if (next) clearFieldError('deliveryService');
                  }}
                  style={{
                    flex: 1, minWidth: '200px', padding: '18px 20px',
                    border: '3px solid ' + (deliveryService === 'sxl' ? '#28A745' : (fieldErrors.deliveryService ? '#DC3545' : '#E9ECEF')),
                    background: deliveryService === 'sxl' ? '#E8F7EF' : (fieldErrors.deliveryService ? '#FFF5F5' : 'white'),
                    borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left'
                  }}>
                  <div style={{ fontWeight: 800, color: deliveryService === 'sxl' ? '#155724' : '#343A40', fontSize: '1rem', marginBottom: '4px' }}>
                    ✅ Yes — Delivery handled by sXL
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6C757D' }}>
                    sXL will deliver to the consignee's location
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = deliveryService === 'consignee' ? '' : 'consignee';
                    setDeliveryService(next);
                    if (next) clearFieldError('deliveryService');
                  }}
                  style={{
                    flex: 1, minWidth: '200px', padding: '18px 20px',
                    border: '3px solid ' + (deliveryService === 'consignee' ? '#FF6B00' : (fieldErrors.deliveryService ? '#DC3545' : '#E9ECEF')),
                    background: deliveryService === 'consignee' ? '#FFF5EB' : (fieldErrors.deliveryService ? '#FFF5F5' : 'white'),
                    borderRadius: '12px', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left'
                  }}>
                  <div style={{ fontWeight: 800, color: deliveryService === 'consignee' ? '#8B4500' : '#343A40', fontSize: '1rem', marginBottom: '4px' }}>
                    ⬜ No — Consignee will handle delivery
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#6C757D' }}>
                    Consignee will arrange their own delivery
                  </div>
                </button>
              </div>
              <FieldError message={fieldErrors.deliveryService} />

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} style={{ padding: '14px 26px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
                <button onClick={goNext} style={{ padding: '14px 26px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Next</button>
              </div>
            </>
          )}

          {((step === 7 && isSea) || (step === 8 && !isSea)) && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>
                  {isSea ? 'Step 7' : 'Step 8'} - Payment Terms
                </h3>
                <button onClick={goPrev} style={{ padding: '6px 14px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>◀ Back</button>
              </div>

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '10px' }}>Payment Type *</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {['Prepaid', 'Collect'].map((t) => (
                  <button key={t} onClick={() => { setPaymentTerms(t); clearFieldError('paymentTerms'); }} style={{
                    padding: '10px 20px', borderRadius: '30px',
                    border: '2px solid ' + (paymentTerms === t ? '#FF6B00' : (fieldErrors.paymentTerms ? '#DC3545' : '#E9ECEF')),
                    background: paymentTerms === t ? '#FF6B00' : (fieldErrors.paymentTerms ? '#FFF5F5' : 'white'),
                    color: paymentTerms === t ? 'white' : '#343A40',
                    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}>{t}</button>
                ))}

                {creditApproved ? (
                  <button onClick={() => { setPaymentTerms('Credit Account'); clearFieldError('paymentTerms'); }} style={{
                    padding: '10px 20px', borderRadius: '30px',
                    border: '2px solid ' + (paymentTerms === 'Credit Account' ? '#FF6B00' : (fieldErrors.paymentTerms ? '#DC3545' : '#E9ECEF')),
                    background: paymentTerms === 'Credit Account' ? '#FF6B00' : (fieldErrors.paymentTerms ? '#FFF5F5' : 'white'),
                    color: paymentTerms === 'Credit Account' ? 'white' : '#343A40',
                    fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit'
                  }}>Credit Account</button>
                ) : (
                  <button type="button" disabled title="Apply for a credit account in My Account" style={{
                    padding: '10px 20px', borderRadius: '30px',
                    border: '2px dashed #E9ECEF', background: '#F8F9FA',
                    color: '#ADB5BD', fontWeight: 600, fontSize: '0.9rem',
                    cursor: 'not-allowed', fontFamily: 'inherit'
                  }}>
                    Credit Account 🔒
                  </button>
                )}
              </div>
              <FieldError message={fieldErrors.paymentTerms} />

              {!creditApproved && (
                <div style={{ background: '#FFF5EB', borderLeft: '3px solid #FF6B00', borderRadius: '6px', padding: '10px 14px', marginBottom: '20px', marginTop: '10px', fontSize: '0.82rem', color: '#8B4500' }}>
                  💡 Credit Account is available only to approved customers.{' '}
                  <Link href="/account" style={{ color: '#FF6B00', fontWeight: 700 }}>Apply in My Account →</Link>
                </div>
              )}

              {creditApproved && (
                <div style={{ background: '#E8F7EF', borderLeft: '3px solid #28A745', borderRadius: '6px', padding: '10px 14px', marginBottom: '20px', marginTop: '10px', fontSize: '0.82rem', color: '#155724' }}>
                  ✅ You&apos;re approved for Credit Account. Limit: <b>USD {Number(creditLimit).toFixed(2)}</b> • Net {creditTermsDays} days.
                </div>
              )}

              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '10px', marginTop: '20px' }}>Payment Method *</label>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
                {['Bank Transfer', 'Cash'].map((m) => (
                  <button key={m} onClick={() => { setPaymentMethod(m); clearFieldError('paymentMethod'); }} style={{ padding: '10px 20px', borderRadius: '30px', border: '2px solid ' + (paymentMethod === m ? '#FF6B00' : (fieldErrors.paymentMethod ? '#DC3545' : '#E9ECEF')), background: paymentMethod === m ? '#FF6B00' : (fieldErrors.paymentMethod ? '#FFF5F5' : 'white'), color: paymentMethod === m ? 'white' : '#343A40', fontWeight: 600, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>{m}</button>
                ))}
              </div>
              <FieldError message={fieldErrors.paymentMethod} />

              <div style={{ marginTop: '25px', paddingTop: '20px', borderTop: '2px solid #F1F3F5' }}>
                <h4 style={{ marginBottom: '6px', color: '#003366', fontSize: '1.05rem' }}>📎 Upload Documents *</h4>
                <p style={{ color: '#6C757D', fontSize: '0.85rem', marginBottom: '15px' }}>
                  Please upload your <b>Invoice</b> and <b>Packing List</b>. Both are required to submit this booking.
                  Max 10 MB per file. Accepted: PDF, Excel, Word, Images.
                </p>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#343A40', marginBottom: '6px' }}>
                    Invoice * ({invoiceFiles.length} file{invoiceFiles.length !== 1 ? 's' : ''})
                  </label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => handleFileDrop(e, 'invoice')}
                    style={{
                      border: '2px dashed ' + (fieldErrors.invoiceFiles ? '#DC3545' : (invoiceFiles.length > 0 ? '#00A86B' : '#FF6B00')),
                      background: fieldErrors.invoiceFiles ? '#FFF5F5' : (invoiceFiles.length > 0 ? '#E8F7EF' : '#FFF5EB'),
                      borderRadius: '10px', padding: '25px 20px', textAlign: 'center',
                      cursor: 'pointer', position: 'relative'
                    }}
                    onClick={() => document.getElementById('invoice-file-input').click()}
                  >
                    <input id="invoice-file-input" type="file" multiple onChange={(e) => handleFileInput(e, 'invoice')} style={{ display: 'none' }} />
                    <div style={{ fontSize: '1.8rem', marginBottom: '5px' }}>📄</div>
                    <div style={{ fontWeight: 700, color: '#003366', fontSize: '0.95rem', marginBottom: '3px' }}>
                      Drag & drop Invoice here, or click to browse
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6C757D' }}>PDF, XLSX, XLS, DOC, DOCX, JPG, PNG · Max 10 MB each</div>
                  </div>
                  <FieldError message={fieldErrors.invoiceFiles} />

                  {invoiceFiles.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      {invoiceFiles.map((f, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8F9FA', borderRadius: '6px', marginBottom: '5px', fontSize: '0.85rem' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>📄 {f.name} <span style={{ color: '#6C757D' }}>({formatBytes(f.size)})</span></span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeFile('invoice', i); }} style={{ padding: '4px 10px', background: '#DC3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#343A40', marginBottom: '6px' }}>
                    Packing List * ({packingListFiles.length} file{packingListFiles.length !== 1 ? 's' : ''})
                  </label>
                  <div
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => handleFileDrop(e, 'packingList')}
                    style={{
                      border: '2px dashed ' + (fieldErrors.packingListFiles ? '#DC3545' : (packingListFiles.length > 0 ? '#00A86B' : '#FF6B00')),
                      background: fieldErrors.packingListFiles ? '#FFF5F5' : (packingListFiles.length > 0 ? '#E8F7EF' : '#FFF5EB'),
                      borderRadius: '10px', padding: '25px 20px', textAlign: 'center',
                      cursor: 'pointer', position: 'relative'
                    }}
                    onClick={() => document.getElementById('packing-file-input').click()}
                  >
                    <input id="packing-file-input" type="file" multiple onChange={(e) => handleFileInput(e, 'packingList')} style={{ display: 'none' }} />
                    <div style={{ fontSize: '1.8rem', marginBottom: '5px' }}>📋</div>
                    <div style={{ fontWeight: 700, color: '#003366', fontSize: '0.95rem', marginBottom: '3px' }}>
                      Drag & drop Packing List here, or click to browse
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#6C757D' }}>PDF, XLSX, XLS, DOC, DOCX, JPG, PNG · Max 10 MB each</div>
                  </div>
                  <FieldError message={fieldErrors.packingListFiles} />

                  {packingListFiles.length > 0 && (
                    <div style={{ marginTop: '10px' }}>
                      {packingListFiles.map((f, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#F8F9FA', borderRadius: '6px', marginBottom: '5px', fontSize: '0.85rem' }}>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '10px' }}>📋 {f.name} <span style={{ color: '#6C757D' }}>({formatBytes(f.size)})</span></span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); removeFile('packingList', i); }} style={{ padding: '4px 10px', background: '#DC3545', color: 'white', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>✕</button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} style={{ padding: '14px 26px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
                <button onClick={goNext} style={{ padding: '14px 26px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Next</button>
              </div>
            </>
          )}

          {((step === 8 && isSea) || (step === 9 && !isSea)) && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '10px', borderBottom: '2px solid #F1F3F5', gap: '10px', flexWrap: 'wrap' }}>
                <h3 style={{ color: '#003366', fontSize: '1.2rem', margin: 0 }}>
                  {isSea ? 'Step 8' : 'Step 9'} - Review & Submit
                </h3>
                <button onClick={goPrev} style={{ padding: '6px 14px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '6px', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', fontFamily: 'inherit' }}>◀ Back</button>
              </div>

              <div style={{
                background: 'linear-gradient(135deg, #FFF5EB 0%, #FFE8D1 100%)',
                border: '2px solid #FF6B00', borderRadius: '12px',
                padding: '20px 25px', marginBottom: '25px'
              }}>
                <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '1.5px', color: '#8B4500', fontWeight: 700, marginBottom: '8px' }}>
                  Tracking Number (will be assigned)
                </div>
                <div style={{ fontFamily: 'Consolas, monospace', fontSize: '1.6rem', fontWeight: 800, color: '#FF6B00', letterSpacing: '1px' }}>
                  Auto-generated on submit
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <div style={{ background: '#F8F9FA', padding: '18px', borderRadius: '10px', marginBottom: '15px' }}>
                    <div style={{ fontWeight: 800, color: '#003366', marginBottom: '12px', fontSize: '0.95rem' }}>SHIPMENT</div>
                    <div style={{ fontSize: '0.9rem', lineHeight: 1.8, color: '#343A40' }}>
                      <div><b>Mode:</b> {shipMode}{isSea && seaLoadType ? ' (' + seaLoadType + ')' : ''}</div>
                      {!isSea && parcelType && <div><b>Parcel:</b> {parcelType === 'Others' ? 'Others: ' + parcelTypeCustom : parcelType}</div>}
                      {!isSea && shipment.deliveryTimeline && <div><b>Delivery Timeline:</b> {shipment.deliveryTimeline}</div>}
                      <div><b>Description:</b> {shipment.description || '-'}</div>
                      <div><b>HS Code:</b> {shipment.hsCode || '-'}</div>
                      <div><b>Country of Origin:</b> {countryName(shipment.originCountry) || '-'}</div>
                      <div><b>Packaging:</b> {shipment.packagingType === 'Others' ? 'Others: ' + (shipment.packagingTypeCustom || '-') : (shipment.packagingType || '-')}</div>
                      {isSea && <div><b>CBM:</b> {shipment.totalCbm} m3</div>}
                      <div><b>Dimensions:</b> {shipment.dimLength}x{shipment.dimWidth}x{shipment.dimHeight} cm</div>
                      <div><b>Packages:</b> {shipment.packages}</div>
                      <div><b>Weight:</b> {shipment.totalWeight} kg</div>
                      <div><b>Total Customs Value:</b> {shipment.totalValue} {shipment.valueCurrency}</div>
                      {showBillingParty && freightBillTo && <div><b>Freight Bill To:</b> {freightBillTo}</div>}
                      {showBillingParty && dutyTaxBillTo && <div><b>Duty & Taxes Bill To:</b> {dutyTaxBillTo}</div>}
                      <div><b>Customs:</b> {customService === 'sxl' ? 'Handled by sXL' : 'Handled by Consignee'}</div>
                      <div><b>Delivery:</b> {deliveryService === 'sxl' ? 'Handled by sXL' : 'Handled by Consignee'}</div>
                      {invoiceFiles.length > 0 && <div><b>Invoices Attached:</b> {invoiceFiles.length} file(s)</div>}
                      {packingListFiles.length > 0 && <div><b>Packing Lists Attached:</b> {packingListFiles.length} file(s)</div>}
                    </div>
                  </div>

                  <div style={{ background: '#F8F9FA', padding: '18px', borderRadius: '10px' }}>
                    <div style={{ fontWeight: 800, color: '#003366', marginBottom: '12px', fontSize: '0.95rem' }}>SHIPPER</div>
                    <div style={{ fontSize: '0.9rem', lineHeight: 1.8, color: '#343A40' }}>
                      <div><b>{shipper.name}</b></div>
                      <div>{shipper.fullAddress}</div>
                      <div>{shipper.city}{shipper.state ? ', ' + shipper.state : ''}</div>
                      <div>{countryName(shipper.country)}</div>
                      <div>{shipper.phone}</div>
                      <div>{shipper.email}</div>
                    </div>
                  </div>
                </div>

                <div>
                  <div style={{ background: '#F8F9FA', padding: '18px', borderRadius: '10px', marginBottom: '15px' }}>
                    <div style={{ fontWeight: 800, color: '#003366', marginBottom: '12px', fontSize: '0.95rem' }}>CONSIGNEE</div>
                    <div style={{ fontSize: '0.9rem', lineHeight: 1.8, color: '#343A40' }}>
                      <div><b>{consignee.name}</b></div>
                      <div>{consignee.fullAddress}</div>
                      <div>{consignee.city}{consignee.state ? ', ' + consignee.state : ''}</div>
                      <div>{countryName(consignee.country)}</div>
                      <div>{consignee.phone}</div>
                      <div>{consignee.email}</div>
                      {consignee.bin && <div>BIN: {consignee.bin}</div>}
                    </div>
                  </div>

                  <div style={{ background: '#F8F9FA', padding: '18px', borderRadius: '10px', marginBottom: '15px' }}>
                    <div style={{ fontWeight: 800, color: '#003366', marginBottom: '12px', fontSize: '0.95rem' }}>PICKUP</div>
                    <div style={{ fontSize: '0.9rem', lineHeight: 1.8, color: '#343A40' }}>
                      {shipment.pickupService === false ? (
                        <div style={{ color: '#8B4500' }}>
                          📦 <b>Self-Delivery to Warehouse</b><br />
                          Warehouse details will be emailed after confirmation.
                        </div>
                      ) : shipment.pickupSameAsShipper ? (
                        <div>
                          🚚 <b>Pickup: Same as Shipper Address</b><br />
                          <span style={{ fontSize: '0.85rem', color: '#6C757D' }}>
                            {shipper.fullAddress}{shipper.city ? ', ' + shipper.city : ''}{shipper.country ? ', ' + countryName(shipper.country) : ''}
                          </span>
                        </div>
                      ) : (
                        <div>
                          🚚 <b>Pickup: Custom Address</b><br />
                          <span style={{ fontSize: '0.85rem', color: '#6C757D' }}>
                            {shipment.pickupAddress}{shipment.pickupCity ? ', ' + shipment.pickupCity : ''}{shipment.pickupCountry ? ', ' + countryName(shipment.pickupCountry) : ''}
                          </span>
                        </div>
                      )}
                      <div style={{ marginTop: '6px' }}><b>Goods Ready:</b> {shipment.parcelReadyDate} at {shipment.parcelReadyTime}</div>
                    </div>
                  </div>

                  <div style={{ background: '#F8F9FA', padding: '18px', borderRadius: '10px' }}>
                    <div style={{ fontWeight: 800, color: '#003366', marginBottom: '12px', fontSize: '0.95rem' }}>PAYMENT</div>
                    <div style={{ fontSize: '0.9rem', lineHeight: 1.8, color: '#343A40' }}>
                      <div><b>Type:</b> {paymentTerms}</div>
                      <div><b>Method:</b> {paymentMethod}</div>
                      <div><b>Currency:</b> USD</div>
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: '#FFF5EB', padding: '15px', borderRadius: '8px', marginTop: '20px', fontSize: '0.9rem', color: '#6C757D', borderLeft: '4px solid #FF6B00' }}>
                After submission, our admin team will review your booking and confirm the shipping cost.
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '25px', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={goPrev} disabled={loading || uploading} style={{ padding: '14px 26px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Back</button>
                <button onClick={handleSubmit} disabled={loading || uploading} style={{ padding: '14px 30px', background: '#FF6B00', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '1rem', cursor: (loading || uploading) ? 'not-allowed' : 'pointer', opacity: (loading || uploading) ? 0.6 : 1, fontFamily: 'inherit' }}>
                  {uploading ? 'Uploading files...' : (loading ? 'Submitting...' : 'Submit Booking')}
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

function Field({ label, value, onChange, type = 'text', placeholder = '', textarea = false, error }) {
  const baseStyle = {
    width: '100%', padding: '13px 15px', fontSize: '0.95rem',
    border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box'
  };
  const errStyle = error ? { borderColor: '#DC3545', background: '#FFF5F5' } : {};
  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>{label}</label>
      {textarea ? (
        <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...baseStyle, ...errStyle, minHeight: '80px', resize: 'vertical' }} />
      ) : (
        <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ ...baseStyle, ...errStyle }} />
      )}
      <FieldError message={error} />
    </div>
  );
}

function SelectField({ label, value, onChange, countries, options, error }) {
  const errStyle = error ? { borderColor: '#DC3545', background: '#FFF5F5' } : {};
  return (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#343A40', marginBottom: '6px' }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} style={{
        width: '100%', padding: '13px 15px', fontSize: '0.95rem',
        border: '2px solid #E9ECEF', borderRadius: '8px', outline: 'none',
        background: 'white', fontFamily: 'inherit', boxSizing: 'border-box', ...errStyle
      }}>
        <option value="">-- Select --</option>
        {countries && countries.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
        {options && options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      <FieldError message={error} />
    </div>
  );
}
