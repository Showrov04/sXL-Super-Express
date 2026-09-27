export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="sxl-footer">
      <p>© {year} sXL - Super Express Logistics Center. All rights reserved.</p>
      <p style={{ fontSize: '0.8rem', opacity: 0.7, marginTop: '8px' }}>
        Ship Faster. Track Smarter.
      </p>
    </footer>
  );
}
