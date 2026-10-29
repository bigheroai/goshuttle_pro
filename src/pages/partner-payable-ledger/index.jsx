import React, { useState, useEffect, useCallback } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import { useAuth } from '../../contexts/AuthContext';
import partnerPayableService from '../../services/partnerPayableService';

const entryTypeColors = {
  trip_earning: 'text-green-600',
  deduction: 'text-red-600',
  bonus: 'text-blue-600',
  payment: 'text-purple-600',
};

const PartnerPayableLedger = () => {
  const { userProfile, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [ledgerEntries, setLedgerEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  const loadAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isAdmin) {
        const data = await partnerPayableService?.getAllPayableAccounts();
        setAccounts(data);
        if (data?.length > 0 && !selectedAccount) {
          setSelectedAccount(data?.[0]);
        }
      } else {
        const account = await partnerPayableService?.getPayableAccount(userProfile?.id);
        if (account) {
          setAccounts([account]);
          setSelectedAccount(account);
        }
      }
    } catch (err) {
      setError(err?.message || 'Failed to load payable accounts');
    } finally {
      setLoading(false);
    }
  }, [isAdmin, userProfile?.id]);

  const loadLedger = useCallback(async () => {
    if (!selectedAccount?.id) return;
    setLedgerLoading(true);
    try {
      const entries = await partnerPayableService?.getLedgerEntries(selectedAccount?.id);
      setLedgerEntries(entries);
    } catch (err) {
      console.error('Error loading ledger:', err);
    } finally {
      setLedgerLoading(false);
    }
  }, [selectedAccount?.id]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { loadLedger(); }, [loadLedger]);

  const handlePostPayment = async () => {
    if (!selectedAccount?.id || !paymentAmount) return;
    setPaymentLoading(true);
    try {
      await partnerPayableService?.postPayment(
        selectedAccount?.id,
        parseFloat(paymentAmount),
        paymentNote || 'Payment disbursed',
        userProfile?.id
      );
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNote('');
      setSuccessMsg('Payment posted successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
      await loadAccounts();
      await loadLedger();
    } catch (err) {
      setError(err?.message || 'Failed to post payment');
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatCurrency = (v) => `₱${parseFloat(v || 0)?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const formatDate = (d) => d ? new Date(d)?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';
  const formatPct = (v, type) => type === 'percentage' ? `${(parseFloat(v || 0) * 100)?.toFixed(0)}%` : formatCurrency(v);

  return (
    <>
      <Helmet>
        <title>Partner Payable Ledger – GoShuttle Pro</title>
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="pt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <button onClick={() => navigate(-1)} className="text-gray-400 hover:text-gray-600 transition-colors">
                    <Icon name="ArrowLeft" size={18} />
                  </button>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">
                    <Icon name="Wallet" size={12} className="mr-1" /> Partner Payables
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Partner Payable Ledger</h1>
                <p className="text-sm text-gray-500 mt-1">Track driver earnings and payment disbursements</p>
              </div>
              {isAdmin && selectedAccount && (
                <Button onClick={() => setShowPaymentModal(true)} className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700">
                  <Icon name="Send" size={16} />
                  <span>Post Payment</span>
                </Button>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5 flex items-center space-x-2">
                <Icon name="AlertCircle" size={16} className="text-red-500" />
                <p className="text-sm text-red-700">{error}</p>
                <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600"><Icon name="X" size={14} /></button>
              </div>
            )}

            {successMsg && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-5 flex items-center space-x-2">
                <Icon name="CheckCircle" size={16} className="text-green-500" />
                <p className="text-sm text-green-700">{successMsg}</p>
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3]?.map(i => <div key={i} className="h-24 bg-white rounded-xl animate-pulse border border-gray-200" />)}
              </div>
            ) : accounts?.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center justify-center py-16 text-center">
                <Icon name="Wallet" size={36} className="text-gray-300 mb-3" />
                <p className="text-sm font-medium text-gray-500">No payable accounts found</p>
                <p className="text-xs text-gray-400 mt-1">
                  {isAdmin ? 'Partner payable accounts are created automatically when drivers are assigned trips.' : 'Your payable account will appear here once you complete trips.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Account List (admin) or single account card */}
                <div className="lg:col-span-1 space-y-3">
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-1">
                    {isAdmin ? 'Driver Accounts' : 'My Account'}
                  </h3>
                  {accounts?.map((account) => {
                    const driver = account?.user_profiles;
                    const isSelected = selectedAccount?.id === account?.id;
                    return (
                      <button
                        key={account?.id}
                        onClick={() => setSelectedAccount(account)}
                        className={`w-full text-left bg-white rounded-xl border p-4 transition-all ${
                          isSelected ? 'border-emerald-400 shadow-md ring-1 ring-emerald-200' : 'border-gray-200 hover:border-emerald-300 hover:shadow-sm'
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center">
                              <Icon name="User" size={14} className="text-emerald-700" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{driver?.full_name || account?.account_name}</p>
                              <p className="text-xs text-gray-400">{driver?.email || '—'}</p>
                            </div>
                          </div>
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            {formatPct(account?.driver_rate_value, account?.driver_rate_type)}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          <div>
                            <p className="text-xs text-gray-400">Balance</p>
                            <p className="text-sm font-bold text-gray-900">{formatCurrency(account?.current_balance)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-400">Total Earned</p>
                            <p className="text-sm font-bold text-emerald-700">{formatCurrency(account?.total_earned)}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Ledger Detail */}
                <div className="lg:col-span-2">
                  {selectedAccount && (
                    <>
                      {/* Account Summary */}
                      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 rounded-2xl p-5 mb-4 text-white">
                        <p className="text-emerald-200 text-xs font-medium mb-1">
                          {selectedAccount?.user_profiles?.full_name || selectedAccount?.account_name}
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-emerald-200 text-xs">Current Balance</p>
                            <p className="text-xl font-bold">{formatCurrency(selectedAccount?.current_balance)}</p>
                          </div>
                          <div>
                            <p className="text-emerald-200 text-xs">Total Earned</p>
                            <p className="text-xl font-bold">{formatCurrency(selectedAccount?.total_earned)}</p>
                          </div>
                          <div>
                            <p className="text-emerald-200 text-xs">Total Paid</p>
                            <p className="text-xl font-bold">{formatCurrency(selectedAccount?.total_paid)}</p>
                          </div>
                        </div>
                        <div className="mt-3 pt-3 border-t border-emerald-500/40">
                          <p className="text-emerald-200 text-xs">
                            Rate: <span className="font-semibold text-white">{formatPct(selectedAccount?.driver_rate_value, selectedAccount?.driver_rate_type)}</span>
                            {selectedAccount?.driver_rate_type === 'percentage' ? ' of gross fare' : ' fixed per trip'}
                          </p>
                        </div>
                      </div>

                      {/* Ledger Table */}
                      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                          <h3 className="text-sm font-semibold text-gray-900">Transaction History</h3>
                          <span className="text-xs text-gray-500">{ledgerEntries?.length} entries</span>
                        </div>
                        {ledgerLoading ? (
                          <div className="p-6 space-y-3">
                            {[1, 2, 3]?.map(i => <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />)}
                          </div>
                        ) : ledgerEntries?.length === 0 ? (
                          <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Icon name="List" size={32} className="text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">No transactions yet</p>
                            <p className="text-xs text-gray-400 mt-1">Earnings will appear here after trips are completed</p>
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Description</th>
                                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Gross Fare</th>
                                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-100">
                                {ledgerEntries?.map((entry) => (
                                  <tr key={entry?.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDate(entry?.posted_at)}</td>
                                    <td className="px-4 py-3">
                                      <span className={`text-xs font-semibold capitalize ${entryTypeColors?.[entry?.entry_type] || 'text-gray-600'}`}>
                                        {entry?.entry_type?.replace('_', ' ')}
                                      </span>
                                    </td>
                                    <td className="px-4 py-3 text-xs text-gray-700 max-w-xs truncate">{entry?.description || '—'}</td>
                                    <td className="px-4 py-3 text-xs text-gray-500 text-right">{entry?.gross_fare ? formatCurrency(entry?.gross_fare) : '—'}</td>
                                    <td className={`px-4 py-3 text-xs font-semibold text-right whitespace-nowrap ${entryTypeColors?.[entry?.entry_type] || 'text-gray-800'}`}>
                                      {entry?.entry_type === 'payment' || entry?.entry_type === 'deduction' ? '-' : '+'}{formatCurrency(entry?.amount)}
                                    </td>
                                    <td className="px-4 py-3 text-xs font-bold text-right text-gray-900 whitespace-nowrap">{formatCurrency(entry?.running_balance)}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Post Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-lg font-bold text-gray-900">Post Payment</h3>
                <button onClick={() => setShowPaymentModal(false)} className="text-gray-400 hover:text-gray-600">
                  <Icon name="X" size={20} />
                </button>
              </div>
              <div className="bg-emerald-50 rounded-xl p-4 mb-4">
                <p className="text-xs text-emerald-700 font-medium">Driver: {selectedAccount?.user_profiles?.full_name || selectedAccount?.account_name}</p>
                <p className="text-xs text-emerald-600 mt-0.5">Current balance: {formatCurrency(selectedAccount?.current_balance)}</p>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount (₱)</label>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e?.target?.value)}
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Note (optional)</label>
                  <input
                    type="text"
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e?.target?.value)}
                    placeholder="Payment reference or note"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div className="flex space-x-3 mt-6">
                <Button variant="outline" onClick={() => setShowPaymentModal(false)} className="flex-1">Cancel</Button>
                <Button
                  onClick={handlePostPayment}
                  disabled={paymentLoading || !paymentAmount}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                >
                  {paymentLoading ? 'Posting...' : 'Post Payment'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default PartnerPayableLedger;
