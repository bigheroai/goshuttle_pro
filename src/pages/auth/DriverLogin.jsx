import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';

import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';

const DriverLogin = () => {
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
      const { error } = await signIn(formData?.email, formData?.password);

      if (error) {
        setError(error?.message);
        return;
      }

      navigate('/driver-assignment-system');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" className="animate-spin mx-auto mb-4" size={24} />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Driver Login - GoShuttle Pro</title>
        <meta name="description" content="Sign in to your GoShuttle driver account to manage trips, view assignments, and track your earnings." />
      </Helmet>
      <Header />
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 pt-24 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex justify-center">
            <img
              src="/assets/images/goshuttle-vertical-1762404728137.png"
              alt="GoShuttle Pro Logo"
              className="h-16 w-auto"
            />
          </div>

          {/* Driver badge */}
          <div className="flex justify-center mt-4">
            <span className="inline-flex items-center space-x-2 bg-emerald-100 text-emerald-800 text-sm font-medium px-4 py-1.5 rounded-full">
              <Icon name="Truck" size={15} />
              <span>Driver Portal</span>
            </span>
          </div>

          <h2 className="mt-4 text-center text-3xl font-bold text-gray-900">
            Driver Sign In
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Not a driver yet?{' '}
            <Link
              to="/driver-registration-form"
              className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
            >
              Apply to drive with us
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border-t-4 border-emerald-500">
            <form className="space-y-6" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-md bg-red-50 p-4">
                  <div className="flex">
                    <Icon name="AlertCircle" className="text-red-400" size={20} />
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Authentication Error
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Driver Email Address
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
                    placeholder="Enter your driver email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
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
                  />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link
                    to="/auth/reset-password"
                    className="font-medium text-emerald-600 hover:text-emerald-700 transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full flex justify-center items-center space-x-2 py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoading ? (
                    <>
                      <Icon name="Loader2" size={16} className="animate-spin" />
                      <span>Signing in...</span>
                    </>
                  ) : (
                    <>
                      <Icon name="LogIn" size={16} />
                      <span>Sign in as Driver</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Customer login link */}
            <div className="mt-6 border-t border-gray-200 pt-5 text-center space-y-3">
              <p className="text-sm text-gray-500">
                Looking for customer login?{' '}
                <Link
                  to="/auth/login"
                  className="font-medium text-primary hover:text-primary-dark transition-colors"
                >
                  Sign in as Customer
                </Link>
              </p>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                <p className="text-sm text-amber-800">
                  Applied but not yet verified?{' '}
                  <Link
                    to="/driver-application-status"
                    className="font-semibold text-amber-700 hover:text-amber-900 underline transition-colors"
                  >
                    Check your application status →
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DriverLogin;
