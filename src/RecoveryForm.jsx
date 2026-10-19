import React, { useState } from 'react';
export default function RecoveryForm({ api, onBack }) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [done, setDone] = useState(false);
  return (
    <form
      className="auth-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(e.currentTarget));
        if (data.newPassword !== data.confirmPassword) {
          setError('New passwords do not match.');
          return;
        }
        setBusy(true);
        setError('');
        try {
          await api('recovery/reset', { method: 'POST', body: JSON.stringify(data) });
          setDone(true);
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <h2>Recover your account</h2>
      {done ? (
        <p role="status">
          Password reset. All previous sessions are signed out. Sign in with your new password, then
          create a new recovery code in Settings.
        </p>
      ) : (
        <>
          <p>
            Use the recovery code you saved. If you do not have it, contact your server
            administrator for a one-use reset code.
          </p>
          <label>
            Email
            <input type="email" name="email" autoComplete="email" required maxLength={254} />
          </label>
          <label>
            Recovery code
            <input name="code" required maxLength={200} autoComplete="off" spellCheck={false} />
          </label>
          <label>
            New password
            <input
              type="password"
              name="newPassword"
              autoComplete="new-password"
              minLength={12}
              maxLength={1024}
              required
            />
          </label>
          <label>
            Confirm password
            <input
              type="password"
              name="confirmPassword"
              autoComplete="new-password"
              minLength={12}
              maxLength={1024}
              required
            />
          </label>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <button className="primary" disabled={busy}>
            {busy ? 'Resetting…' : 'Reset password'}
          </button>
        </>
      )}
      <button type="button" className="link" onClick={onBack}>
        Back to sign in
      </button>
    </form>
  );
}
