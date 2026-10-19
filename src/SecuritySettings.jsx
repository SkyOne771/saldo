import React, { useEffect, useState } from 'react';
import { ShieldCheck, LogOut } from 'lucide-react';
export default function SecuritySettings({ api, notify }) {
  const [info, setInfo] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [recoveryCode, setRecoveryCode] = useState('');
  const refresh = () =>
    api('security')
      .then(setInfo)
      .catch((e) => setError(e.message));
  useEffect(() => {
    refresh();
  }, []);
  return (
    <section className="panel security-panel">
      <div className="panel-heading">
        <div>
          <h3>
            <ShieldCheck size={17} /> Account security
          </h3>
          <p>Sessions expire after one hour of inactivity or seven days.</p>
        </div>
      </div>
      <p className="settings-note">
        {info
          ? `${info.activeSessions} active ${info.activeSessions === 1 ? 'session' : 'sessions'}`
          : 'Checking sessions…'}
      </p>
      <button
        className="secondary full"
        disabled={busy || !info}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await api('security/revoke-others', { method: 'POST', body: '{}' });
            await refresh();
            notify('Other devices signed out.');
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <LogOut size={15} />
        Sign out other devices
      </button>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const form = e.currentTarget,
            data = Object.fromEntries(new FormData(form));
          if (data.newPassword !== data.confirmPassword) {
            setError('New passwords do not match.');
            return;
          }
          setBusy(true);
          setError('');
          try {
            await api('security/password', {
              method: 'POST',
              body: JSON.stringify({
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
              }),
            });
            form.reset();
            await refresh();
            notify('Password updated. Other devices signed out.');
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h4>Change password</h4>
        <label>
          Current password
          <input
            name="currentPassword"
            type="password"
            required
            maxLength={1024}
            autoComplete="current-password"
          />
        </label>
        <label>
          New password
          <input
            name="newPassword"
            type="password"
            required
            minLength={12}
            maxLength={1024}
            autoComplete="new-password"
          />
        </label>
        <label>
          Confirm new password
          <input
            name="confirmPassword"
            type="password"
            required
            minLength={12}
            maxLength={1024}
            autoComplete="new-password"
          />
        </label>
        <p className="field-help">
          Use a unique password or passphrase of at least 12 characters. Updating it signs out all
          other devices.
        </p>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {busy ? 'Saving…' : 'Update password'}
        </button>
      </form>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError('');
          const form = e.currentTarget;
          try {
            const result = await api('security/recovery-code', {
              method: 'POST',
              body: JSON.stringify({ currentPassword: new FormData(form).get('recoveryPassword') }),
            });
            setRecoveryCode(result.recoveryCode);
            form.reset();
            await refresh();
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <h4>Password recovery</h4>
        <p className="field-help">
          {info?.recoveryEnabled
            ? 'A recovery code is active. Generating a replacement invalidates it.'
            : 'Save a recovery code to regain access if you forget your password.'}{' '}
          Codes are private, work once and expire after one year. The sign-in page has a Forgot
          password route. If you lose the code, ask the server administrator for a one-use reset
          code.
        </p>
        <label>
          Confirm current password
          <input
            type="password"
            name="recoveryPassword"
            required
            maxLength={1024}
            autoComplete="current-password"
          />
        </label>
        <button className="secondary full" disabled={busy}>
          Generate recovery code
        </button>
        {recoveryCode && (
          <>
            <code className="recovery-secret">{recoveryCode}</code>
            <p className="field-help">
              Save this code now. It will not be shown again after leaving this page.
            </p>
            <button
              type="button"
              className="secondary full"
              onClick={() => {
                const url = URL.createObjectURL(new Blob([recoveryCode], { type: 'text/plain' })),
                  a = document.createElement('a');
                a.href = url;
                a.download = 'saldo-recovery-code.txt';
                a.click();
                setTimeout(() => URL.revokeObjectURL(url), 60000);
              }}
            >
              Download recovery code
            </button>
          </>
        )}
      </form>
    </section>
  );
}
