  // Reusable password input with show/hide toggle
  function PasswordField({ label, value, onChange, show, setShow, placeholder }) {
    // Use a stable id derived from the label so React never remounts the input
    const stableId = 'pwd_' + String(label || '').toLowerCase().replace(/[^a-z0-9]+/g, '_');
    return (
      <div style={{ marginBottom: '18px' }}>
        <label style={labelStyle} htmlFor={stableId}>{label}</label>
        <div style={{ position: 'relative' }}>
          <input
            id={stableId}
            name={stableId}
            type={show ? 'text' : 'password'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            style={passwordInputStyle}
            autoComplete="new-password"
          />
          <button
            type="button"
            onClick={() => setShow(!show)}
            title={show ? 'Hide password' : 'Show password'}
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.2rem',
              padding: '4px',
              color: '#6C757D',
              lineHeight: 1
            }}
          >
            {show ? '🙈' : '👁️'}
          </button>
        </div>
      </div>
    );
  }
