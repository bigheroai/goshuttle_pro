import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';

const AdminLogin = () => {
  const navigate = useNavigate();
  const { signIn, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e?.target?.name]: e?.target?.value
    }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error: signInError, data } = await signIn(formData?.email, formData?.password);

      if (signInError) {
        setError(signInError?.message || 'Invalid credentials. Please try again.');
        return;
      }

      // Redirect to admin dashboard
      navigate('/admin-dashboard');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" className="animate-spin mx-auto mb-4 text-white" size={24} />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Admin Login - GoShuttle Pro</title>
        <meta name="description" content="Secure admin portal login for GoShuttle Pro system administrators." />
      </Helmet>
      <div className="min-h-screen bg-gray-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <img
              src="/assets/images/goshuttle-vertical-1762404728137.png"
              alt="GoShuttle Pro Logo"
              className="h-14 w-auto brightness-0 invert"
            />
          </div>
          <div className="mt-6 flex items-center justify-center gap-2">
            <span className="inline-flex items-center gap-1.5 bg-primary/20 text-primary border border-primary/30 text-xs font-semibold px-3 py-1 rounded-full uppercase tracking-wider">
              <Icon name="ShieldCheck" size={13} />
              Admin Portal
            </span>
          </div>
          <h2 className="mt-4 text-center text-2xl font-bold text-white">
            Administrator Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-gray-400">
            Restricted access — authorized personnel only
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-gray-800 border border-gray-700 py-8 px-4 shadow-xl sm:rounded-xl sm:px-10">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-900/40 border border-red-700 p-4">
                  <div className="flex">
                    <Icon name="AlertCircle" className="text-red-400 flex-shrink-0" size={20} />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-300">
                        Authentication Failed
                      </h3>
                      <div className="mt-1 text-sm text-red-400">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-300">
                  Admin Email
                </label>
                <div className="mt-1">
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={formData?.email}
                    onChange={handleChange}
                    placeholder="Enter admin email"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300">
                  Password
                </label>
                <div className="mt-1">
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={formData?.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-500 focus:border-primary focus:ring-primary"
                  />
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  fullWidth
                  disabled={isLoading}
                  iconName={isLoading ? "Loader2" : "LogIn"}
                  className={isLoading ? "animate-pulse" : ""}
                >
                  {isLoading ? 'Authenticating...' : 'Sign in to Admin Panel'}
                </Button>
              </div>
            </form>

            <div className="mt-6 border-t border-gray-700 pt-5">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Icon name="Lock" size={12} />
                <span>This portal is for GoShuttle administrators only. Unauthorized access attempts are logged.</span>
              </div>
            </div>

            {/* Admin Demo Credentials */}
            <div className="mt-6 border-t border-gray-700 pt-5">
              <h3 className="text-sm font-medium text-gray-400 mb-3">Demo Credentials</h3>
              <div
                className="bg-gray-700/50 border border-gray-600 rounded-lg p-3 cursor-pointer hover:bg-gray-700 transition-colors"
                onClick={() => {
                  setFormData({ email: 'admin@goshuttlepro.com', password: 'admin123' });
                  setError('');
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-200">Admin</p>
                    <p className="text-xs text-gray-400">Full system access</p>
                  </div>
                  <Icon name="Copy" size={16} className="text-gray-500" />
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-gray-400">
                    <span className="font-medium text-gray-300">Email:</span> admin@goshuttlepro.com
                  </p>
                  <p className="text-xs text-gray-400">
                    <span className="font-medium text-gray-300">Password:</span> admin123
                  </p>
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-2">Click to auto-fill credentials</p>
            </div>
          </div>

          <div className="mt-6 text-center">
            <Link
              to="/auth/login"
              className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 transition-colors"
            >
              <Icon name="ArrowLeft" size={14} />
              Back to regular login
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminLogin;
