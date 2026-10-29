import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';

import Icon from '../../components/AppIcon';
import { useAuth } from '../../contexts/AuthContext';
import Header from '../../components/ui/Header';


const Signup = () => {
  const navigate = useNavigate();
  const { signUp } = useAuth();
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [customerData, setCustomerData] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'customer'
  });

  const [fieldErrors, setFieldErrors] = useState({
    full_name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  // Validation helpers
  const validateFullName = (name) => {
    if (!name || name?.trim()?.length === 0) return 'Full name is required.';
    if (name?.trim()?.length < 2) return 'Full name must be at least 2 characters.';
    if (!/^[a-zA-ZÀ-ÿ\s'\-\.]+$/?.test(name?.trim())) return 'Full name may only contain letters, spaces, hyphens, or apostrophes.';
    return '';
  };

  const validateEmail = (email) => {
    if (!email || email?.trim()?.length === 0) return 'Email address is required.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/?.test(email?.trim())) return 'Please enter a valid email address.';
    return '';
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required.';
    if (password?.length < 8) return 'Password must be at least 8 characters.';
    if (!/[A-Z]/?.test(password)) return 'Password must include at least one uppercase letter.';
    if (!/[0-9]/?.test(password)) return 'Password must include at least one number.';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/?.test(password)) return 'Password must include at least one special character.';
    return '';
  };

  const validateConfirmPassword = (password, confirmPassword) => {
    if (!confirmPassword) return 'Please confirm your password.';
    if (password !== confirmPassword) return 'Passwords do not match.';
    return '';
  };

  const getPasswordStrength = (password) => {
    if (!password) return null;
    let score = 0;
    if (password?.length >= 8) score++;
    if (/[A-Z]/?.test(password)) score++;
    if (/[0-9]/?.test(password)) score++;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/?.test(password)) score++;
    if (password?.length >= 12) score++;
    if (score <= 2) return { label: 'Weak', color: 'bg-red-500', width: 'w-1/4' };
    if (score === 3) return { label: 'Fair', color: 'bg-yellow-500', width: 'w-2/4' };
    if (score === 4) return { label: 'Good', color: 'bg-blue-500', width: 'w-3/4' };
    return { label: 'Strong', color: 'bg-green-500', width: 'w-full' };
  };

  const handleCustomerChange = (e) => {
    const { name, value } = e?.target || {};
    setCustomerData(prev => ({ ...prev, [name]: value }));

    // Real-time field validation
    let err = '';
    if (name === 'full_name') err = validateFullName(value);
    if (name === 'email') err = validateEmail(value);
    if (name === 'password') err = validatePassword(value);
    if (name === 'confirmPassword') err = validateConfirmPassword(customerData?.password, value);

    setFieldErrors(prev => ({ ...prev, [name]: err }));
    if (error) setError('');
    if (success) setSuccess('');
  };

  const handleCustomerSubmit = async (e) => {
    e?.preventDefault();
    setError('');
    setSuccess('');

    // Run all validations
    const nameErr = validateFullName(customerData?.full_name);
    const emailErr = validateEmail(customerData?.email);
    const passErr = validatePassword(customerData?.password);
    const confirmErr = validateConfirmPassword(customerData?.password, customerData?.confirmPassword);

    setFieldErrors({
      full_name: nameErr,
      email: emailErr,
      password: passErr,
      confirmPassword: confirmErr
    });

    if (nameErr || emailErr || passErr || confirmErr) return;

    setIsLoading(true);

    try {
      const { user: newUser, error: signUpError } = await signUp(customerData?.email, customerData?.password, {
        full_name: customerData?.full_name?.trim(),
        role: customerData?.role
      });
      
      if (signUpError) {
        setError(signUpError);
        return;
      }

      setSuccess('Account created successfully! You can now sign in with your email and password.');
      setTimeout(() => navigate('/auth/login'), 2500);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(customerData?.password);

  return (
    <>
      <Helmet>
        <title>Sign Up - GoShuttle Pro</title>
        <meta name="description" content="Create your GoShuttle Pro account to access premium transportation services, corporate fleet management, and exclusive member benefits." />
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
            Create your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Or{' '}
            <Link
              to="/auth/login"
              className="font-medium text-primary hover:text-primary-dark transition-colors"
            >
              sign in to existing account
            </Link>
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">

            {/* Success Message */}
            {success && (
              <div className="mb-6 rounded-md bg-green-50 p-4">
                <div className="flex">
                  <Icon name="CheckCircle" className="text-green-400" size={20} />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Registration Successful
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>{success}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="mb-6 rounded-md bg-red-50 p-4">
                <div className="flex">
                  <Icon name="AlertCircle" className="text-red-400" size={20} />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Registration Error
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Registration Form */}
            <form className="space-y-5" onSubmit={handleCustomerSubmit} noValidate>
              {/* Full Name */}
              <div>
                <label htmlFor="customer_full_name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <div className="mt-1">
                  <Input
                    id="customer_full_name"
                    name="full_name"
                    type="text"
                    autoComplete="name"
                    value={customerData?.full_name}
                    onChange={handleCustomerChange}
                    placeholder="Enter your full name"
                    className={fieldErrors?.full_name ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                </div>
                {fieldErrors?.full_name && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <Icon name="AlertCircle" size={12} />
                    {fieldErrors?.full_name}
                  </p>
                )}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="customer_email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <div className="mt-1">
                  <Input
                    id="customer_email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={customerData?.email}
                    onChange={handleCustomerChange}
                    placeholder="Enter your email"
                    className={fieldErrors?.email ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                </div>
                {fieldErrors?.email && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <Icon name="AlertCircle" size={12} />
                    {fieldErrors?.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="customer_password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="mt-1">
                  <Input
                    id="customer_password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={customerData?.password}
                    onChange={handleCustomerChange}
                    placeholder="Min. 8 chars, uppercase, number, symbol"
                    className={fieldErrors?.password ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                </div>
                {/* Password strength bar */}
                {customerData?.password && passwordStrength && (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-500">Password strength</span>
                      <span className={`text-xs font-medium ${
                        passwordStrength?.label === 'Weak' ? 'text-red-600' :
                        passwordStrength?.label === 'Fair' ? 'text-yellow-600' :
                        passwordStrength?.label === 'Good' ? 'text-blue-600' : 'text-green-600'
                      }`}>{passwordStrength?.label}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all duration-300 ${passwordStrength?.color} ${passwordStrength?.width}`} />
                    </div>
                  </div>
                )}
                {fieldErrors?.password && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <Icon name="AlertCircle" size={12} />
                    {fieldErrors?.password}
                  </p>
                )}
                {!fieldErrors?.password && !customerData?.password && (
                  <p className="mt-1 text-xs text-gray-500">
                    Must be 8+ characters with uppercase, number, and special character.
                  </p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="customer_confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm Password
                </label>
                <div className="mt-1">
                  <Input
                    id="customer_confirmPassword"
                    name="confirmPassword"
                    type="password"
                    autoComplete="new-password"
                    value={customerData?.confirmPassword}
                    onChange={handleCustomerChange}
                    placeholder="Confirm your password"
                    className={fieldErrors?.confirmPassword ? 'border-red-500 focus:ring-red-500' : ''}
                  />
                </div>
                {fieldErrors?.confirmPassword && (
                  <p className="mt-1 text-xs text-red-600 flex items-center gap-1">
                    <Icon name="AlertCircle" size={12} />
                    {fieldErrors?.confirmPassword}
                  </p>
                )}
              </div>

              <div>
                <Button
                  type="submit"
                  fullWidth
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </div>
            </form>

            <div className="mt-6">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">
                    By signing up, you agree to our Terms of Service
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Signup;