import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from '@/lib/router';
import { Helmet } from '@/lib/helmet';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Header from '../../components/ui/Header';
import { useAuth } from '../../contexts/AuthContext';

/**
 * Two modes: request a reset email, or (after following the emailed link,
 * which signs the person in) choose a new password.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const { user, resetPassword, updatePassword } = useAuth();
  const [recovering, setRecovering] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('recovery')) {
      setRecovering(true);
    }
  }, []);

  const requestEmail = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const { error: err } = await resetPassword(email);
    setBusy(false);
    if (err) setError(err?.message || String(err));
    else setMessage('If an account exists for that email, a reset link is on its way.');
  };

  const saveNewPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) return setError('Use at least 8 characters.');
    if (password !== confirm) return setError('Passwords do not match.');
    setBusy(true);
    const { error: err } = await updatePassword(password);
    setBusy(false);
    if (err) setError(err?.message || String(err));
    else {
      setMessage('Password updated. Redirecting…');
      setTimeout(() => navigate('/customer-account'), 1500);
    }
  };

  const showNewPasswordForm = recovering && user;

  return (
    <>
      <Helmet>
        <title>Reset Password - GoShuttle Pro</title>
      </Helmet>
      <Header />
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 pt-24 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            {showNewPasswordForm ? 'Choose a new password' : 'Reset your password'}
          </h2>
          {message && <div className="mb-4 rounded-md bg-green-50 p-3 text-sm text-green-800">{message}</div>}
          {error && <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
          {showNewPasswordForm ? (
            <form className="space-y-4" onSubmit={saveNewPassword}>
              <Input label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <Input label="Confirm new password" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
              <Button type="submit" fullWidth loading={busy}>Save password</Button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={requestEmail}>
              <Input label="Email address" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Button type="submit" fullWidth loading={busy}>Send reset link</Button>
            </form>
          )}
          <p className="mt-6 text-center text-sm">
            <Link to="/auth/login" className="text-primary">Back to sign in</Link>
          </p>
        </div>
      </div>
    </>
  );
};

export default ResetPassword;
