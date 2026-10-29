import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import FleetManagement from './components/FleetManagement';
import AppSettings from './components/AppSettings';
import UserManagement from './components/UserManagement';
import BookingManagement from './components/BookingManagement';
import CorporateManagement from './components/CorporateManagement';
import { supabase } from '../../lib/supabase';
import { Users, Settings, Building2, Car, Calendar, TrendingUp, Handshake, History, Bell, Activity, Route, Menu, X, BookOpen, DollarSign, MapPin, CreditCard, BarChart2, ShieldAlert, UserCheck, Shield, Mail, FileText, Wallet, Receipt } from 'lucide-react';
import PartnerManagement from './components/PartnerManagement';
import AuditTrail from './components/AuditTrail';
import NotificationLogs from './components/NotificationLogs';
import RouteManagement from './components/RouteManagement';
import vehicleService from '../../utils/vehicleService';
import bookingService from '../../services/bookingService';
import RateSheetManagement from './components/RateSheetManagement';
import DestinationRestrictions from './components/DestinationRestrictions';
import PaymentsManagement from './components/PaymentsManagement';
import RevenueCharts from './components/RevenueCharts';
import PaymentGateways from './components/PaymentGateways';
import ChargebacksDisputes from './components/ChargebacksDisputes';
import DriverManagementKYC from './components/DriverManagementKYC';
import AdminDriverDocumentReview from './components/AdminDriverDocumentReview';
import RoleManagement from './components/RoleManagement';
import AdminAuditPanel from './components/AdminAuditPanel';
import EmailTemplateManager from './components/EmailTemplateManager';
import CmsPageManager from './components/CmsPageManager';
import CustomerManagement from './components/CustomerManagement';
import AISecuritySettings from './components/AISecuritySettings';
import PendingUserReview from './components/PendingUserReview';

