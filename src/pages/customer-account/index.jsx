import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import AccountHeader from './components/AccountHeader';
import QuickActions from './components/QuickActions';
import StatsOverview from './components/StatsOverview';
import TripHistory from './components/TripHistory';
import LoyaltyRewards from './components/LoyaltyRewards';
import SavedPreferences from './components/SavedPreferences';
import PaymentMethods from './components/PaymentMethods';
import AccountSettings from './components/AccountSettings';
import BookingStatusHistory from './components/BookingStatusHistory';
import KYCVerification from './components/KYCVerification';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { loyaltyService } from '../../utils/loyaltyService';

const CustomerAccount = () => {
  const navigate = useNavigate();
  const { user, userProfile, loading, isAuthenticated } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [bookings, setBookings] = useState([]);
  const [statsData, setStatsData] = useState({
    totalTrips: 0,
    totalDistance: 0,
    moneySaved: 0,
    carbonOffset: 0
  });
  const [dataLoading, setDataLoading] = useState(true);
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);

  // Payment methods state
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);
  const [selectedPaymentType, setSelectedPaymentType] = useState(null);
  const [paymentFormData, setPaymentFormData] = useState({ label: '', details: '' });
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate('/auth/login');
    }
  }, [loading, isAuthenticated, navigate]);

  // Load user bookings and stats - debounced to prevent multiple calls
  const loadUserData = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    
    try {
      setDataLoading(true);
      
      // Load user bookings
      const { data: bookingsData, error } = await supabase
        ?.from('bookings')
        ?.select('*, vehicles(name, image_url)')
        ?.eq('user_id', user?.id)
        ?.order('created_at', { ascending: false });

      if (bookingsData && !error) {
        setBookings(bookingsData);
        
        // Calculate stats from real data
        const completedTrips = bookingsData?.filter(b => b?.status === 'completed');
        const totalCost = completedTrips?.reduce((sum, trip) => sum + (trip?.total_cost || 0), 0);
        
        setStatsData({
          totalTrips: completedTrips?.length || 0,
          totalDistance: completedTrips?.length * 25, // Estimated 25km average per trip
          moneySaved: totalCost * 0.15, // Estimated 15% savings vs alternatives
          carbonOffset: completedTrips?.length * 2.5 // Estimated 2.5kg CO2 saved per trip
        });
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setDataLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  // Load data when user changes
  useEffect(() => {
    let mounted = true;
    
    if (isAuthenticated && user?.id) {
      // Add a small delay to prevent immediate loading issues
      const timer = setTimeout(() => {
        if (mounted) {
          loadUserData();
        }
      }, 100);
      
      return () => {
        clearTimeout(timer);
        mounted = false;
      };
    }
  }, [isAuthenticated, user?.id, loadUserData]);

  // Calculate membership discount based on tier
  const calculateMembershipDiscount = useCallback((tier) => {
    const discountRates = {
      bronze: 0,
      silver: 5,
      gold: 10,
      platinum: 15
    };
    return discountRates?.[tier] || 0;
  }, []);

  // Memoize enhanced user data to prevent unnecessary recalculations
  const enhancedUser = useMemo(() => ({
    name: userProfile?.full_name || user?.email,
    email: userProfile?.email || user?.email,
    avatar: userProfile?.avatar_url || "https://images.unsplash.com/photo-1706565029882-6f25f1d9af65",
    avatarAlt: "User profile photo",
    rating: 4.9,
    memberSince: userProfile?.created_at ? new Date(userProfile.created_at)?.getFullYear() : new Date()?.getFullYear(),
    
    // Enhanced loyalty information
    loyaltyTier: userProfile?.membership_tier || 'bronze',
    loyaltyPoints: userProfile?.loyalty_points || 0,
    lifetimePoints: userProfile?.points_lifetime || 0,
    pointsToNext: loyaltyService?.calculatePointsToNextTier(userProfile?.points_lifetime || 0, userProfile?.membership_tier || 'bronze'),
    nextTier: loyaltyService?.getNextTier(userProfile?.membership_tier || 'bronze'),
    loyaltyProgress: loyaltyService?.calculateTierProgress(userProfile?.points_lifetime || 0, userProfile?.membership_tier || 'bronze'),
    membershipDiscount: calculateMembershipDiscount(userProfile?.membership_tier || 'bronze'),
    
    // Stats
    totalTrips: statsData?.totalTrips
  }), [userProfile, user, statsData, calculateMembershipDiscount]);

  // Enhanced profile refresh handler - prevent unnecessary re-renders
  const handleProfileRefresh = useCallback((updatedProfile) => {
    // Only update if the profile actually changed
    if (JSON.stringify(updatedProfile) !== JSON.stringify(userProfile)) {
      setProfileRefreshKey(prev => prev + 1);
      
      // Dispatch custom event for other components
      const profileUpdateEvent = new CustomEvent('profileUpdated', {
        detail: { 
          userId: user?.id,
          profile: updatedProfile 
        }
      });
      window?.dispatchEvent(profileUpdateEvent);
    }
  }, [user?.id, userProfile]);

  // Memoize sidebar items to prevent re-renders
  const sidebarItems = useMemo(() => [
    { id: 'overview', label: 'Overview', icon: 'LayoutDashboard' },
    { id: 'trips', label: 'Trip History', icon: 'Calendar' },
    { id: 'booking-status', label: 'Booking Status', icon: 'ClipboardList' },
    { id: 'loyalty', label: 'Loyalty & Rewards', icon: 'Star' },
    { id: 'kyc', label: 'Identity Verification', icon: 'ShieldCheck' },
    { id: 'preferences', label: 'Preferences', icon: 'Settings' },
    { id: 'payments', label: 'Payment Methods', icon: 'CreditCard' },
    { id: 'settings', label: 'Account Settings', icon: 'User' }
  ], []);

  const handleQuickAction = useCallback((actionId) => {
    switch (actionId) {
      case 'book': navigate('/smart-booking-portal');
        break;
      case 'track': navigate('/live-tracking');
        break;
      case 'support': navigate('/support-center');
        break;
      case 'referral': setActiveSection('loyalty');
        break;
      default:
        break;
    }
  }, [navigate]);

  const handleAddPayment = (type) => {
    setSelectedPaymentType(type || null);
    setPaymentFormData({ label: '', details: '' });
    setShowAddPaymentModal(true);
  };

  const handleSavePaymentMethod = () => {
    if (!selectedPaymentType) return;
    setPaymentSaving(true);

    const typeLabels = {
      credit: 'Credit Card',
      gcash: 'GCash',
      paymaya: 'PayMaya',
      bank: 'Bank Transfer'
    };

    const newMethod = {
      id: Date.now()?.toString(),
      type: selectedPaymentType,
      name: paymentFormData?.label?.trim() || typeLabels?.[selectedPaymentType] || selectedPaymentType,
      details: paymentFormData?.details?.trim() || `${typeLabels?.[selectedPaymentType]} account`,
      addedDate: new Date()?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      isDefault: paymentMethods?.length === 0,
      features: selectedPaymentType === 'credit'
        ? ['Secure', 'Instant', 'Rewards']
        : selectedPaymentType === 'gcash'
        ? ['Cashless', 'Instant', 'No fees']
        : selectedPaymentType === 'paymaya'
        ? ['Cashless', 'Instant', 'Rewards']
        : ['Bank-level security', 'No fees']
    };

    setPaymentMethods(prev => [...prev, newMethod]);
    setShowAddPaymentModal(false);
    setSelectedPaymentType(null);
    setPaymentFormData({ label: '', details: '' });
    setPaymentSaving(false);
  };

  const handleRemovePayment = (id) => {
    setPaymentMethods(prev => {
      const filtered = prev?.filter(m => m?.id !== id);
      // If removed method was default, set first remaining as default
      if (filtered?.length > 0 && !filtered?.some(m => m?.isDefault)) {
        filtered[0] = { ...filtered?.[0], isDefault: true };
      }
      return filtered;
    });
  };

  const handleSetDefaultPayment = (id) => {
    setPaymentMethods(prev =>
      prev?.map(m => ({ ...m, isDefault: m?.id === id }))
    );
  };

  // Memoize rendered content to prevent unnecessary re-renders
  const renderContent = useMemo(() => {
    switch (activeSection) {
      case 'overview':
        return (
          <div className="space-y-6">
            <QuickActions onAction={handleQuickAction} />
            <StatsOverview stats={statsData} />
            <div className="grid grid-cols-1 gap-6">
              <TripHistory trips={bookings?.slice(0, 3)} onRefresh={loadUserData} userEmail={user?.email || userProfile?.email} />
              <LoyaltyRewards />
            </div>
          </div>
        );
      case 'trips':
        return <TripHistory trips={bookings} onRefresh={loadUserData} userEmail={user?.email || userProfile?.email} />;
      case 'booking-status':
        return <BookingStatusHistory bookings={bookings} onRefresh={loadUserData} />;
      case 'loyalty':
        return <LoyaltyRewards />;
      case 'kyc':
        return <KYCVerification />;
      case 'preferences':
        return <SavedPreferences preferences={{}} onUpdatePreferences={() => {}} />;
      case 'payments':
        return (
          <PaymentMethods
            paymentMethods={paymentMethods}
            onAddPayment={handleAddPayment}
            onRemovePayment={handleRemovePayment}
            onSetDefault={handleSetDefaultPayment}
          />
        );
      case 'settings':
        return <AccountSettings settings={{}} onUpdateSettings={() => {}} onProfileUpdate={handleProfileRefresh} />;
      default:
        return null;
    }
  }, [activeSection, handleQuickAction, statsData, bookings, paymentMethods]);

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16 flex items-center justify-center" style={{minHeight: 'calc(100vh - 4rem)'}}>
          <div className="text-center">
            <Icon name="Loader2" className="animate-spin mx-auto mb-4" size={24} />
            <p className="text-gray-600">Loading your account...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login prompt for non-authenticated users
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16 flex items-center justify-center" style={{minHeight: 'calc(100vh - 4rem)'}}>
          <div className="text-center">
            <Icon name="Lock" size={48} className="text-gray-400 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Please Sign In</h1>
            <p className="text-gray-600 mb-4">You need to be logged in to access your account</p>
            <Button onClick={() => navigate('/auth/login')}>
              Sign In
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>My Account - GoShuttle Pro</title>
        <meta name="description" content="Manage your GoShuttle Pro account, view trip history, loyalty rewards, and preferences. Your personalized transportation hub." />
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        <Header />

        {/* Add Payment Method Modal */}
        {showAddPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Add Payment Method</h3>
                <button
                  onClick={() => { setShowAddPaymentModal(false); setSelectedPaymentType(null); }}
                  className="p-1 hover:bg-gray-100 rounded-full"
                >
                  <Icon name="X" size={20} className="text-gray-500" />
                </button>
              </div>

              {!selectedPaymentType ? (
                <div>
                  <p className="text-sm text-gray-600 mb-4">Select a payment method to add:</p>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { type: 'credit', label: 'Credit Card', icon: 'CreditCard', color: 'text-blue-600 bg-blue-50 border-blue-200' },
                      { type: 'gcash', label: 'GCash', icon: 'Smartphone', color: 'text-green-600 bg-green-50 border-green-200' },
                      { type: 'paymaya', label: 'PayMaya', icon: 'Wallet', color: 'text-purple-600 bg-purple-50 border-purple-200' },
                      { type: 'bank', label: 'Bank Transfer', icon: 'Building2', color: 'text-gray-600 bg-gray-50 border-gray-200' }
                    ]?.map((method) => (
                      <button
                        key={method?.type}
                        onClick={() => setSelectedPaymentType(method?.type)}
                        className={`flex flex-col items-center gap-2 p-4 border-2 rounded-xl hover:shadow-md transition-all ${method?.color}`}
                      >
                        <Icon name={method?.icon} size={28} />
                        <span className="text-sm font-medium">{method?.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 mb-4 p-3 bg-gray-50 rounded-lg">
                    <Icon name={
                      selectedPaymentType === 'credit' ? 'CreditCard' :
                      selectedPaymentType === 'gcash' ? 'Smartphone' :
                      selectedPaymentType === 'paymaya' ? 'Wallet' : 'Building2'
                    } size={20} className="text-primary" />
                    <span className="font-medium text-gray-800 capitalize">
                      {selectedPaymentType === 'credit' ? 'Credit Card' :
                       selectedPaymentType === 'gcash' ? 'GCash' :
                       selectedPaymentType === 'paymaya' ? 'PayMaya' : 'Bank Transfer'}
                    </span>
                    <button
                      onClick={() => setSelectedPaymentType(null)}
                      className="ml-auto text-xs text-primary underline"
                    >
                      Change
                    </button>
                  </div>

                  <div className="space-y-3 mb-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {selectedPaymentType === 'credit' ? 'Card Nickname' :
                         selectedPaymentType === 'bank' ? 'Account Nickname' : 'Account Name'}
                      </label>
                      <input
                        type="text"
                        value={paymentFormData?.label}
                        onChange={e => setPaymentFormData(prev => ({ ...prev, label: e?.target?.value }))}
                        placeholder={
                          selectedPaymentType === 'credit' ? 'e.g. My Visa Card' :
                          selectedPaymentType === 'gcash' ? 'e.g. My GCash' :
                          selectedPaymentType === 'paymaya'? 'e.g. My PayMaya' : 'e.g. BDO Savings'
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {selectedPaymentType === 'credit' ? 'Last 4 digits (optional)' :
                         selectedPaymentType === 'bank' ? 'Account number (last 4 digits, optional)' :
                         'Registered mobile number (optional)'}
                      </label>
                      <input
                        type="text"
                        value={paymentFormData?.details}
                        onChange={e => setPaymentFormData(prev => ({ ...prev, details: e?.target?.value }))}
                        placeholder={
                          selectedPaymentType === 'credit' ? 'e.g. •••• 4242' :
                          selectedPaymentType === 'bank'? 'e.g. •••• 5678' : 'e.g. 09XX XXX XXXX'
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => { setShowAddPaymentModal(false); setSelectedPaymentType(null); }}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={handleSavePaymentMethod}
                      disabled={paymentSaving}
                    >
                      {paymentSaving ? (
                        <Icon name="Loader2" size={16} className="animate-spin mr-2" />
                      ) : (
                        <Icon name="Plus" size={16} className="mr-2" />
                      )}
                      Add Method
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AccountHeader 
              onProfileRefresh={handleProfileRefresh}
            />
            
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Sidebar with fixed dimensions to prevent layout shift */}
              <div className="lg:w-64 flex-shrink-0">
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4" style={{minHeight: '400px'}}>
                  <nav className="space-y-1">
                    {sidebarItems?.map((item) =>
                      <button
                        key={item?.id}
                        onClick={() => setActiveSection(item?.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                          activeSection === item?.id ?
                          'bg-primary text-white' : 'text-gray-700 hover:bg-gray-100'}`
                        }>
                        <Icon name={item?.icon} size={18} />
                        {item?.label}
                      </button>
                    )}
                  </nav>
                </div>
              </div>

              {/* Main Content with stable height */}
              <div className="flex-1 min-w-0">
                {dataLoading ? (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center" style={{minHeight: '400px'}}>
                    <Icon name="Loader2" className="animate-spin mx-auto mb-4" size={24} />
                    <p className="text-gray-600">Loading content...</p>
                  </div>
                ) : (
                  <div style={{minHeight: '400px'}}>
                    {renderContent}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CustomerAccount;