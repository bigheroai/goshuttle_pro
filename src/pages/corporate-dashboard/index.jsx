import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/ui/Header';
import RecentBookingsTable from './components/RecentBookingsTable';
import BudgetTracker from './components/BudgetTracker';
import UsageChart from './components/UsageChart';
import BulkBookingModal from './components/BulkBookingModal';
import ReportModal from './components/ReportModal';
import CarpoolBookingModal from './components/CarpoolBookingModal';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import reportService from '../../utils/reportService';
import ApprovalQueuePanel from './components/ApprovalQueuePanel';

const sideNavItems = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/corporate-dashboard' },
  { label: 'Billing Ledger', icon: 'FileText', path: '/corporate-billing-ledger' },
  { label: 'Reports', icon: 'FileBarChart', path: '/corporate-reports' },
  { label: 'Book a Trip', icon: 'Plus', path: '/smart-booking-portal' },
  { label: 'My Bookings', icon: 'Calendar', path: '/live-tracking' },
  { label: 'Account Settings', icon: 'Settings', path: '/customer-account' },
  { label: 'Support', icon: 'HelpCircle', path: '/support-center' },
];

const CorporateDashboard = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showBulkBooking, setShowBulkBooking] = useState(false);
  const [showCarpool, setShowCarpool] = useState(false);
  const [showReports, setShowReports] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalBookings: 0,
    activeBookings: 0,
    monthlySpend: 0,
    teamMembers: 0
  });
  const [recentBookings, setRecentBookings] = useState([]);

  const loadDashboardData = useCallback(async () => {
    if (!userProfile?.company_id) return;
    try {
      setLoading(true);

      // First get all user IDs belonging to this company
      const { data: companyUsers } = await supabase
        ?.from('user_profiles')
        ?.select('id')
        ?.eq('company_id', userProfile?.company_id);

      const companyUserIds = companyUsers?.map(u => u?.id) || [];

      const [bookingsResult, statsData] = await Promise.all([
        companyUserIds?.length > 0
          ? supabase?.from('bookings')?.select(`
              *,
              user_profiles!bookings_user_id_fkey(company_id, full_name, email),
              vehicles(name, vehicle_type)
            `)?.in('user_id', companyUserIds)?.order('created_at', { ascending: false })?.limit(10)
          : Promise.resolve({ data: [] }),
        reportService?.getBookingStats(userProfile?.company_id, 30)
      ]);

      if (bookingsResult?.data) {
        setRecentBookings(bookingsResult?.data?.map(booking => ({
          id: booking?.id,
          employeeName: booking?.user_profiles?.full_name,
          vehicleName: booking?.vehicles?.name,
          pickupLocation: booking?.pickup_location,
          dropoffLocation: booking?.dropoff_location,
          pickupDate: booking?.pickup_date,
          status: booking?.status,
          totalCost: booking?.total_cost,
          createdAt: booking?.created_at
        })));
      }

      const { count: teamCount } = await supabase?.from('user_profiles')?.select('*', { count: 'exact', head: true })?.eq('company_id', userProfile?.company_id);

      setStats({
        totalBookings: statsData?.totalBookings || 0,
        activeBookings: statsData?.activeBookings || 0,
        monthlySpend: parseFloat(statsData?.totalCost || 0),
        teamMembers: teamCount || 0
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [userProfile?.company_id]);

  useEffect(() => {
    let mounted = true;
    if (userProfile?.company_id) {
      const timer = setTimeout(() => {
        if (mounted) loadDashboardData();
      }, 100);
      return () => { clearTimeout(timer); mounted = false; };
    } else if (userProfile !== null) {
      // Profile loaded but no company_id — stop loading
      setLoading(false);
    }
  }, [userProfile?.company_id, userProfile, loadDashboardData]);

  const handleBulkBookingSuccess = useCallback(() => {
    setShowBulkBooking(false);
    loadDashboardData();
  }, [loadDashboardData]);

  const handleCarpoolSuccess = useCallback(() => {
    setShowCarpool(false);
    loadDashboardData();
  }, [loadDashboardData]);

  const companyName = userProfile?.companyName || userProfile?.company_name || 'Your Company';
  const firstName = userProfile?.fullName?.split(' ')?.[0] || userProfile?.full_name?.split(' ')?.[0] || 'there';

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <div className="h-8 bg-gray-200 rounded animate-pulse mb-2 w-1/2"></div>
              <div className="h-5 bg-gray-200 rounded animate-pulse w-1/3"></div>
            </div>
            <div className="h-40 bg-gray-200 rounded-2xl animate-pulse mb-8"></div>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[...Array(4)]?.map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse" style={{minHeight: '110px'}}>
                  <div className="h-4 bg-gray-200 rounded mb-3 w-3/4"></div>
                  <div className="h-7 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Corporate Dashboard - GoShuttle Pro</title>
        <meta name="description" content="Book and manage business transportation for your team with GoShuttle Corporate." />
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        <Header />

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-30 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex pt-16">
          {/* Side Panel */}
          <aside
            className={`fixed top-16 left-0 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 z-40 flex flex-col transition-transform duration-300 ease-in-out
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:h-auto lg:z-auto`}
          >
            {/* Sidebar Header */}
            <div className="px-5 py-5 border-b border-gray-100">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Icon name="Building2" size={16} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-900 truncate">Corporate Account</p>
                  <p className="text-xs text-gray-400 truncate">{userProfile?.full_name || 'Corporate User'}</p>
                </div>
              </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              <p className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Navigation</p>
              {sideNavItems?.map((item) => {
                const isActive = location?.pathname === item?.path;
                return (
                  <button
                    key={item?.path}
                    onClick={() => { navigate(item?.path); setSidebarOpen(false); }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                      ${isActive
                        ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                      }`}
                  >
                    <Icon
                      name={item?.icon}
                      size={16}
                      className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                    />
                    <span>{item?.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />
                    )}
                  </button>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className="px-4 py-4 border-t border-gray-100">
              <button
                onClick={() => navigate('/corporate-dashboard')}
                className="w-full flex items-center space-x-2 px-3 py-2 rounded-lg text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <Icon name="ArrowLeft" size={14} />
                <span>Back to Dashboard</span>
              </button>
            </div>
          </aside>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Mobile top bar */}
            <div className="lg:hidden flex items-center px-4 py-3 bg-white border-b border-gray-200 sticky top-16 z-20">
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors mr-3"
              >
                <Icon name="Menu" size={20} />
              </button>
              <span className="text-sm font-semibold text-gray-800">Corporate Dashboard</span>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

              {/* Welcome Header */}
              <div className="mb-8">
                <div className="flex items-center space-x-2 mb-1">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary">
                    <Icon name="Building2" size={12} className="mr-1" />
                    Corporate Account
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Welcome back, {firstName}!</h1>
                <p className="text-gray-500 mt-1 text-sm">{companyName} · Manage your business transportation</p>
              </div>

              {/* Hero Booking CTA Banner */}
              <div className="relative bg-gradient-to-r from-primary to-blue-700 rounded-2xl p-6 md:p-8 mb-8 overflow-hidden">
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
                  <div className="absolute bottom-0 left-1/3 w-40 h-40 bg-white rounded-full translate-y-1/2"></div>
                </div>
                <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                      Need a ride for your team?
                    </h2>
                    <p className="text-blue-100 text-sm md:text-base max-w-md">
                      Book a single trip or schedule multiple rides for your employees — fast, reliable, and billed to your company account.
                    </p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                    <Button
                      onClick={() => navigate('/smart-booking-portal')}
                      className="bg-white text-primary hover:bg-blue-50 font-semibold px-6 py-3 rounded-xl shadow-sm"
                    >
                      <Icon name="MapPin" size={16} className="mr-2" />
                      Book a Ride
                    </Button>
                    <Button
                      onClick={() => setShowBulkBooking(true)}
                      variant="outline"
                      className="border-white text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-xl"
                    >
                      <Icon name="Users" size={16} className="mr-2" />
                      Bulk Booking
                    </Button>
                    <Button
                      onClick={() => setShowCarpool(true)}
                      variant="outline"
                      className="border-white text-white hover:bg-white/10 font-semibold px-6 py-3 rounded-xl"
                    >
                      <Icon name="Car" size={16} className="mr-2" />
                      Carpool
                    </Button>
                  </div>
                </div>
              </div>

              {/* Stats Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {/* Total Bookings */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Bookings</span>
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                      <Icon name="Calendar" size={16} className="text-blue-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats?.totalBookings}</p>
                  <p className="text-xs text-gray-400 mt-1">All time</p>
                </div>

                {/* Active Bookings */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Active Rides</span>
                    <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                      <Icon name="Navigation" size={16} className="text-green-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats?.activeBookings}</p>
                  <p className="text-xs text-gray-400 mt-1">In progress</p>
                </div>

                {/* Monthly Spend */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Monthly Spend</span>
                    <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                      <Icon name="CreditCard" size={16} className="text-orange-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">₱{stats?.monthlySpend?.toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">This month</p>
                </div>

                {/* Team Members */}
                <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Team Members</span>
                    <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                      <Icon name="Users" size={16} className="text-purple-600" />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{stats?.teamMembers}</p>
                  <p className="text-xs text-gray-400 mt-1">Registered</p>
                </div>
              </div>

              {/* Quick Actions Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <button
                  onClick={() => navigate('/smart-booking-portal')}
                  className="flex items-center space-x-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-primary hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Icon name="MapPin" size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Book a Ride</p>
                    <p className="text-xs text-gray-500">Single trip</p>
                  </div>
                </button>

                <button
                  onClick={() => setShowBulkBooking(true)}
                  className="flex items-center space-x-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-primary hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Icon name="CalendarDays" size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Bulk Booking</p>
                    <p className="text-xs text-gray-500">Multiple trips</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/corporate-billing-ledger')}
                  className="flex items-center space-x-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-400 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <Icon name="FileText" size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Billing Ledger</p>
                    <p className="text-xs text-gray-500">Statements & charges</p>
                  </div>
                </button>

                <button
                  onClick={() => navigate('/corporate-reports')}
                  className="flex items-center space-x-3 bg-white border border-gray-200 rounded-xl p-4 hover:border-primary hover:shadow-md transition-all text-left group"
                >
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Icon name="FileBarChart" size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Reports</p>
                    <p className="text-xs text-gray-500">Expense analytics</p>
                  </div>
                </button>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Recent Bookings */}
                <div className="lg:col-span-2 space-y-6">
                  <RecentBookingsTable
                    onRefresh={loadDashboardData}
                  />
                  {/* Approval Queue */}
                  {userProfile?.company_id && (
                    <ApprovalQueuePanel
                      companyId={userProfile?.company_id}
                      onApprovalAction={loadDashboardData}
                    />
                  )}
                </div>

                {/* Right Sidebar */}
                <div className="space-y-6">
                  <BudgetTracker
                    companyId={userProfile?.company_id}
                    budgetData={{ limit: 100000, used: stats?.monthlySpend || 0 }}
                    monthlySpending={stats?.monthlySpend || 0}
                  />
                  <UsageChart
                    companyId={userProfile?.company_id}
                    data={[]}
                    title="Monthly Usage"
                  />
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Modals */}
        <BulkBookingModal
          isOpen={showBulkBooking}
          onClose={() => setShowBulkBooking(false)}
          onSuccess={handleBulkBookingSuccess}
        />
        <CarpoolBookingModal
          isOpen={showCarpool}
          onClose={() => setShowCarpool(false)}
          onSuccess={handleCarpoolSuccess}
        />
        <ReportModal
          isOpen={showReports}
          onClose={() => setShowReports(false)}
        />
      </div>
    </>
  );
};

export default CorporateDashboard;