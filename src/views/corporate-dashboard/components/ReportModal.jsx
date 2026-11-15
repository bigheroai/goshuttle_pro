import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import { useAuth } from '../../../contexts/AuthContext';
import reportService from '../../../utils/reportService';
import corporateEmailService from '../../../services/corporateEmailService';

const ReportModal = ({ isOpen, onClose }) => {
  const { userProfile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState('stats');
  const [dateRange, setDateRange] = useState(30);
  const [reportData, setReportData] = useState(null);
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus, setEmailStatus] = useState(null); // { type, message }
  const [emailRecipient, setEmailRecipient] = useState('');
  const [showEmailInput, setShowEmailInput] = useState(false);

  const reportTypes = [
    { id: 'stats', name: 'Booking Statistics', description: 'Overview of booking metrics and trends' },
    { id: 'detailed', name: 'Detailed Report', description: 'Complete booking details for export' },
    { id: 'analytics', name: 'Usage Analytics', description: 'Monthly usage patterns and trends' },
    { id: 'departments', name: 'Department Analysis', description: 'Cost breakdown by departments' }
  ];

  const dateRanges = [
    { value: 7, label: 'Last 7 days' },
    { value: 30, label: 'Last 30 days' },
    { value: 90, label: 'Last 3 months' },
    { value: 180, label: 'Last 6 months' },
    { value: 365, label: 'Last 12 months' }
  ];

  useEffect(() => {
    if (isOpen && userProfile?.company_id) {
      generateReport();
      // Pre-fill recipient with current user's email
      setEmailRecipient(userProfile?.email || '');
    }
  }, [isOpen, reportType, dateRange, userProfile]);

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
      alert('Failed to generate report');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailReport = async () => {
    if (!emailRecipient) return;
    setEmailSending(true);
    setEmailStatus(null);
    try {
      // Build combined report data for the email
      const companyId = userProfile?.company_id;
      const now = new Date();
      const month = now?.getMonth() + 1;
      const year = now?.getFullYear();

      // Fetch stats + department costs for the email
      const [statsData, deptData] = await Promise.all([
        reportService?.getBookingStats(companyId, dateRange),
        reportService?.getCostByDepartment(companyId, dateRange)
      ]);

      const combinedReport = {
        ...statsData,
        departmentCosts: deptData
      };

      const result = await corporateEmailService?.sendMonthlyExpenseReport({
        recipientEmail: emailRecipient,
        recipientName: userProfile?.full_name || userProfile?.fullName || '',
        companyName: userProfile?.company_name || userProfile?.companyName || 'Your Company',
        reportData: combinedReport,
        month,
        year
      });

      setEmailStatus({
        type: result?.success ? 'success' : 'error',
        message: result?.success
          ? `Report emailed to ${emailRecipient}`
          : `Failed to send: ${result?.error}`
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
          <div className="bg-blue-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-blue-700">Total Bookings</h4>
            <p className="text-2xl font-bold text-blue-900">{reportData?.totalBookings}</p>
          </div>
          
          <div className="bg-green-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-green-700">Completed</h4>
            <p className="text-2xl font-bold text-green-900">{reportData?.completedBookings}</p>
          </div>
          
          <div className="bg-red-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-red-700">Cancelled</h4>
            <p className="text-2xl font-bold text-red-900">{reportData?.cancelledBookings}</p>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-purple-700">Completion Rate</h4>
            <p className="text-2xl font-bold text-purple-900">{reportData?.completionRate}%</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50 p-4 rounded-lg">
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

          <div className="bg-gray-50 p-4 rounded-lg">
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
        <div className="bg-yellow-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-700 mb-2">Financial Summary</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-yellow-600">Total Cost:</span>
              <p className="text-lg font-bold text-yellow-900">₱{reportData?.totalCost}</p>
            </div>
            <div>
              <span className="text-sm text-yellow-600">Average per Booking:</span>
              <p className="text-lg font-bold text-yellow-900">₱{reportData?.averageCost}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDetailedReport = () => {
    if (!reportData || reportData?.length === 0) {
      return (
        <div className="text-center py-8">
          <Icon name="FileText" size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No bookings found for the selected period</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Found {reportData?.length} bookings in the last {dateRange} days
          </p>
          <div className="flex space-x-2">
            <Button size="sm" variant="outline" onClick={() => handleExport('csv')}>
              <Icon name="Download" size={16} className="mr-2" />
              Export CSV
            </Button>
            <Button size="sm" variant="outline" onClick={() => handleExport('json')}>
              <Icon name="Download" size={16} className="mr-2" />
              Export JSON
            </Button>
          </div>
        </div>
        <div className="max-h-96 overflow-y-auto border rounded-lg">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Vehicle</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Route</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {reportData?.slice(0, 100)?.map((booking, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900">
                    <div>
                      <p className="font-medium">{booking?.employeeName}</p>
                      <p className="text-gray-500 text-xs">{booking?.employeeEmail}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    <div>
                      <p>{booking?.vehicleName}</p>
                      <p className="text-gray-500 text-xs">{booking?.vehicleType}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    <div className="max-w-32">
                      <p className="truncate">{booking?.pickupLocation}</p>
                      <p className="text-gray-500 text-xs truncate">→ {booking?.dropoffLocation}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    <div>
                      <p>{booking?.pickupDate}</p>
                      <p className="text-gray-500 text-xs">{booking?.pickupTime}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      booking?.status === 'completed' ? 'bg-green-100 text-green-800' :
                      booking?.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                      booking?.status === 'confirmed'? 'bg-blue-100 text-blue-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {booking?.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900">
                    ₱{booking?.totalCost}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {reportData?.length > 100 && (
          <p className="text-sm text-gray-500 text-center">
            Showing first 100 records. Export to view all {reportData?.length} records.
          </p>
        )}
      </div>
    );
  };

  const renderAnalyticsReport = () => {
    if (!reportData || reportData?.length === 0) {
      return (
        <div className="text-center py-8">
          <Icon name="BarChart3" size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No analytics data available</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <h4 className="text-lg font-medium text-gray-900">Monthly Usage Trends</h4>
        <div className="space-y-4">
          {reportData?.map((month) => (
            <div key={month?.month} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start mb-2">
                <h5 className="font-medium text-gray-900">
                  {new Date(month.month + '-01')?.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long' 
                  })}
                </h5>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Total Bookings</p>
                  <p className="text-lg font-bold text-gray-900">{month?.bookingCount}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Completed:</span>
                  <span className="ml-2 font-medium text-green-600">{month?.completedCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Success Rate:</span>
                  <span className="ml-2 font-medium text-blue-600">
                    {month?.bookingCount > 0 ? Math.round((month?.completedCount / month?.bookingCount) * 100) : 0}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-600">Total Cost:</span>
                  <span className="ml-2 font-medium text-purple-600">₱{month?.totalCost?.toFixed(2)}</span>
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
        <div className="text-center py-8">
          <Icon name="Building" size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No department data available</p>
        </div>
      );
    }

    const totalCost = reportData?.reduce((sum, dept) => sum + dept?.totalCost, 0);

    return (
      <div className="space-y-6">
        <h4 className="text-lg font-medium text-gray-900">Department Cost Analysis</h4>
        <div className="space-y-4">
          {reportData?.sort((a, b) => b?.totalCost - a?.totalCost)?.map((dept) => (
            <div key={dept?.department} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-start mb-3">
                <h5 className="font-medium text-gray-900">{dept?.department}</h5>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">₱{dept?.totalCost?.toFixed(2)}</p>
                  <p className="text-sm text-gray-600">
                    {totalCost > 0 ? Math.round((dept?.totalCost / totalCost) * 100) : 0}% of total
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Bookings:</span>
                  <span className="ml-2 font-medium text-blue-600">{dept?.bookingCount}</span>
                </div>
                <div>
                  <span className="text-gray-600">Average Cost:</span>
                  <span className="ml-2 font-medium text-green-600">₱{dept?.averageCost}</span>
                </div>
              </div>
              
              {/* Visual bar */}
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full" 
                    style={{ width: `${totalCost > 0 ? (dept?.totalCost / totalCost) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Generate Reports</h3>
            <div className="flex items-center space-x-2">
              {/* Email Report Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setShowEmailInput(!showEmailInput); setEmailStatus(null); }}
                iconName="Mail"
                iconPosition="left"
              >
                Email Report
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onClose}
                iconName="X"
              />
            </div>
          </div>

          {/* Email Report Panel */}
          {showEmailInput && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
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
                  variant="default"
                  size="sm"
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
            {/* Report Type Selection */}
            <div className="lg:col-span-1">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Report Type</h4>
              <div className="space-y-2">
                {reportTypes?.map(type => (
                  <button
                    key={type?.id}
                    onClick={() => setReportType(type?.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      reportType === type?.id
                        ? 'border-primary bg-primary/10 text-primary' :'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-sm">{type?.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{type?.description}</div>
                  </button>
                ))}
              </div>

              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Date Range</label>
                <select
                  value={dateRange}
                  onChange={(e) => setDateRange(Number(e?.target?.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  {dateRanges?.map(range => (
                    <option key={range?.value} value={range?.value}>
                      {range?.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Report Content */}
            <div className="lg:col-span-3">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Icon name="Loader2" className="animate-spin mr-3" size={24} />
                  <span className="text-gray-600">Generating report...</span>
                </div>
              ) : (
                <div>
                  {reportType === 'stats' && renderStatsReport()}
                  {reportType === 'detailed' && renderDetailedReport()}
                  {reportType === 'analytics' && renderAnalyticsReport()}
                  {reportType === 'departments' && renderDepartmentReport()}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportModal;