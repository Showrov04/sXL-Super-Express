import { supabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export default async function TestDbPage() {
  let status = 'Checking...';
  let tableCount = 0;
  let settingsCount = 0;
  let errorMessage = '';

  try {
    // Count tables via settings (quick query)
    const { count: settings, error: err1 } = await supabase
      .from('settings')
      .select('*', { count: 'exact', head: true });

    if (err1) throw err1;
    settingsCount = settings || 0;

    // Count counters
    const { count: counters, error: err2 } = await supabase
      .from('counters')
      .select('*', { count: 'exact', head: true });

    if (err2) throw err2;
    tableCount = counters || 0;

    status = 'CONNECTED ✅';
  } catch (err) {
    status = 'ERROR ❌';
    errorMessage = err.message || String(err);
  }

  return (
    <main style={{ padding: '40px', fontFamily: 'monospace', maxWidth: '700px', margin: '0 auto' }}>
      <h1 style={{ color: '#FF6B00' }}>Database Connection Test</h1>

      <div style={{ marginTop: '30px', padding: '20px', background: '#F8F9FA', borderRadius: '8px' }}>
        <p style={{ fontSize: '20px', marginBottom: '20px' }}>
          Status: <strong style={{ color: status.includes('CONNECTED') ? '#00A86B' : '#DC3545' }}>{status}</strong>
        </p>

        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '15px' }}>
          <tbody>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px' }}>Settings rows</td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{settingsCount}</td>
            </tr>
            <tr style={{ borderBottom: '1px solid #ddd' }}>
              <td style={{ padding: '10px' }}>Counters rows</td>
              <td style={{ padding: '10px', textAlign: 'right', fontWeight: 'bold' }}>{tableCount}</td>
            </tr>
          </tbody>
        </table>

        {errorMessage && (
          <div style={{ marginTop: '20px', padding: '15px', background: '#F8D7DA', color: '#721C24', borderRadius: '8px', fontSize: '13px' }}>
            <strong>Error:</strong><br />
            {errorMessage}
          </div>
        )}
      </div>

      <p style={{ marginTop: '30px', fontSize: '14px', color: '#666' }}>
        If you see "CONNECTED ✅" and the row counts look correct, your database is properly connected.
      </p>

      <p style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: '#FF6B00' }}>← Back to home</a>
      </p>
    </main>
  );
}
