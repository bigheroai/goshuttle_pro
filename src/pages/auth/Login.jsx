import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Icon from '../../components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';

const Login = () => {
  const navigate = useNavigate();
  const { signIn, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

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

      // Redirect based on role will be handled by the auth context
      navigate('/customer-account');
    } catch (error) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const demoCredentials = [
    {
      type: 'Corporate Manager',
      email: 'manager@techcorp.com',
      password: 'manager123',
      description: 'Company fleet management'
    },
    {
      type: 'Customer',
      email: 'customer@email.com',
      password: 'customer123',
      description: 'Regular user access'
    }
  ];

  const fillDemoCredentials = (email, password) => {
    setFormData({ email, password });
    setError('');
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
        <title>Login - GoShuttle Pro</title>
        <meta name="description" content="Sign in to your GoShuttle Pro account to access premium transportation services, manage bookings, and track your trips." />
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
          <h2 className="mt-6 text-center text-3xl font-bold text-gray-900">
            Sign in to GoShuttle Pro
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/auth/signup"
              className="font-medium text-primary hover:text-primary-dark transition-colors"
            >
              create a new account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
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
                  Email address
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
                    placeholder="Enter your email"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1 relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={formData?.password}
                    onChange={handleChange}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                    tabIndex={-1}
                  >
                    <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={18} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm">
                  <Link
                    to="/auth/reset-password"
                    className="font-medium text-primary hover:text-primary-dark transition-colors"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </div>

              <div>
                <Button
                  type="submit"
                  fullWidth
                  disabled={isLoading}
                  iconName={isLoading ? "Loader2" : undefined}
                  className={isLoading ? "animate-spin" : ""}
                >
                  {isLoading ? 'Signing in...' : 'Sign in'}
                </Button>
              </div>
            </form>

            {/* Demo Credentials Section */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Demo Credentials</h3>
              <div className="space-y-2">
                {demoCredentials?.map((credential, index) => (
                  <div
                    key={index}
                    className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => fillDemoCredentials(credential?.email, credential?.password)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{credential?.type}</p>
                        <p className="text-xs text-gray-500">{credential?.description}</p>
                      </div>
                      <Icon name="Copy" size={16} className="text-gray-400" />
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Email:</span> {credential?.email}
                      </p>
                      <p className="text-xs text-gray-600">
                        <span className="font-medium">Password:</span> {credential?.password}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-3">
                Click on any demo credential to auto-fill the form
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Login;