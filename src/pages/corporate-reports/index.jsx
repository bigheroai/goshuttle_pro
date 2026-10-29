import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { useAuth } from '../../contexts/AuthContext';
import reportService from '../../utils/reportService';
import corporateEmailService from '../../services/corporateEmailService';

const sideNavItems = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/corporate-dashboard' },
  { label: 'Billing Ledger', icon: 'FileText', path: '/corporate-billing-ledger' },
  { label: 'Reports', icon: 'FileBarChart', path: '/corporate-reports' },
  { label: 'Book a Trip', icon: 'Plus', path: '/smart-booking-portal' },
  { label: 'My Bookings', icon: 'Calendar', path: '/live-tracking' },
  { label: 'Account Settings', icon: 'Settings', path: '/customer-account' },
  { label: 'Support', icon: 'HelpCircle', path: '/support-center' },
];

const reportTypes = [
  { id: 'stats', name: 'Booking Statistics', description: 'Overview of booking metrics and trends', icon: 'BarChart3' },
  { id: 'detailed', name: 'Detailed Report', description: 'Complete booking details for export', icon: 'Table' },
  { id: 'analytics', name: 'Usage Analytics', description: 'Monthly usage patterns and trends', icon: 'TrendingUp' },
  { id: 'departments', name: 'Department Analysis', description: 'Cost breakdown by departments', icon: 'Building' },
];

const dateRanges = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 90, label: 'Last 3 months' },
  { value: 180, label: 'Last 6 months' },
  { value: 365, label: 'Last 12 months' },
];

