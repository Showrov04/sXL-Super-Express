      {deleteMonthModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '20px', overflowY: 'auto'
        }}>
          <div
            id="sxl-delete-month-modal"
            style={{
              background: 'white', maxWidth: '720px', width: '100%',
              borderRadius: '16px', padding: '30px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
              marginTop: '40px', marginBottom: '40px',
              borderTop: '6px solid #DC3545'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
              <div>
                <h2 style={{ color: '#DC3545', fontSize: '1.3rem', margin: 0 }}>🗑️ Delete Old Bookings</h2>
                <div style={{ color: '#6C757D', fontSize: '0.85rem', marginTop: '4px' }}>
                  <b style={{ color: '#003366' }}>{deleteMonthModal.shipper.name}</b>
                  {' · '}
                  <span style={{ fontFamily: 'Consolas, monospace' }}>{deleteMonthModal.shipper.shipperID}</span>
                </div>
              </div>
              <button onClick={closeDeleteMonthModal} style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: '#6C757D' }}>✕</button>
            </div>

            <div style={{ background: '#FFF3CD', border: '2px solid #FFC107', borderLeft: '6px solid #DC3545', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', fontSize: '0.85rem', color: '#856404' }}>
              <b>⚠️ This is permanent and cannot be undone.</b><br />
              Only <b>Delivered + Paid</b> and <b>Cancelled</b> shipments in the selected month will be deleted. Active or unpaid shipments are automatically skipped.
            </div>

            {deleteMonthError && (
              <div style={{ background: '#F8D7DA', color: '#721C24', borderLeft: '4px solid #DC3545', borderRadius: '8px', padding: '12px 16px', marginBottom: '18px', fontSize: '0.9rem', wordBreak: 'break-word' }}>
                <b>❌ {deleteMonthError}</b>
                <div style={{ fontSize: '0.78rem', marginTop: '6px', opacity: 0.8 }}>
                  Open DevTools (F12) → Console for detailed logs.
                </div>
              </div>
            )}

            {!deleteMonthPreview && !deleteMonthSuccess && (
              <>
                <div style={{ marginBottom: '18px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#343A40', marginBottom: '6px' }}>
                    Select Month (booked_at) *
                  </label>
                  <input
                    type="month"
                    value={deleteMonthValue}
                    onChange={(e) => {
                      setDeleteMonthValue(e.target.value);
                      setDeleteMonthError('');
                      setDeleteMonthPreview(null);
                      setDeleteMonthConfirmInput('');
                    }}
                    style={{ width: '100%', padding: '12px 14px', border: '2px solid #E9ECEF', borderRadius: '8px', fontSize: '0.95rem', fontFamily: 'inherit', boxSizing: 'border-box' }}
                  />
                  <div style={{ fontSize: '0.78rem', color: '#6C757D', marginTop: '6px', fontStyle: 'italic' }}>
                    Month filter uses the booking creation date (booked_at).
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', flexWrap: 'wrap' }}>
                  <button onClick={closeDeleteMonthModal}
                    style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Cancel
                  </button>
                  <button onClick={handleDeleteMonthPreview} disabled={deleteMonthPreviewLoading || !deleteMonthValue}
                    style={{ padding: '12px 24px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: (deleteMonthPreviewLoading || !deleteMonthValue) ? 'not-allowed' : 'pointer', opacity: (deleteMonthPreviewLoading || !deleteMonthValue) ? 0.6 : 1, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                    {deleteMonthPreviewLoading ? (
                      <>
                        <span style={{
                          display: 'inline-block', width: '14px', height: '14px',
                          border: '2px solid rgba(255,255,255,0.4)', borderTopColor: 'white',
                          borderRadius: '50%', animation: 'spin 0.7s linear infinite'
                        }} />
                        Checking...
                      </>
                    ) : '🔍 Preview'}
                  </button>
                </div>
              </>
            )}

            {deleteMonthPreview && !deleteMonthSuccess && (
              <>
                <div style={{ background: '#F8F9FA', borderRadius: '10px', padding: '18px 20px', marginBottom: '18px', border: '1px solid #E9ECEF' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#003366', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Preview — {deleteMonthPreview.month}
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '12px', border: '1px solid #E9ECEF' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC3545' }}>{deleteMonthPreview.eligibleCount}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Shipments</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '12px', border: '1px solid #E9ECEF' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC3545' }}>{deleteMonthPreview.trackingHistoryCount}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Tracking entries</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '12px', border: '1px solid #E9ECEF' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC3545' }}>{deleteMonthPreview.invoiceCount}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Invoices</div>
                    </div>
                    <div style={{ background: 'white', borderRadius: '8px', padding: '12px', border: '1px solid #E9ECEF' }}>
                      <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC3545' }}>{deleteMonthPreview.fileCount}</div>
                      <div style={{ fontSize: '0.75rem', color: '#6C757D', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Storage files</div>
                    </div>
                  </div>

                  {deleteMonthPreview.totalInMonth !== undefined && (
                    <div style={{ fontSize: '0.8rem', color: '#6C757D', marginBottom: '10px' }}>
                      Total shipments in {deleteMonthPreview.month}: <b>{deleteMonthPreview.totalInMonth}</b>
                    </div>
                  )}

                  {deleteMonthPreview.skippedCount > 0 && (
                    <div style={{ fontSize: '0.8rem', color: '#856404', background: '#FFF3CD', borderLeft: '3px solid #FFC107', borderRadius: '6px', padding: '8px 12px', marginBottom: '10px' }}>
                      ⚠️ {deleteMonthPreview.skippedCount} shipment(s) in this month are <b>not eligible</b> (Active / Awaiting Payment / Cancellation Requested) and will be <b>kept</b>.
                    </div>
                  )}

                  {deleteMonthPreview.eligibleCount === 0 ? (
                    <div style={{ fontSize: '0.9rem', color: '#856404', background: '#FFF3CD', borderRadius: '8px', padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>
                      {deleteMonthPreview.message || 'No eligible shipments found in this month.'}
                    </div>
                  ) : (
                    <>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#003366', marginBottom: '6px', marginTop: '10px' }}>
                        Tracking numbers to be deleted ({deleteMonthPreview.trackingNumbers.length}):
                      </div>
                      <div style={{ maxHeight: '140px', overflowY: 'auto', background: 'white', border: '1px solid #E9ECEF', borderRadius: '8px', padding: '10px 14px', fontFamily: 'Consolas, monospace', fontSize: '0.8rem', lineHeight: 1.7, color: '#495057' }}>
                        {deleteMonthPreview.trackingNumbers.map((tn) => (
                          <div key={tn}>{tn}</div>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {deleteMonthPreview.eligibleCount > 0 && (
                  <>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: '#DC3545', marginBottom: '6px' }}>
                        Type <code style={{ background: '#F8F9FA', padding: '2px 8px', borderRadius: '4px', fontFamily: 'Consolas, monospace' }}>{deleteMonthValue}</code> to confirm deletion *
                      </label>
                      <input
                        type="text"
                        value={deleteMonthConfirmInput}
                        onChange={(e) => { setDeleteMonthConfirmInput(e.target.value); setDeleteMonthError(''); }}
                        placeholder={deleteMonthValue}
                        style={{
                          width: '100%', padding: '12px 14px',
                          border: '2px solid ' + (deleteMonthConfirmInput === deleteMonthValue ? '#DC3545' : '#E9ECEF'),
                          borderRadius: '8px', fontSize: '0.95rem',
                          fontFamily: 'Consolas, monospace', boxSizing: 'border-box',
                          background: deleteMonthConfirmInput === deleteMonthValue ? '#FFF5F5' : 'white'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                      <button onClick={() => { setDeleteMonthPreview(null); setDeleteMonthConfirmInput(''); setDeleteMonthError(''); }}
                        style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ← Back
                      </button>
                      <button onClick={handleDeleteMonthExecute}
                        disabled={deleteMonthDeleting || deleteMonthConfirmInput !== deleteMonthValue}
                        style={{
                          padding: '12px 28px', background: '#DC3545', color: 'white',
                          border: 'none', borderRadius: '8px', fontWeight: 800,
                          cursor: (deleteMonthDeleting || deleteMonthConfirmInput !== deleteMonthValue) ? 'not-allowed' : 'pointer',
                          opacity: (deleteMonthDeleting || deleteMonthConfirmInput !== deleteMonthValue) ? 0.5 : 1,
                          fontFamily: 'inherit'
                        }}>
                        {deleteMonthDeleting ? 'Deleting...' : '🗑️ Permanently Delete'}
                      </button>
                    </div>
                  </>
                )}

                {deleteMonthPreview.eligibleCount === 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button onClick={() => { setDeleteMonthPreview(null); setDeleteMonthConfirmInput(''); setDeleteMonthError(''); }}
                      style={{ padding: '12px 24px', background: 'transparent', color: '#003366', border: '2px solid #E9ECEF', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                      ← Back
                    </button>
                  </div>
                )}
              </>
            )}

            {deleteMonthSuccess && (
              <>
                <div style={{ background: '#D4EDDA', border: '2px solid #28A745', borderRadius: '12px', padding: '20px', marginBottom: '18px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#155724', marginBottom: '12px' }}>
                    ✅ Deletion complete
                  </div>
                  <div style={{ fontSize: '0.9rem', color: '#155724', lineHeight: 1.9 }}>
                    <div><b>Month:</b> {deleteMonthSuccess.month}</div>
                    <div><b>Shipments deleted:</b> {deleteMonthSuccess.shipmentsDeleted}</div>
                    <div><b>Tracking entries deleted:</b> {deleteMonthSuccess.trackingDeleted}</div>
                    <div><b>Invoices deleted:</b> {deleteMonthSuccess.invoicesDeleted}</div>
                    <div><b>Storage files deleted:</b> {deleteMonthSuccess.filesDeleted}</div>
                    <div style={{ marginTop: '8px', fontSize: '0.8rem', color: '#495057', fontStyle: 'italic' }}>
                      Took {deleteMonthSuccess.durationMs} ms
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button onClick={closeDeleteMonthModal}
                    style={{ padding: '12px 24px', background: '#003366', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                    Close
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
