import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Icon from '../AppIcon';
import Button from './Button';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const navigate = useNavigate();
  const { user, userProfile, signOut, isAuthenticated, isAdmin, isCorporateManager } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isDriverDropdownOpen, setIsDriverDropdownOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      setIsProfileDropdownOpen(false);
      setIsMenuOpen(false);
      await signOut();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
      setIsProfileDropdownOpen(false);
      setIsMenuOpen(false);
      window.location.href = '/';
    }
  };

  // Role-based My Account link
  const getMyAccountHref = () => {
    if (isAdmin) return '/admin-dashboard';
    if (isCorporateManager) return '/corporate-dashboard';
    return '/customer-account';
  };

  const getLogoHref = () => {
    if (isAdmin) return '/admin-dashboard';
    return '/';
  };

  const userMenuItems = [
    { name: 'My Account', href: getMyAccountHref(), icon: 'User' },
    { name: 'Track Trip', href: '/live-tracking', icon: 'Navigation' },
    { name: 'Notification Settings', href: '/notification-settings', icon: 'Bell' },
  ];

  if (isCorporateManager && !isAdmin) {
    userMenuItems?.push({ name: 'Corporate Dashboard', href: '/corporate-dashboard', icon: 'BarChart3' });
    userMenuItems?.push({ name: 'Billing Ledger', href: '/corporate-billing-ledger', icon: 'FileText' });
  }

  if (isAdmin) {
    userMenuItems?.push({ name: 'Admin Dashboard', href: '/admin-dashboard', icon: 'Settings' });
    userMenuItems?.push({ name: 'Fleet Live Map', href: '/fleet-live-map', icon: 'Map' });
    userMenuItems?.push({ name: 'Partner Payables', href: '/partner-payable-ledger', icon: 'Wallet' });
  }

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 fixed top-0 left-0 right-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to={getLogoHref()} className="flex items-center space-x-3">
            <img
              src="/assets/images/goshuttle-vertical-1762404728137.png"
              alt="GoShuttle Logo"
              className="h-10 w-auto object-contain"
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center space-x-6">
            <Link to="/fleet-showcase" className="text-sm text-gray-600 hover:text-primary transition-colors font-medium">Fleet</Link>
            <Link to="/route-network" className="text-sm text-gray-600 hover:text-primary transition-colors font-medium">Routes</Link>
            <Link to="/how-it-works" className="text-sm text-gray-600 hover:text-primary transition-colors font-medium">How It Works</Link>
            <Link to="/support-center" className="text-sm text-gray-600 hover:text-primary transition-colors font-medium">Support</Link>
          </nav>

          {/* User Actions */}
          <div className="flex items-center space-x-4">
            {isAuthenticated ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileDropdownOpen(!isProfileDropdownOpen)}
                  className="flex items-center space-x-2 text-gray-700 hover:text-primary transition-colors"
                >
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                    <Icon name="User" size={16} />
                  </div>
                  <span className="hidden sm:block">{userProfile?.full_name || user?.email}</span>
                  <Icon name="ChevronDown" size={16} />
                </button>

                {isProfileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="text-sm font-medium text-gray-900">{userProfile?.full_name || user?.email}</p>
                      <p className="text-xs text-gray-500">{userProfile?.role?.replace('_', ' ')?.toUpperCase() || 'Customer'}</p>
                    </div>
                    {userMenuItems?.map((item) => (
                      <Link
                        key={item?.name}
                        to={item?.href}
                        onClick={() => setIsProfileDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        <Icon name={item?.icon} size={16} />
                        <span>{item?.name}</span>
                      </Link>
                    ))}
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <Icon name="LogOut" size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden md:flex items-center space-x-3">
                <Link to="/auth/login">
                  <Button variant="outline" size="sm">Sign In</Button>
                </Link>
                <Link to="/auth/signup">
                  <Button size="sm">Sign Up</Button>
                </Link>
                {/* Driver dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setIsDriverDropdownOpen(!isDriverDropdownOpen)}
                    className="inline-flex items-center space-x-1 h-9 px-3 text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors"
                  >
                    <Icon name="Truck" size={15} />
                    <span>Drivers</span>
                    <Icon name="ChevronDown" size={14} />
                  </button>
                  {isDriverDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                      <Link
                        to="/driver-registration-form"
                        onClick={() => setIsDriverDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      >
                        <Icon name="UserPlus" size={15} />
                        <span>Driver Sign Up</span>
                      </Link>
                      <Link
                        to="/auth/driver-login"
                        onClick={() => setIsDriverDropdownOpen(false)}
                        className="flex items-center space-x-2 px-4 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors"
                      >
                        <Icon name="LogIn" size={15} />
                        <span>Driver Login</span>
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2 text-gray-700 hover:text-primary transition-colors rounded-lg active:bg-gray-100"
              onClick={() => setIsMenuOpen(prev => !prev)}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
            >
              <Icon name={isMenuOpen ? "X" : "Menu"} size={24} />
            </button>
          </div>
        </div>

        {/* Mobile Navigation - animated slide down */}
        <div
          className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
            isMenuOpen ? 'max-h-screen opacity-100' : 'max-h-0 opacity-0'
          }`}
        >
          <div className="border-t border-gray-200 py-4 bg-white">
            <nav className="space-y-1">
              {/* Common nav links always visible */}
              <Link
                to="/"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Icon name="Home" size={16} />
                <span>Home</span>
              </Link>
              <Link
                to="/fleet-showcase"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Icon name="Car" size={16} />
                <span>Our Fleet</span>
              </Link>
              <Link
                to="/route-network"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Icon name="Map" size={16} />
                <span>Routes</span>
              </Link>
              <Link
                to="/how-it-works"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Icon name="HelpCircle" size={16} />
                <span>How It Works</span>
              </Link>
              <Link
                to="/support-center"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Icon name="Headphones" size={16} />
                <span>Support</span>
              </Link>

              {isAuthenticated ? (
                <>
                  <div className="border-t border-gray-200 pt-2 mt-2">
                    {userMenuItems?.map((item) => (
                      <Link
                        key={item?.name}
                        to={item?.href}
                        onClick={() => setIsMenuOpen(false)}
                        className="flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                      >
                        <Icon name={item?.icon} size={16} />
                        <span>{item?.name}</span>
                      </Link>
                    ))}
                    <button
                      onClick={() => { setIsMenuOpen(false); handleSignOut(); }}
                      className="w-full flex items-center space-x-3 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                    >
                      <Icon name="LogOut" size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="pt-2 border-t border-gray-200 space-y-2 px-3">
                  <Link to="/auth/login" onClick={() => setIsMenuOpen(false)} className="block w-full">
                    <Button variant="outline" size="sm" className="w-full">Sign In</Button>
                  </Link>
                  <Link to="/auth/signup" onClick={() => setIsMenuOpen(false)} className="block w-full">
                    <Button size="sm" className="w-full">Sign Up</Button>
                  </Link>
                  <div className="border-t border-gray-100 pt-2">
                    <p className="text-xs text-gray-500 mb-1 font-medium">Drivers</p>
                    <Link
                      to="/driver-registration-form"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-2 px-2 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg"
                    >
                      <Icon name="UserPlus" size={15} />
                      <span>Driver Sign Up</span>
                    </Link>
                    <Link
                      to="/auth/driver-login"
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-2 px-2 py-2 text-sm text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 rounded-lg"
                    >
                      <Icon name="LogIn" size={15} />
                      <span>Driver Login</span>
                    </Link>
                  </div>
                </div>
              )}
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;