const AdminDashboard = () => {
  const { user, userProfile, isAdmin, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalVehicles: 0,
    totalUsers: 0,
    totalBookings: 0,
    activeBookings: 0
  });
  const [vehicles, setVehicles] = useState([]);
  const [users, setUsers] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loadingState, setLoading] = useState(true);
  const [activityPageSize, setActivityPageSize] = useState(30);
  const [activityTotalAmount, setActivityTotalAmount] = useState('');

  useEffect(() => {
    if (!loading && userProfile && !isAdmin) {
      // Staff members should go to staff dashboard
      if (userProfile?.role === 'staff') {
        window.location.href = '/staff-dashboard';
      } else {
        window.location.href = '/customer-account';
      }
    }
  }, [userProfile, isAdmin, loading]);

  useEffect(() => {
    if (!loading && isAdmin && userProfile) {
      loadDashboardData();
    }
  }, [isAdmin, loading, userProfile]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const vehiclesData = await vehicleService?.getAll();
      setVehicles(vehiclesData || []);

      // Query user_profiles — use count query as fallback if data is empty
      const [usersResult, bookingsData] = await Promise.all([
        supabase?.from('user_profiles')?.select('id, full_name, email, role, created_at, companies!user_profiles_company_id_fkey(name)'),
        bookingService?.getAllBookings()
      ]);

      let usersData = usersResult?.data || [];

      // If data is empty but no explicit error, try a count-only query to verify
      if (usersData?.length === 0 && !usersResult?.error) {
        const { count } = await supabase
          ?.from('user_profiles')
          ?.select('*', { count: 'exact', head: true });
        if (count && count > 0) {
          // RLS may be blocking full select; use count for stats display
          setStats(prev => ({ ...prev, totalUsers: count }));
        }
      }

      if (usersResult?.error) {
        console.warn('user_profiles query error:', usersResult?.error?.message);
      }

      if (usersData?.length > 0) setUsers(usersData);
      setBookings(bookingsData || []);
      setStats({
        totalVehicles: vehiclesData?.length || 0,
        totalUsers: usersData?.length || 0,
        totalBookings: bookingsData?.length || 0,
        activeBookings: bookingsData?.filter(b => b?.status === 'confirmed' || b?.status === 'in_progress')?.length || 0
      });

      // If we got users data, update the count from actual data
      if (usersData?.length > 0) {
        setStats(prev => ({ ...prev, totalUsers: usersData?.length }));
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setVehicles([]);
      setUsers([]);
      setBookings([]);
      setStats({ totalVehicles: 0, totalUsers: 0, totalBookings: 0, activeBookings: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleUpdate = async () => {
    try {
      const vehiclesData = await vehicleService?.getAll();
      setVehicles(vehiclesData || []);
      setStats(prev => ({ ...prev, totalVehicles: vehiclesData?.length || 0 }));
    } catch (error) {
      console.error('Error refreshing vehicles:', error);
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'revenue', label: 'Revenue', icon: BarChart2 },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'payment-gateways', label: 'Payment Gateways', icon: CreditCard },
    { id: 'chargebacks', label: 'Chargebacks & Disputes', icon: ShieldAlert },
    { id: 'corp-billing', label: 'Corp. Billing Ledger', icon: Receipt },
    { id: 'partner-payables', label: 'Partner Payables', icon: Wallet },
    { id: 'pending-review', label: 'Pending User Review', icon: UserCheck },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'customers', label: 'Customers', icon: Users },
    { id: 'roles', label: 'Roles & Privileges', icon: Activity },
    { id: 'drivers', label: 'Drivers & KYC', icon: UserCheck },
    { id: 'driver_docs', label: 'Driver Doc Review', icon: UserCheck },
    { id: 'bookings', label: 'Bookings', icon: Calendar },
    { id: 'fleet', label: 'Fleet', icon: Car },
    { id: 'ratesheet', label: 'Rate Sheets', icon: DollarSign },
    { id: 'destinations', label: 'Destinations', icon: MapPin },
    { id: 'routes', label: 'Routes', icon: Route },
    { id: 'corporate', label: 'Corporate', icon: Building2 },
    { id: 'partners', label: 'Partners', icon: Handshake },
    { id: 'ai-security', label: 'AI Security', icon: Shield },
    { id: 'email-templates', label: 'Email Templates', icon: Mail },
    { id: 'cms', label: 'CMS Pages', icon: FileText },
    { id: 'audit-panel', label: 'Audit Panel', icon: Shield },
    { id: 'audit', label: 'Audit Trail', icon: History },
    { id: 'notifications', label: 'Notification Logs', icon: Bell },
    { id: 'settings', label: 'Settings', icon: Settings }
  ];

  if (!loading && userProfile && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon name="Lock" size={48} className="text-gray-400 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">You don't have permission to access the admin dashboard.</p>
          <Button onClick={() => window.location.href = '/customer-account'}>Go to Customer Account</Button>
        </div>
      </div>
    );
  }

  if (loading || !userProfile) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" className="animate-spin mx-auto mb-4" size={24} />
          <p className="text-gray-600">{loading ? 'Authenticating...' : 'Loading admin dashboard...'}</p>
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-left max-w-md">
              <p className="font-semibold text-blue-900 mb-2">Development Info:</p>
              <p className="text-blue-700">Auth Loading: {loading ? 'Yes' : 'No'}</p>
              <p className="text-blue-700">User: {user ? 'Authenticated' : 'Not authenticated'}</p>
              <p className="text-blue-700">Profile: {userProfile ? 'Loaded' : 'Not loaded'}</p>
              <p className="text-blue-700">Role: {userProfile?.role || 'None'}</p>
              <p className="text-blue-700">Is Admin: {isAdmin ? 'Yes' : 'No'}</p>
              <div className="mt-2 p-2 bg-white rounded text-xs">
                <p className="font-medium">Test Admin Credentials:</p>
                <p>Email: admin@goshuttle.com</p>
                <p>Password: admin123</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="space-y-4 sm:space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-2 sm:mb-0">
                    <Icon name="Car" size={16} className="sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="sm:ml-4">
                    <h3 className="text-sm sm:text-lg font-semibold text-gray-900">{stats?.totalVehicles}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Total Vehicles</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-green-100 rounded-lg flex items-center justify-center mb-2 sm:mb-0">
                    <Icon name="Users" size={16} className="sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="sm:ml-4">
                    <h3 className="text-sm sm:text-lg font-semibold text-gray-900">{stats?.totalUsers}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Total Users</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-2 sm:mb-0">
                    <Icon name="Calendar" size={16} className="sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div className="sm:ml-4">
                    <h3 className="text-sm sm:text-lg font-semibold text-gray-900">{stats?.totalBookings}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Total Bookings</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center">
                  <div className="w-8 h-8 sm:w-12 sm:h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-2 sm:mb-0">
                    <Icon name="Clock" size={16} className="sm:w-6 sm:h-6 text-orange-600" />
                  </div>
                  <div className="sm:ml-4">
                    <h3 className="text-sm sm:text-lg font-semibold text-gray-900">{stats?.activeBookings}</h3>
                    <p className="text-xs sm:text-sm text-gray-600">Active Bookings</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 sm:mb-6">
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Activity</h2>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-500 whitespace-nowrap">Total Amount (₱):</label>
                    <input
                      type="number"
                      min="0"
                      value={activityTotalAmount}
                      onChange={(e) => setActivityTotalAmount(e?.target?.value)}
                      placeholder="e.g. 50000"
                      className="w-28 px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs text-gray-500 whitespace-nowrap">Show:</label>
                    <select
                      value={activityPageSize}
                      onChange={(e) => setActivityPageSize(Number(e?.target?.value))}
                      className="px-2 py-1 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                    >
                      <option value={30}>30</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
              </div>
              {activityTotalAmount && (
                <div className="mb-4 px-3 py-2 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
                  <Icon name="DollarSign" size={14} className="text-green-600 flex-shrink-0" />
                  <span className="text-sm text-green-800 font-medium">
                    Total Amount: ₱{Number(activityTotalAmount)?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="space-y-3 sm:space-y-4">
                {bookings?.slice(0, activityPageSize)?.map((booking) => (
                  <div key={booking?.id} className="flex items-start justify-between py-2 sm:py-3 border-b border-gray-100 last:border-0">
                    <div className="flex items-start space-x-3 sm:space-x-4 min-w-0 flex-1">
                      <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                          New booking by {booking?.user_profiles?.full_name || booking?.guestName || (booking?.primaryPassengerFirstName ? `${booking?.primaryPassengerFirstName} ${booking?.primaryPassengerLastName || ''}`?.trim() : null) || 'Guest'}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {booking?.pickupLocation || booking?.pickup_location} → {booking?.dropoffLocation || booking?.dropoff_location}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {new Date(booking?.created_at)?.toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {bookings?.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">No recent activity</p>
                )}
              </div>
              {bookings?.length > activityPageSize && (
                <p className="text-xs text-gray-400 text-center mt-3">
                  Showing {activityPageSize} of {bookings?.length} bookings
                </p>
              )}
            </div>
          </div>
        );
      case 'corp-billing':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Corporate Billing Ledger</h2>
                <p className="text-sm text-gray-500">View and manage corporate billing accounts and statements</p>
              </div>
              <a href="/corporate-billing-ledger" className="inline-flex items-center space-x-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
                <Receipt size={16} />
                <span>Open Full Ledger</span>
              </a>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start space-x-3">
              <Receipt size={18} className="text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800">Corporate Billing Engine Active</p>
                <p className="text-xs text-blue-700 mt-0.5">Trip fares are automatically posted to corporate billing accounts when trips are completed. Use the full ledger view to manage statements and payments.</p>
              </div>
            </div>
          </div>
        );
      case 'partner-payables':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Partner Payable Ledger</h2>
                <p className="text-sm text-gray-500">Track driver earnings and manage payment disbursements</p>
              </div>
              <a href="/partner-payable-ledger" className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors">
                <Wallet size={16} />
                <span>Open Payable Ledger</span>
              </a>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-start space-x-3">
              <Wallet size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-800">Partner Payable Engine Active</p>
                <p className="text-xs text-emerald-700 mt-0.5">Driver earnings are automatically calculated and posted to partner payable accounts when trips are completed. Use the full ledger to post payments.</p>
              </div>
            </div>
          </div>
        );
      case 'revenue':
        return <RevenueCharts />;
      case 'payments':
        return <PaymentsManagement />;
      case 'payment-gateways':
        return <PaymentGateways />;
      case 'chargebacks':
        return <ChargebacksDisputes />;
      case 'pending-review':
        return <PendingUserReview />;
      case 'users':
        return <UserManagement propUsers={users} onUpdate={loadDashboardData} />;
      case 'customers':
        return <CustomerManagement />;
      case 'roles':
        return <RoleManagement />;
      case 'drivers':
        return <DriverManagementKYC />;
      case 'driver_docs':
        return <AdminDriverDocumentReview />;
      case 'bookings':
        return <BookingManagement bookings={bookings} onUpdate={loadDashboardData} />;
      case 'fleet':
        return <FleetManagement vehicles={vehicles} onUpdate={handleVehicleUpdate} />;
      case 'ratesheet':
        return <RateSheetManagement />;
      case 'destinations':
        return <DestinationRestrictions />;
      case 'routes':
        return <RouteManagement />;
      case 'corporate':
        return <CorporateManagement />;
      case 'partners':
        return <PartnerManagement />;
      case 'email-templates':
        return <EmailTemplateManager />;
      case 'cms':
        return <CmsPageManager />;
      case 'audit-panel':
        return <AdminAuditPanel />;
      case 'audit':
        return <AuditTrail />;
      case 'notifications':
        return <NotificationLogs />;
      case 'settings':
        return <AppSettings />;
      case 'ai-security':
        return <AISecuritySettings />;
      default:
        return (
          <div className="text-center py-12">
            <p className="text-gray-500">Select a menu item to view content</p>
          </div>
        );
    }
  };

  const activeMenuItem = menuItems?.find(item => item?.id === activeTab);

  return (
    <>
      <Helmet>
        <title>Admin Dashboard - GoShuttle Pro</title>
        <meta name="description" content="GoShuttle Pro admin dashboard for managing fleet vehicles, user accounts, bookings, and application settings." />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="pt-16 flex min-h-screen">
          {/* Mobile Overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 z-20 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          {/* Sidebar */}
          <aside className={`fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:h-auto lg:flex`}>

            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Signed in as</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{userProfile?.full_name}</p>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2">Navigation</p>
              <ul className="space-y-1">
                {menuItems?.map((item) => {
                  const ItemIcon = item?.icon;
                  const isActive = activeTab === item?.id;
                  return (
                    <li key={item?.id}>
                      <button
                        onClick={() => {
                          setActiveTab(item?.id);
                          setSidebarOpen(false);
                        }}
                        className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-primary text-white' :'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }`}
                      >
                        <ItemIcon size={18} className="flex-shrink-0" />
                        <span>{item?.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Sidebar Footer Links */}
            <div className="p-3 border-t border-gray-200 space-y-1">
              <a
                href="/admin-how-to"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <BookOpen size={18} className="flex-shrink-0" />
                <span>How To Guide</span>
              </a>
              <a
                href="/ops-dashboard"
                className="flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
              >
                <Activity size={18} className="flex-shrink-0" />
                <span>Ops Dashboard</span>
              </a>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0 lg:ml-0">
            {/* Page Header */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                {/* Mobile menu toggle */}
                <button
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100"
                >
                  <Menu size={20} />
                </button>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                    {activeMenuItem?.label || 'Admin Dashboard'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">Manage GoShuttle Pro system and operations</p>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-4 sm:p-6 lg:p-8">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default AdminDashboard;