const CorporateReports = () => {
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('stats');
  const [dateRange, setDateRange] = useState(30);
  const [reportData, setReportData] = useState(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  useEffect(() => {
    if (userProfile?.company_id) {
      setEmailRecipient(userProfile?.email || '');
      generateReport();
    }
  }, [reportType, dateRange, userProfile?.company_id]);

  const generateReport = async () => {
    if (!userProfile?.company_id) return;
    try {
      setLoading(true);
      let data;
      switch (reportType) {
        case 'stats':
          data = await reportService?.getBookingStats(userProfile?.company_id, dateRange);
          break;
        case 'detailed':
          data = await reportService?.getDetailedReport(userProfile?.company_id, dateRange);
          break;
        case 'analytics':
          const months = Math.ceil(dateRange / 30);
          data = await reportService?.getUsageAnalytics(userProfile?.company_id, months);
          break;
        case 'departments':
          data = await reportService?.getCostByDepartment(userProfile?.company_id, dateRange);
          break;
        default:
          data = null;
      }
      setReportData(data);
    } catch (error) {
      console.error('Error generating report:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailReport = async () => {
    if (!emailRecipient) return;
    setEmailSending(true);
    setEmailStatus(null);
    try {
      const companyId = userProfile?.company_id;
      const now = new Date();
      const month = now?.getMonth() + 1;
      const year = now?.getFullYear();
      const [statsData, deptData] = await Promise.all([
        reportService?.getBookingStats(companyId, dateRange),
        reportService?.getCostByDepartment(companyId, dateRange),
      ]);
      const combinedReport = { ...statsData, departmentCosts: deptData };
      const result = await corporateEmailService?.sendMonthlyExpenseReport({
        recipientEmail: emailRecipient,
        recipientName: userProfile?.full_name || userProfile?.fullName || '',
        companyName: userProfile?.company_name || userProfile?.companyName || 'Your Company',
        reportData: combinedReport,
        month,
        year,
      });
      setEmailStatus({
        type: result?.success ? 'success' : 'error',
        message: result?.success
          ? `Report emailed to ${emailRecipient}`
          : `Failed to send: ${result?.error}`,
      });
      if (result?.success) setShowEmailInput(false);
    } catch (err) {
      setEmailStatus({ type: 'error', message: 'Failed to send report email.' });
    } finally {
      setEmailSending(false);
    }
  };

  const handleExport = (format = 'csv') => {
    if (!reportData) return;
    const timestamp = new Date()?.toISOString()?.split('T')?.[0];
    const filename = `${reportType}_report_${timestamp}`;
    if (reportType === 'detailed') {
      reportService?.downloadReport(reportData, filename, format);
    } else {
      reportService?.downloadReport(reportData, filename, 'json');
    }
  };

  const renderStatsReport = () => {
    if (!reportData) return null;
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-xl">
            <h4 className="text-sm font-medium text-blue-700">Total Bookings</h4>
            <p className="text-3xl font-bold text-blue-900 mt-1">{reportData?.totalBookings}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-xl">
            <h4 className="text-sm font-medium text-green-700">Completed</h4>
            <p className="text-3xl font-bold text-green-900 mt-1">{reportData?.completedBookings}</p>
          </div>
          <div className="bg-red-50 p-4 rounded-xl">
            <h4 className="text-sm font-medium text-red-700">Cancelled</h4>
            <p className="text-3xl font-bold text-red-900 mt-1">{reportData?.cancelledBookings}</p>
          </div>
          <div className="bg-purple-50 p-4 rounded-xl">
            <h4 className="text-sm font-medium text-purple-700">Completion Rate</h4>
            <p className="text-3xl font-bold text-purple-900 mt-1">{reportData?.completionRate}%</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-xl">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Status Breakdown</h4>
            <div className="space-y-2">
              {Object.entries(reportData?.statusBreakdown || {})?.map(([status, count]) => (
                <div key={status} className="flex justify-between">
                  <span className="capitalize text-sm text-gray-600">{status?.replace('_', ' ')}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-gray-50 p-4 rounded-xl">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Vehicle Type Usage</h4>
            <div className="space-y-2">
              {Object.entries(reportData?.vehicleTypeBreakdown || {})?.map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span className="capitalize text-sm text-gray-600">{type?.replace('_', ' ')}</span>
                  <span className="font-medium text-gray-900">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-xl">
          <h4 className="text-sm font-medium text-yellow-700 mb-2">Financial Summary</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-yellow-600">Total Cost:</span>
              <p className="text-2xl font-bold text-yellow-900 mt-1">₱{reportData?.totalCost}</p>
            </div>
            <div>
              <span className="text-sm text-yellow-600">Average per Booking:</span>
              <p className="text-2xl font-bold text-yellow-900 mt-1">₱{reportData?.averageCost}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailedReport = () => {
    if (!reportData || reportData?.length === 0) {
      return (
        <div className="text-center py-16">
          <Icon name="FileText" size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No bookings found for the selected period</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Found <span className="font-semibold">{reportData?.length}</span> bookings in the last {dateRange} days
          </p>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => handleExport('csv')}>
              <Icon name="Download" size={14} className="mr-1.5" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport('json')}>
              <Icon name="Download" size={14} className="mr-1.5" />
              Export JSON
            </Button>
          </div>
        </div>
        <div className="border rounded-xl overflow-hidden">
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {reportData?.slice(0, 100)?.map((booking, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <p className="font-medium">{booking?.employeeName}</p>
                      <p className="text-gray-400 text-xs">{booking?.employeeEmail}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <p>{booking?.vehicleName}</p>
                      <p className="text-gray-400 text-xs">{booking?.vehicleType}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <div className="max-w-36">
                        <p className="truncate">{booking?.pickupLocation}</p>
                        <p className="text-gray-400 text-xs truncate">→ {booking?.dropoffLocation}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <p>{booking?.pickupDate}</p>
                      <p className="text-gray-400 text-xs">{booking?.pickupTime}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        booking?.status === 'completed' ? 'bg-green-100 text-green-800' :
                        booking?.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                        booking?.status === 'confirmed' ? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {booking?.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">₱{booking?.totalCost}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {reportData?.length > 100 && (
          <p className="text-sm text-gray-400 text-center">
            Showing first 100 records. Export to view all {reportData?.length} records.
          </p>
        )}
      </div>
    );
  };

  const renderAnalyticsReport = () => {
    if (!reportData || reportData?.length === 0) {
      return (
        <div className="text-center py-16">
          <Icon name="BarChart3" size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No analytics data available</p>
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <h4 className="text-base font-semibold text-gray-900">Monthly Usage Trends</h4>
        <div className="space-y-3">
          {reportData?.map((month) => (
            <div key={month?.month} className="bg-gray-50 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-3">
                <h5 className="font-medium text-gray-900">
                  {new Date(month.month + '-01')?.toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}
                </h5>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total Bookings</p>
                  <p className="text-xl font-bold text-gray-900">{month?.bookingCount}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Completed:</span>
                  <span className="ml-2 font-semibold text-green-600">{month?.completedCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Success Rate:</span>
                  <span className="ml-2 font-semibold text-blue-600">
                    {month?.bookingCount > 0 ? Math.round((month?.completedCount / month?.bookingCount) * 100) : 0}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Total Cost:</span>
                  <span className="ml-2 font-semibold text-purple-600">₱{month?.totalCost?.toFixed(2)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderDepartmentReport = () => {
    if (!reportData || reportData?.length === 0) {
      return (
        <div className="text-center py-16">
          <Icon name="Building" size={48} className="text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No department data available</p>
        </div>
      );
    }
    const totalCost = reportData?.reduce((sum, dept) => sum + dept?.totalCost, 0);
    return (
      <div className="space-y-4">
        <h4 className="text-base font-semibold text-gray-900">Department Cost Analysis</h4>
        <div className="space-y-3">
          {reportData?.sort((a, b) => b?.totalCost - a?.totalCost)?.map((dept) => (
            <div key={dept?.department} className="bg-gray-50 p-4 rounded-xl">
              <div className="flex justify-between items-start mb-3">
                <h5 className="font-medium text-gray-900">{dept?.department}</h5>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">₱{dept?.totalCost?.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">
                    {totalCost > 0 ? Math.round((dept?.totalCost / totalCost) * 100) : 0}% of total
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Bookings:</span>
                  <span className="ml-2 font-semibold text-blue-600">{dept?.bookingCount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Average Cost:</span>
                  <span className="ml-2 font-semibold text-green-600">₱{dept?.averageCost}</span>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-primary h-1.5 rounded-full"
                  style={{ width: `${totalCost > 0 ? (dept?.totalCost / totalCost) * 100 : 0}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Reports - GoShuttle Corporate</title>
        <meta name="description" content="Generate and export corporate transportation reports and analytics." />
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

            <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
              <p className="px-3 pb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">Navigation</p>
              {sideNavItems?.map((item) => {
                const isActive = location?.pathname === item?.path;
                return (
                  <button
                    key={item?.path}
                    onClick={() => { navigate(item?.path); setSidebarOpen(false); }}
                    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group
                      ${isActive ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}`}
                  >
                    <Icon
                      name={item?.icon}
                      size={16}
                      className={isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}
                    />
                    <span>{item?.label}</span>
                    {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600" />}
                  </button>
                );
              })}
            </nav>

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
              <span className="text-sm font-semibold text-gray-800">Reports</span>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {/* Page Header */}
              <div className="flex items-center justify-between mb-8">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-700">
                      <Icon name="FileBarChart" size={12} className="mr-1" />
                      Reports
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">Generate Reports</h1>
                  <p className="text-gray-500 mt-1 text-sm">Analyze your company's transportation usage and costs</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => { setShowEmailInput(!showEmailInput); setEmailStatus(null); }}
                >
                  <Icon name="Mail" size={16} className="mr-2" />
                  Email Report
                </Button>
              </div>

              {/* Email Report Panel */}
              {showEmailInput && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-sm font-medium text-blue-800 mb-3 flex items-center space-x-1">
                    <Icon name="Mail" size={14} />
                    <span>Send Monthly Expense Report via Email</span>
                  </p>
                  <div className="flex items-center space-x-3">
                    <Input
                      type="email"
                      placeholder="Recipient email address"
                      value={emailRecipient}
                      onChange={(e) => setEmailRecipient(e?.target?.value)}
                      className="flex-1"
                    />
                    <Button
                      onClick={handleEmailReport}
                      disabled={emailSending || !emailRecipient}
                    >
                      {emailSending ? (
                        <><Icon name="Loader2" size={14} className="animate-spin mr-1" />Sending...</>
                      ) : 'Send'}
                    </Button>
                  </div>
                  {emailStatus && (
                    <div className={`mt-3 flex items-center space-x-2 text-sm ${
                      emailStatus?.type === 'success' ? 'text-green-700' : 'text-red-700'
                    }`}>
                      <Icon name={emailStatus?.type === 'success' ? 'CheckCircle' : 'AlertCircle'} size={14} />
                      <span>{emailStatus?.message}</span>
                    </div>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Left: Controls */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Report Type */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Report Type</h4>
                    <div className="space-y-2">
                      {reportTypes?.map((type) => (
                        <button
                          key={type?.id}
                          onClick={() => setReportType(type?.id)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            reportType === type?.id
                              ? 'border-primary bg-primary/10 text-primary' :'border-gray-200 hover:border-gray-300 text-gray-700'
                          }`}
                        >
                          <div className="flex items-center space-x-2 mb-0.5">
                            <Icon name={type?.icon} size={14} />
                            <span className="font-medium text-sm">{type?.name}</span>
                          </div>
                          <div className="text-xs text-gray-500 pl-5">{type?.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Date Range */}
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Date Range</h4>
                    <select
                      value={dateRange}
                      onChange={(e) => setDateRange(Number(e?.target?.value))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      {dateRanges?.map((range) => (
                        <option key={range?.value} value={range?.value}>
                          {range?.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Right: Report Content */}
                <div className="lg:col-span-3">
                  <div className="bg-white rounded-xl border border-gray-200 p-6 min-h-[400px]">
                    {loading ? (
                      <div className="flex flex-col items-center justify-center py-20">
                        <Icon name="Loader2" className="animate-spin text-primary mb-3" size={32} />
                        <span className="text-gray-500 text-sm">Generating report...</span>
                      </div>
                    ) : (
                      <>
                        {reportType === 'stats' && renderStatsReport()}
                        {reportType === 'detailed' && renderDetailedReport()}
                        {reportType === 'analytics' && renderAnalyticsReport()}
                        {reportType === 'departments' && renderDepartmentReport()}
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default CorporateReports;
