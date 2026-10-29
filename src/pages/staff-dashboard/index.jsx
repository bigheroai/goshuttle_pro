import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Users, UserCheck, Calendar, Car, Handshake, CreditCard, Settings, BarChart2, Shield, Menu, X, ChevronRight, Lock, AlertCircle, TrendingUp, Clock, CheckCircle } from 'lucide-react';

// Import admin dashboard components (reused based on privilege)
import UserManagement from '../admin-dashboard/components/UserManagement';
import BookingManagement from '../admin-dashboard/components/BookingManagement';
import FleetManagement from '../admin-dashboard/components/FleetManagement';
import DriverManagementKYC from '../admin-dashboard/components/DriverManagementKYC';
import PartnerManagement from '../admin-dashboard/components/PartnerManagement';
import PaymentsManagement from '../admin-dashboard/components/PaymentsManagement';
import RevenueCharts from '../admin-dashboard/components/RevenueCharts';
import AppSettings from '../admin-dashboard/components/AppSettings';
import RoleManagement from '../admin-dashboard/components/RoleManagement';
import AdminAuditPanel from '../admin-dashboard/components/AdminAuditPanel';
import bookingService from '../../services/bookingService';
import vehicleService from '../../utils/vehicleService';

// Module definitions — maps privilege keys to sidebar items and components
const MODULE_DEFINITIONS = [
  {
    key: 'users',
    label: 'Users',
    icon: Users,
    description: 'Manage user accounts',
    component: (props) => <UserManagement {...props} />,
    requiredAction: 'view',
  },
  {
    key: 'drivers',
    label: 'Drivers & KYC',
    icon: UserCheck,
    description: 'Driver applications and KYC',
    component: () => <DriverManagementKYC />,
    requiredAction: 'view',
  },
  {
    key: 'bookings',
    label: 'Bookings',
    icon: Calendar,
    description: 'Booking operations',
    component: (props) => <BookingManagement {...props} />,
    requiredAction: 'view',
  },
  {
    key: 'fleet',
    label: 'Fleet',
    icon: Car,
    description: 'Vehicle management',
    component: (props) => <FleetManagement {...props} />,
    requiredAction: 'view',
  },
  {
    key: 'partners',
    label: 'Partners',
    icon: Handshake,
    description: 'Fleet partner management',
    component: () => <PartnerManagement />,
    requiredAction: 'view',
  },
  {
    key: 'payments',
    label: 'Payments',
    icon: CreditCard,
    description: 'Transactions and disputes',
    component: () => <PaymentsManagement />,
    requiredAction: 'view',
  },
  {
    key: 'reports',
    label: 'Reports',
    icon: BarChart2,
    description: 'Revenue charts and analytics',
    component: () => <RevenueCharts />,
    requiredAction: 'view',
  },
  {
    key: 'settings',
    label: 'Settings',
    icon: Settings,
    description: 'App settings and configuration',
    component: () => <AppSettings />,
    requiredAction: 'view',
  },
  {
    key: 'roles',
    label: 'Roles & Privileges',
    icon: Shield,
    description: 'Staff roles and privileges',
    component: () => <RoleManagement />,
    requiredAction: 'view',
  },
  {
    key: 'audit',
    label: 'Audit Panel',
    icon: Shield,
    description: 'Track all admin and staff actions',
    component: () => <AdminAuditPanel />,
    requiredAction: 'view',
  },
];

const StaffDashboard = () => {
  const { user, userProfile, isAdmin, loading } = useAuth();
  const [staffRole, setStaffRole] = useState(null);
  const [privileges, setPrivileges] = useState(null);
  const [roleLoading, setRoleLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({ totalBookings: 0, activeBookings: 0, totalUsers: 0, totalVehicles: 0 });
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Redirect admins to admin dashboard
  useEffect(() => {
    if (!loading && userProfile) {
      if (isAdmin) {
        window.location.href = '/admin-dashboard';
        return;
      }
      // Only allow staff role
      if (userProfile?.role !== 'staff') {
        window.location.href = '/customer-account';
      }
    }
  }, [userProfile, isAdmin, loading]);

  // Load staff role and privileges
  useEffect(() => {
    if (!loading && userProfile?.role === 'staff' && userProfile?.id) {
      loadStaffPrivileges();
    }
  }, [loading, userProfile]);

  const loadStaffPrivileges = async () => {
    try {
      setRoleLoading(true);
      // Fetch staff_role_id from user_profiles
      const { data: profileData } = await supabase
        ?.from('user_profiles')
        ?.select('staff_role_id')
        ?.eq('id', userProfile?.id)
        ?.single();

      if (profileData?.staff_role_id) {
        const { data: roleData } = await supabase
          ?.from('staff_roles')
          ?.select('*')
          ?.eq('id', profileData?.staff_role_id)
          ?.single();

        if (roleData) {
          setStaffRole(roleData);
          const parsed = parsePrivileges(roleData?.privileges);
          setPrivileges(parsed);
          // Set first accessible module as active
          const firstModule = MODULE_DEFINITIONS?.find(m => hasAccess(parsed, m?.key, m?.requiredAction));
          if (firstModule) setActiveTab(firstModule?.key);
        }
      } else {
        // No role assigned — no privileges
        setPrivileges({});
      }
    } catch (err) {
      console.error('Error loading staff privileges:', err);
      setPrivileges({});
    } finally {
      setRoleLoading(false);
    }
  };

  const parsePrivileges = (raw) => {
    if (!raw) return {};
    if (typeof raw === 'string') {
      try { return JSON.parse(raw); } catch { return {}; }
    }
    return raw;
  };

  const hasAccess = (privs, moduleKey, action = 'view') => {
    if (!privs) return false;
    const modulePriv = privs?.[moduleKey];
    if (!modulePriv) return false;
    if (typeof modulePriv === 'boolean') return modulePriv;
    if (typeof modulePriv === 'object') return !!modulePriv?.[action];
    return false;
  };

  const canDo = (moduleKey, action) => hasAccess(privileges, moduleKey, action);

  // Accessible modules based on privileges
  const accessibleModules = MODULE_DEFINITIONS?.filter(m =>
    hasAccess(privileges, m?.key, m?.requiredAction)
  );

  // Load data for overview stats
  useEffect(() => {
    if (privileges && Object.keys(privileges)?.length > 0) {
      loadDashboardData();
    }
  }, [privileges]);

  const loadDashboardData = async () => {
    try {
      setDataLoading(true);
      const promises = [];

      if (hasAccess(privileges, 'bookings', 'view')) {
        promises?.push(bookingService?.getAllBookings()?.catch(() => []));
      } else {
        promises?.push(Promise.resolve(null));
      }

      if (hasAccess(privileges, 'users', 'view')) {
        promises?.push(
          supabase?.from('user_profiles')?.select('id, full_name, role, is_active')?.then(r => r?.data || [])?.catch(() => [])
        );
      } else {
        promises?.push(Promise.resolve(null));
      }

      if (hasAccess(privileges, 'fleet', 'view')) {
        promises?.push(vehicleService?.getAll()?.catch(() => []));
      } else {
        promises?.push(Promise.resolve(null));
      }

      const [bookingsData, usersData, vehiclesData] = await Promise.all(promises);

      if (bookingsData) {
        setBookings(bookingsData);
        setStats(prev => ({
          ...prev,
          totalBookings: bookingsData?.length || 0,
          activeBookings: bookingsData?.filter(b => b?.status === 'confirmed' || b?.status === 'in_progress')?.length || 0,
        }));
      }
      if (usersData) {
        setUsers(usersData);
        setStats(prev => ({ ...prev, totalUsers: usersData?.length || 0 }));
      }
      if (vehiclesData) {
        setVehicles(vehiclesData);
        setStats(prev => ({ ...prev, totalVehicles: vehiclesData?.length || 0 }));
      }
    } catch (err) {
      console.error('Error loading staff dashboard data:', err);
    } finally {
      setDataLoading(false);
    }
  };

  // Loading state
  if (loading || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Icon name="Loader2" className="animate-spin mx-auto mb-4 text-primary" size={32} />
          <p className="text-gray-600 font-medium">Loading your workspace...</p>
        </div>
      </div>
    );
  }

  // Not staff
  if (!loading && userProfile && userProfile?.role !== 'staff' && !isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={28} className="text-red-500" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-6">This dashboard is only accessible to staff members.</p>
          <Button onClick={() => window.location.href = '/customer-account'}>Go to My Account</Button>
        </div>
      </div>
    );
  }

  // No privileges assigned
  if (privileges !== null && accessibleModules?.length === 0) {
    return (
      <>
        <Helmet>
          <title>Staff Dashboard - GoShuttle</title>
        </Helmet>
        <div className="min-h-screen bg-gray-50">
          <Header />
          <div className="pt-16 flex items-center justify-center min-h-screen">
            <div className="text-center max-w-md mx-auto px-4">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={28} className="text-amber-500" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">No Modules Assigned</h2>
              <p className="text-gray-600 mb-2">
                {staffRole
                  ? `Your role "${staffRole?.name}" has no view permissions enabled yet.`
                  : 'You have not been assigned a staff role yet.'}
              </p>
              <p className="text-sm text-gray-500">Please contact your administrator to assign the appropriate role and privileges.</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const activeModule = MODULE_DEFINITIONS?.find(m => m?.key === activeTab);

  const renderContent = () => {
    if (!activeTab || !activeModule) {
      return <StaffOverview stats={stats} privileges={privileges} accessibleModules={accessibleModules} staffRole={staffRole} onNavigate={setActiveTab} />;
    }

    if (!hasAccess(privileges, activeTab, 'view')) {
      return (
        <div className="flex items-center justify-center py-24">
          <div className="text-center">
            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock size={24} className="text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-1">Access Restricted</h3>
            <p className="text-gray-500 text-sm">You don't have permission to view this module.</p>
          </div>
        </div>
      );
    }

    // Pass privilege-aware props to components
    const moduleProps = {
      users: { users, onUpdate: loadDashboardData, readOnly: !canDo('users', 'edit') },
      bookings: { bookings, onUpdate: loadDashboardData, readOnly: !canDo('bookings', 'edit') },
      fleet: { vehicles, onUpdate: loadDashboardData, readOnly: !canDo('fleet', 'edit') },
    };

    return activeModule?.component(moduleProps?.[activeTab] || {});
  };

  return (
    <>
      <Helmet>
        <title>Staff Dashboard - GoShuttle</title>
        <meta name="description" content="GoShuttle staff dashboard for managing assigned operations." />
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="pt-16 flex min-h-screen">
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
          )}

          {/* Sidebar */}
          <aside className={`fixed top-16 left-0 z-30 h-[calc(100vh-4rem)] w-64 bg-white border-r border-gray-200 flex flex-col transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 lg:static lg:h-auto lg:flex`}>

            {/* Sidebar header */}
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-primary/5 to-primary/10">
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">Staff Portal</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{userProfile?.full_name}</p>
                  {staffRole && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      <Shield size={10} />
                      {staffRole?.name}
                    </span>
                  )}
                </div>
                <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-md text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              {/* Overview link */}
              <button
                onClick={() => { setActiveTab(null); setSidebarOpen(false); }}
                className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-1 ${
                  activeTab === null ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <TrendingUp size={18} className="flex-shrink-0" />
                <span>Overview</span>
              </button>

              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-2 mt-3">My Modules</p>

              {accessibleModules?.length === 0 ? (
                <p className="text-xs text-gray-400 px-3 py-2">No modules assigned</p>
              ) : (
                <ul className="space-y-1">
                  {accessibleModules?.map((module) => {
                    const ModuleIcon = module?.icon;
                    const isActive = activeTab === module?.key;
                    return (
                      <li key={module?.key}>
                        <button
                          onClick={() => { setActiveTab(module?.key); setSidebarOpen(false); }}
                          className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                            isActive ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                          }`}
                        >
                          <ModuleIcon size={18} className="flex-shrink-0" />
                          <span className="flex-1 text-left">{module?.label}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </nav>

            {/* Privilege summary footer */}
            <div className="p-3 border-t border-gray-200">
              <div className="px-3 py-2 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500 mb-1">Accessible Modules</p>
                <p className="text-sm font-semibold text-gray-800">{accessibleModules?.length} of {MODULE_DEFINITIONS?.length}</p>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 min-w-0 lg:ml-0">
            {/* Page header */}
            <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
              <div className="flex items-center gap-3">
                <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100">
                  <Menu size={20} />
                </button>
                <div>
                  <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                    {activeTab ? activeModule?.label : 'Staff Overview'}
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    {activeTab ? activeModule?.description : `Welcome back, ${userProfile?.full_name?.split(' ')?.[0] || 'Staff'}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 sm:p-6 lg:p-8">
              {renderContent()}
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

// Overview component shown on initial load
const StaffOverview = ({ stats, privileges, accessibleModules, staffRole, onNavigate }) => {
  const statCards = [
    { label: 'Total Bookings', value: stats?.totalBookings, icon: Calendar, color: 'purple', show: !!privileges?.bookings?.view || !!privileges?.bookings },
    { label: 'Active Bookings', value: stats?.activeBookings, icon: Clock, color: 'orange', show: !!privileges?.bookings?.view || !!privileges?.bookings },
    { label: 'Total Users', value: stats?.totalUsers, icon: Users, color: 'green', show: !!privileges?.users?.view || !!privileges?.users },
    { label: 'Fleet Vehicles', value: stats?.totalVehicles, icon: Car, color: 'blue', show: !!privileges?.fleet?.view || !!privileges?.fleet },
  ]?.filter(s => s?.show);

  const colorMap = {
    purple: 'bg-purple-100 text-purple-600',
    orange: 'bg-orange-100 text-orange-600',
    green: 'bg-green-100 text-green-600',
    blue: 'bg-blue-100 text-blue-600',
  };

  return (
    <div className="space-y-6">
      {/* Role badge */}
      {staffRole && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield size={22} className="text-primary" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Your assigned role</p>
            <p className="text-lg font-bold text-gray-900">{staffRole?.name}</p>
            {staffRole?.description && <p className="text-xs text-gray-500 mt-0.5">{staffRole?.description}</p>}
          </div>
          <div className="ml-auto text-right">
            <p className="text-xs text-gray-400">Modules accessible</p>
            <p className="text-2xl font-bold text-primary">{accessibleModules?.length}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      {statCards?.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statCards?.map((card) => {
            const CardIcon = card?.icon;
            return (
              <div key={card?.label} className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${colorMap?.[card?.color]}`}>
                    <CardIcon size={18} />
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">{card?.value}</p>
                    <p className="text-xs text-gray-500">{card?.label}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Accessible modules grid */}
      <div>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Your Accessible Modules</h2>
        {accessibleModules?.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <AlertCircle size={32} className="text-amber-400 mx-auto mb-3" />
            <p className="text-gray-600">No modules have been assigned to your role yet.</p>
            <p className="text-sm text-gray-400 mt-1">Contact your administrator to assign privileges.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {accessibleModules?.map((module) => {
              const ModuleIcon = module?.icon;
              // Count enabled actions for this module
              const modulePriv = privileges?.[module?.key];
              const enabledActions = typeof modulePriv === 'object' && modulePriv !== null
                ? Object.entries(modulePriv)?.filter(([, v]) => v)?.map(([k]) => k)
                : [];

              return (
                <button
                  key={module?.key}
                  onClick={() => onNavigate(module?.key)}
                  className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:border-primary/40 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                      <ModuleIcon size={20} className="text-primary" />
                    </div>
                    <ChevronRight size={16} className="text-gray-300 group-hover:text-primary transition-colors mt-1" />
                  </div>
                  <p className="font-semibold text-gray-900 text-sm mb-1">{module?.label}</p>
                  <p className="text-xs text-gray-500 mb-3">{module?.description}</p>
                  {enabledActions?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {enabledActions?.slice(0, 4)?.map(action => (
                        <span key={action} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-700 border border-green-100">
                          <CheckCircle size={9} />
                          {action}
                        </span>
                      ))}
                      {enabledActions?.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">
                          +{enabledActions?.length - 4} more
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Restricted modules */}
      {MODULE_DEFINITIONS?.filter(m => !accessibleModules?.find(a => a?.key === m?.key))?.length > 0 && (
        <div>
          <h2 className="text-base font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Lock size={16} className="text-gray-400" />
            Restricted Modules
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {MODULE_DEFINITIONS?.filter(m => !accessibleModules?.find(a => a?.key === m?.key))?.map((module) => {
              const ModuleIcon = module?.icon;
              return (
                <div key={module?.key} className="bg-gray-50 rounded-xl border border-gray-200 p-4 opacity-60 cursor-not-allowed">
                  <div className="flex items-center gap-2 mb-1">
                    <ModuleIcon size={16} className="text-gray-400" />
                    <p className="text-sm font-medium text-gray-500">{module?.label}</p>
                  </div>
                  <div className="flex items-center gap-1 mt-2">
                    <Lock size={10} className="text-gray-400" />
                    <p className="text-xs text-gray-400">No access</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
