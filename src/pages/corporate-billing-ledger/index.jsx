import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import corporateBillingService from '../../services/corporateBillingService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const statusColors = {
  draft: 'bg-gray-100 text-gray-700',
  issued: 'bg-blue-100 text-blue-700',
  paid: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  partially_paid: 'bg-amber-100 text-amber-700',
};

const entryTypeColors = {
  trip_charge: 'text-red-600',
  payment: 'text-green-600',
  adjustment: 'text-blue-600',
  credit: 'text-purple-600',
};

const sideNavItems = [
  { label: 'Dashboard', icon: 'LayoutDashboard', path: '/corporate-dashboard' },
  { label: 'Billing Ledger', icon: 'FileText', path: '/corporate-billing-ledger' },
  { label: 'Reports', icon: 'FileBarChart', path: '/corporate-reports' },
  { label: 'Book a Trip', icon: 'Plus', path: '/smart-booking-portal' },
  { label: 'My Bookings', icon: 'Calendar', path: '/live-tracking' },
  { label: 'Account Settings', icon: 'Settings', path: '/customer-account' },
  { label: 'Support', icon: 'HelpCircle', path: '/support-center' },
];

const CorporateBillingLedger = () => {
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('ledger');
  const [billingAccount, setBillingAccount] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [statements, setStatements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [selectedStatement, setSelectedStatement] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const companyId = userProfile?.company_id;

  const loadData = useCallback(async () => {
    if (!companyId && !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const account = isAdmin
        ? null
        : await corporateBillingService?.getBillingAccount(companyId);
      setBillingAccount(account);

      if (account?.id) {
        const [entries, stmts] = await Promise.all([
          corporateBillingService?.getLedgerEntries(account?.id),
          corporateBillingService?.getStatements(companyId),
        ]);
        setLedgerEntries(entries);
        setStatements(stmts);
      } else if (companyId) {
        const stmts = await corporateBillingService?.getStatements(companyId);
        setStatements(stmts);
        const entries = await corporateBillingService?.getLedgerByCompany(companyId);
        setLedgerEntries(entries);
      }
    } catch (err) {
      setError(err?.message || 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  }, [companyId, isAdmin]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setPeriodStart(firstDay?.toISOString()?.split('T')?.[0]);
    setPeriodEnd(lastDay?.toISOString()?.split('T')?.[0]);
  }, []);

  const handleGenerateStatement = async () => {
    if (!billingAccount?.id || !companyId) return;
    setGenerating(true);
    try {
      await corporateBillingService?.generateStatement(
        billingAccount?.id, companyId, periodStart, periodEnd, userProfile?.id
      );
      setShowGenerateModal(false);
      await loadData();
    } catch (err) {
      setError(err?.message || 'Failed to generate statement');
    } finally {
      setGenerating(false);
    }
  };

  const handleMarkPaid = async (statementId) => {
    try {
      await corporateBillingService?.updateStatementStatus(statementId, 'paid');
      await loadData();
    } catch (err) {
      setError(err?.message);
    }
  };

  const downloadStatementPDF = (statement) => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = doc?.internal?.pageSize?.getWidth();
    const margin = 20;

    doc?.setFillColor(37, 99, 235);
    doc?.rect(0, 0, pageWidth, 36, 'F');
    doc?.setTextColor(255, 255, 255);
    doc?.setFontSize(18);
    doc?.setFont('helvetica', 'bold');
    doc?.text('GoShuttle Pro', margin, 15);
    doc?.setFontSize(9);
    doc?.setFont('helvetica', 'normal');
    doc?.setTextColor(191, 219, 254);
    doc?.text('Corporate Billing Statement', margin, 22);
    doc?.setTextColor(255, 255, 255);
    doc?.setFontSize(16);
    doc?.setFont('helvetica', 'bold');
    doc?.text('STATEMENT', pageWidth - margin, 15, { align: 'right' });
    doc?.setFontSize(9);
    doc?.setFont('helvetica', 'normal');
    doc?.setTextColor(191, 219, 254);
    doc?.text(`#${statement?.statement_number}`, pageWidth - margin, 22, { align: 'right' });

    let y = 46;
    doc?.setTextColor(55, 65, 81);
    doc?.setFontSize(9);
    doc?.text(`Period: ${statement?.period_start} to ${statement?.period_end}`, margin, y);
    doc?.text(`Status: ${(statement?.statement_status || '')?.toUpperCase()}`, pageWidth - margin, y, { align: 'right' });
    y += 8;
    doc?.text(`Total Trips: ${statement?.total_trips || 0}`, margin, y);
    doc?.text(`Due Date: ${statement?.due_date || 'N/A'}`, pageWidth - margin, y, { align: 'right' });
    y += 12;

    const summaryRows = [
      ['Total Amount', `₱${parseFloat(statement?.total_amount || 0)?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`],
      ['Amount Paid', `₱${parseFloat(statement?.amount_paid || 0)?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`],
      ['Balance Due', `₱${parseFloat(statement?.balance_due || 0)?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`],
    ];

    autoTable(doc, {
      startY: y,
      head: [],
      body: summaryRows,
      theme: 'plain',
      styles: { fontSize: 10, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [107, 114, 128], cellWidth: 60 },
        1: { textColor: [17, 24, 39], halign: 'right', fontStyle: 'bold' },
      },
      alternateRowStyles: { fillColor: [249, 250, 251] },
      margin: { left: margin, right: margin },
    });

    doc?.save(`statement-${statement?.statement_number}.pdf`);
  };

  const formatCurrency = (v) => `₱${parseFloat(v || 0)?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d)?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

  return (
    <>
      <Helmet>
        <title>Corporate Billing Ledger – GoShuttle Pro</title>
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
                        ? 'bg-blue-50 text-blue-700' :'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
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
              <span className="text-sm font-semibold text-gray-800">Billing Ledger</span>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

              {/* Page Header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                      <Icon name="FileText" size={12} className="mr-1" /> Corporate Billing
                    </span>
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">Billing Ledger & Statements</h1>
                  <p className="text-sm text-gray-500 mt-1">Track trip charges, running balance, and generate statements</p>
                </div>
                {billingAccount && (
                  <Button onClick={() => setShowGenerateModal(true)} className="flex items-center space-x-2">
                    <Icon name="FilePlus" size={16} />
                    <span>Generate Statement</span>
                  </Button>
                )}
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 flex items-center space-x-2">
                  <Icon name="AlertCircle" size={16} className="text-red-500" />
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Account Summary Card */}
              {billingAccount && (
                <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl p-6 mb-6 text-white">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                      <p className="text-blue-200 text-sm font-medium mb-1">Corporate Billing Account</p>
                      <h2 className="text-xl font-bold">{billingAccount?.account_name}</h2>
                      <p className="text-blue-200 text-xs mt-1 capitalize">Billing cycle: {billingAccount?.billing_cycle?.replace('_', '-')}</p>
                    </div>
                    <div className="flex space-x-6">
                      <div className="text-center">
                        <p className="text-blue-200 text-xs font-medium">Current Balance</p>
                        <p className="text-2xl font-bold">{formatCurrency(billingAccount?.current_balance)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-blue-200 text-xs font-medium">Credit Limit</p>
                        <p className="text-2xl font-bold">{formatCurrency(billingAccount?.credit_limit)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!billingAccount && !loading && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-6 flex items-start space-x-3">
                  <Icon name="AlertCircle" size={18} className="text-amber-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">No billing account set up</p>
                    <p className="text-xs text-amber-700 mt-0.5">Contact your GoShuttle account manager to activate corporate billing for your company.</p>
                  </div>
                </div>
              )}

              {/* Tabs */}
              <div className="flex space-x-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
                {[
                  { id: 'ledger', label: 'Ledger', icon: 'List' },
                  { id: 'statements', label: 'Statements', icon: 'FileText' },
                ]?.map(tab => (
                  <button
                    key={tab?.id}
                    onClick={() => setActiveTab(tab?.id)}
                    className={`flex items-center space-x-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab?.id
                        ? 'bg-white text-primary shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    <Icon name={tab?.icon} size={14} />
                    <span>{tab?.label}</span>
                  </button>
                ))}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4]?.map(i => (
                    <div key={i} className="h-14 bg-white rounded-xl animate-pulse border border-gray-200" />
                  ))}
                </div>
              ) : activeTab === 'ledger' ? (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">Transaction Ledger</h3>
                    <span className="text-xs text-gray-500">{ledgerEntries?.length} entries</span>
                  </div>
                  {ledgerEntries?.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <Icon name="FileText" size={36} className="text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-500">No ledger entries yet</p>
                      <p className="text-xs text-gray-400 mt-1">Trip charges will appear here automatically when trips are completed</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                          <tr>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Passenger</th>
                            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ref</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                            <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {ledgerEntries?.map((entry) => (
                            <tr key={entry?.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(entry?.posted_at)}</td>
                              <td className="px-4 py-3">
                                <p className="text-xs font-medium text-gray-800 truncate max-w-xs">{entry?.description || 'N/A'}</p>
                                <span className={`inline-block text-xs font-medium capitalize ${entryTypeColors?.[entry?.entry_type] || 'text-gray-500'}`}>
                                  {entry?.entry_type?.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-xs text-gray-600">{entry?.passenger_name || '—'}</td>
                              <td className="px-4 py-3 text-xs text-gray-400 font-mono">{entry?.reference_number?.slice(0, 12) || '—'}</td>
                              <td className={`px-4 py-3 text-xs font-semibold text-right whitespace-nowrap ${entryTypeColors?.[entry?.entry_type] || 'text-gray-800'}`}>
                                {entry?.entry_type === 'payment' || entry?.entry_type === 'credit' ? '-' : '+'}{formatCurrency(entry?.amount)}
                              </td>
                              <td className="px-4 py-3 text-xs font-bold text-right text-gray-900 whitespace-nowrap">{formatCurrency(entry?.running_balance)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {statements?.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-center">
                      <Icon name="FileText" size={36} className="text-gray-300 mb-3" />
                      <p className="text-sm font-medium text-gray-500">No statements generated yet</p>
                      <p className="text-xs text-gray-400 mt-1">Generate a statement to summarize billing for a period</p>
                    </div>
                  ) : (
                    statements?.map((stmt) => (
                      <div key={stmt?.id} className="bg-white rounded-xl border border-gray-200 p-5">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div>
                            <div className="flex items-center space-x-2 mb-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${statusColors?.[stmt?.statement_status] || 'bg-gray-100 text-gray-700'}`}>
                                {stmt?.statement_status?.replace('_', ' ')?.toUpperCase()}
                              </span>
                              <span className="text-xs text-gray-400 font-mono">#{stmt?.statement_number}</span>
                            </div>
                            <p className="text-sm font-semibold text-gray-900">
                              {formatDate(stmt?.period_start)} – {formatDate(stmt?.period_end)}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">{stmt?.total_trips} trips · Due {formatDate(stmt?.due_date)}</p>
                          </div>
                          <div className="flex items-center space-x-4">
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Total</p>
                              <p className="text-base font-bold text-gray-900">{formatCurrency(stmt?.total_amount)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-gray-500">Balance Due</p>
                              <p className={`text-base font-bold ${parseFloat(stmt?.balance_due) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                {formatCurrency(stmt?.balance_due)}
                              </p>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => downloadStatementPDF(stmt)}
                                className="p-2 text-gray-400 hover:text-primary hover:bg-blue-50 rounded-lg transition-colors"
                                title="Download PDF"
                              >
                                <Icon name="Download" size={16} />
                              </button>
                              {isAdmin && stmt?.statement_status !== 'paid' && (
                                <button
                                  onClick={() => handleMarkPaid(stmt?.id)}
                                  className="px-3 py-1.5 text-xs font-semibold bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                                >
                                  Mark Paid
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </main>
        </div>

        {/* Generate Statement Modal */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">Generate Statement</h3>
                <button onClick={() => setShowGenerateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <Icon name="X" size={20} />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period Start</label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e?.target?.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Period End</label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e?.target?.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <Button variant="outline" onClick={() => setShowGenerateModal(false)} className="flex-1">Cancel</Button>
                <Button onClick={handleGenerateStatement} disabled={generating} className="flex-1">
                  {generating ? 'Generating...' : 'Generate'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default CorporateBillingLedger;
