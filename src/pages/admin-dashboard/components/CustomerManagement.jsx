import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { logAdminAction, AUDIT_ACTIONS } from '../../../utils/adminAuditLogger';
import { Users, UserPlus, Search, Eye, X, CheckCircle, AlertCircle, Phone, Mail, Calendar, Shield, Trash2, Ban, Clock } from 'lucide-react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const CustomerManagement = () => {
  const { userProfile } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [actionModal, setActionModal] = useState(null); // { type: 'delete'|'ban'|'suspend', customer }
  const [suspendDays, setSuspendDays] = useState(7);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.select('*')
        ?.eq('role', 'customer')
        ?.order('created_at', { ascending: false });
      if (data && !error) {
        setCustomers(data);
      } else if (error) {
        console.error('Error loading customers:', error);
        setErrorMsg('Failed to load customers.');
      }
    } catch (err) {
      console.error('Error loading customers:', err);
      setErrorMsg('Failed to load customers.');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (customerId, currentStatus) => {
    try {
      const newStatus = !currentStatus;
      const target = customers?.find(c => c?.id === customerId);
      const { error } = await supabase
        ?.from('user_profiles')
        ?.update({ is_active: newStatus, updated_at: new Date()?.toISOString() })
        ?.eq('id', customerId);
      if (error) {
        alert('Error updating status: ' + error?.message);
        return;
      }
      await logAdminAction({
        actionType: newStatus ? AUDIT_ACTIONS?.USER_ACTIVATED : AUDIT_ACTIONS?.USER_DEACTIVATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: customerId,
        targetType: 'user',
        targetName: target?.full_name || target?.email,
        description: `${newStatus ? 'Activated' : 'Deactivated'} customer account for ${target?.full_name || target?.email}`,
        metadata: { user_email: target?.email, new_status: newStatus ? 'active' : 'inactive' },
      });
      loadCustomers();
    } catch (err) {
      console.error('Status toggle error:', err);
      alert('An unexpected error occurred');
    }
  };

  const handleDelete = async () => {
    const customer = actionModal?.customer;
    if (!customer) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        ?.from('user_profiles')
        ?.delete()
        ?.eq('id', customer?.id);
      if (error) throw new Error(error?.message);
      await logAdminAction({
        actionType: AUDIT_ACTIONS?.USER_DEACTIVATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: customer?.id,
        targetType: 'user',
        targetName: customer?.full_name || customer?.email,
        description: `Deleted customer account for ${customer?.full_name || customer?.email}`,
        metadata: { user_email: customer?.email, action: 'delete' },
      });
      setSuccessMsg(`Customer "${customer?.full_name || customer?.email}" has been deleted.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setActionModal(null);
      loadCustomers();
    } catch (err) {
      setErrorMsg('Failed to delete customer: ' + err?.message);
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleBan = async () => {
    const customer = actionModal?.customer;
    if (!customer) return;
    setActionLoading(true);
    try {
      const { error } = await supabase
        ?.from('user_profiles')
        ?.update({
          is_active: false,
          ban_status: 'banned',
          banned_at: new Date()?.toISOString(),
          suspended_until: null,
          updated_at: new Date()?.toISOString(),
        })
        ?.eq('id', customer?.id);
      if (error) throw new Error(error?.message);
      await logAdminAction({
        actionType: AUDIT_ACTIONS?.USER_DEACTIVATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: customer?.id,
        targetType: 'user',
        targetName: customer?.full_name || customer?.email,
        description: `Banned customer account for ${customer?.full_name || customer?.email}`,
        metadata: { user_email: customer?.email, action: 'ban' },
      });
      setSuccessMsg(`Customer "${customer?.full_name || customer?.email}" has been banned.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setActionModal(null);
      loadCustomers();
    } catch (err) {
      setErrorMsg('Failed to ban customer: ' + err?.message);
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSuspend = async () => {
    const customer = actionModal?.customer;
    if (!customer) return;
    setActionLoading(true);
    try {
      const suspendUntil = new Date();
      suspendUntil?.setDate(suspendUntil?.getDate() + Number(suspendDays));
      const { error } = await supabase
        ?.from('user_profiles')
        ?.update({
          is_active: false,
          ban_status: 'suspended',
          suspended_until: suspendUntil?.toISOString(),
          banned_at: null,
          updated_at: new Date()?.toISOString(),
        })
        ?.eq('id', customer?.id);
      if (error) throw new Error(error?.message);
      await logAdminAction({
        actionType: AUDIT_ACTIONS?.USER_DEACTIVATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: customer?.id,
        targetType: 'user',
        targetName: customer?.full_name || customer?.email,
        description: `Suspended customer account for ${customer?.full_name || customer?.email} for ${suspendDays} days`,
        metadata: { user_email: customer?.email, action: 'suspend', days: suspendDays, until: suspendUntil?.toISOString() },
      });
      setSuccessMsg(`Customer "${customer?.full_name || customer?.email}" has been suspended for ${suspendDays} day(s).`);
      setTimeout(() => setSuccessMsg(''), 4000);
      setActionModal(null);
      loadCustomers();
    } catch (err) {
      setErrorMsg('Failed to suspend customer: ' + err?.message);
      setTimeout(() => setErrorMsg(''), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnban = async (customer) => {
    try {
      const { error } = await supabase
        ?.from('user_profiles')
        ?.update({
          is_active: true,
          ban_status: null,
          banned_at: null,
          suspended_until: null,
          updated_at: new Date()?.toISOString(),
        })
        ?.eq('id', customer?.id);
      if (error) throw new Error(error?.message);
      await logAdminAction({
        actionType: AUDIT_ACTIONS?.USER_ACTIVATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: customer?.id,
        targetType: 'user',
        targetName: customer?.full_name || customer?.email,
        description: `Restored customer account for ${customer?.full_name || customer?.email}`,
        metadata: { user_email: customer?.email, action: 'unban' },
      });
      setSuccessMsg(`Customer "${customer?.full_name || customer?.email}" has been restored.`);
      setTimeout(() => setSuccessMsg(''), 4000);
      loadCustomers();
    } catch (err) {
      setErrorMsg('Failed to restore customer: ' + err?.message);
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const filteredCustomers = customers?.filter(c =>
    !searchQuery ||
    c?.full_name?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
    c?.email?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
    c?.phone?.toLowerCase()?.includes(searchQuery?.toLowerCase())
  );

  const getStatusBadge = (customer) => {
    if (customer?.ban_status === 'banned') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <Ban className="w-3 h-3 mr-1" /> Banned
        </span>
      );
    }
    if (customer?.ban_status === 'suspended') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
          <Clock className="w-3 h-3 mr-1" /> Suspended
        </span>
      );
    }
    const isActive = customer?.is_active !== false;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-700'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const isBannedOrSuspended = (customer) => customer?.ban_status === 'banned' || customer?.ban_status === 'suspended';

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Customer Management</h2>
          <p className="text-sm text-gray-600">Manage customer accounts and profiles</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm text-gray-500 mr-1">
            {filteredCustomers?.length || 0} customers
          </span>
          <Button
            size="sm"
            onClick={() => setShowAddModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Add Customer
          </Button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-4 h-4 text-green-500" />
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <p className="text-sm text-red-700">{errorMsg}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e?.target?.value)}
          placeholder="Search by name, email, or phone..."
          className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <p className="text-gray-600 text-sm">Loading customers...</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredCustomers?.map((customer) => (
                    <tr key={customer?.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Icon name="User" size={18} className="text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{customer?.full_name || '—'}</div>
                            <div className="text-sm text-gray-500">{customer?.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {customer?.phone || '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(customer)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {customer?.created_at ? new Date(customer?.created_at)?.toLocaleDateString() : '—'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => setSelectedCustomer(customer)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isBannedOrSuspended(customer) ? (
                            <button
                              onClick={() => handleUnban(customer)}
                              className="p-1.5 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors"
                              title="Restore Account"
                            >
                              <CheckCircle className="w-4 h-4" />
                            </button>
                          ) : (
                            <>
                              <button
                                onClick={() => setActionModal({ type: 'suspend', customer })}
                                className="p-1.5 text-orange-500 hover:text-orange-700 hover:bg-orange-50 rounded-lg transition-colors"
                                title="Suspend"
                              >
                                <Clock className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => setActionModal({ type: 'ban', customer })}
                                className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                                title="Ban"
                              >
                                <Ban className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setActionModal({ type: 'delete', customer })}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredCustomers?.map((customer) => (
              <div key={customer?.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Icon name="User" size={18} className="text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">{customer?.full_name || '—'}</h3>
                      <p className="text-xs text-gray-500">{customer?.email}</p>
                    </div>
                  </div>
                  {getStatusBadge(customer)}
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Phone</p>
                    <p className="text-xs text-gray-900 mt-1">{customer?.phone || '—'}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Joined</p>
                    <p className="text-xs text-gray-900 mt-1">{customer?.created_at ? new Date(customer?.created_at)?.toLocaleDateString() : '—'}</p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedCustomer(customer)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-blue-600 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View
                  </button>
                  {isBannedOrSuspended(customer) ? (
                    <button
                      onClick={() => handleUnban(customer)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-green-600 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Restore
                    </button>
                  ) : (
                    <>
                      <button
                        onClick={() => setActionModal({ type: 'suspend', customer })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-orange-600 border border-orange-200 rounded-lg hover:bg-orange-50 transition-colors"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Suspend
                      </button>
                      <button
                        onClick={() => setActionModal({ type: 'ban', customer })}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                      >
                        <Ban className="w-3.5 h-3.5" />
                        Ban
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => setActionModal({ type: 'delete', customer })}
                    className="flex items-center justify-center gap-1.5 py-1.5 px-3 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredCustomers?.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-base font-medium text-gray-900 mb-2">No customers found</h3>
              <p className="text-sm text-gray-600">
                {searchQuery ? 'Try a different search term.' : 'Customers will appear here once they register.'}
              </p>
            </div>
          )}
        </>
      )}

      {/* Customer Detail Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon name="User" size={18} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-gray-900">Customer Details</h3>
                  <p className="text-xs text-gray-500">Account information</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <Icon name="User" size={28} className="text-blue-600" />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">{selectedCustomer?.full_name || '—'}</h4>
                  <p className="text-sm text-gray-500">{selectedCustomer?.email}</p>
                  <div className="mt-1">{getStatusBadge(selectedCustomer)}</div>
                </div>
              </div>
              <div className="border-t pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Phone</p>
                    <p className="text-sm text-gray-900">{selectedCustomer?.phone || '—'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm text-gray-900">{selectedCustomer?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Joined</p>
                    <p className="text-sm text-gray-900">
                      {selectedCustomer?.created_at ? new Date(selectedCustomer?.created_at)?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Shield className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">KYC Status</p>
                    <p className="text-sm text-gray-900 capitalize">{selectedCustomer?.kyc_status || 'Not submitted'}</p>
                  </div>
                </div>
                {selectedCustomer?.ban_status === 'suspended' && selectedCustomer?.suspended_until && (
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-orange-400" />
                    <div>
                      <p className="text-xs text-gray-500">Suspended Until</p>
                      <p className="text-sm text-orange-700">
                        {new Date(selectedCustomer?.suspended_until)?.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedCustomer(null)}>
                  Close
                </Button>
                {isBannedOrSuspended(selectedCustomer) ? (
                  <Button
                    size="sm"
                    onClick={() => { handleUnban(selectedCustomer); setSelectedCustomer(null); }}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> Restore
                  </Button>
                ) : (
                  <>
                    <Button
                      size="sm"
                      onClick={() => { setActionModal({ type: 'suspend', customer: selectedCustomer }); setSelectedCustomer(null); }}
                      className="bg-orange-500 hover:bg-orange-600 text-white"
                    >
                      <Clock className="w-3.5 h-3.5 mr-1.5" /> Suspend
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => { setActionModal({ type: 'ban', customer: selectedCustomer }); setSelectedCustomer(null); }}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Ban className="w-3.5 h-3.5 mr-1.5" /> Ban
                    </Button>
                  </>
                )}
                <Button
                  size="sm"
                  onClick={() => { setActionModal({ type: 'delete', customer: selectedCustomer }); setSelectedCustomer(null); }}
                  className="bg-gray-700 hover:bg-gray-800 text-white"
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Confirmation Modals */}
      {actionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  actionModal?.type === 'delete' ? 'bg-gray-100' :
                  actionModal?.type === 'ban' ? 'bg-red-100' : 'bg-orange-100'
                }`}>
                  {actionModal?.type === 'delete' && <Trash2 className="w-4 h-4 text-gray-600" />}
                  {actionModal?.type === 'ban' && <Ban className="w-4 h-4 text-red-600" />}
                  {actionModal?.type === 'suspend' && <Clock className="w-4 h-4 text-orange-600" />}
                </div>
                <h3 className="text-base font-semibold text-gray-900 capitalize">
                  {actionModal?.type === 'delete' ? 'Delete Customer' :
                   actionModal?.type === 'ban' ? 'Ban Customer' : 'Suspend Customer'}
                </h3>
              </div>
              <button
                onClick={() => setActionModal(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              {actionModal?.type === 'delete' && (
                <p className="text-sm text-gray-600">
                  Are you sure you want to <span className="font-semibold text-red-600">permanently delete</span> the account for <span className="font-medium">{actionModal?.customer?.full_name || actionModal?.customer?.email}</span>? This action cannot be undone.
                </p>
              )}
              {actionModal?.type === 'ban' && (
                <p className="text-sm text-gray-600">
                  Are you sure you want to <span className="font-semibold text-red-600">permanently ban</span> <span className="font-medium">{actionModal?.customer?.full_name || actionModal?.customer?.email}</span>? They will not be able to log in until unbanned.
                </p>
              )}
              {actionModal?.type === 'suspend' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Suspend <span className="font-medium">{actionModal?.customer?.full_name || actionModal?.customer?.email}</span> for how many days?
                  </p>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Suspension Duration</label>
                    <select
                      value={suspendDays}
                      onChange={e => setSuspendDays(e?.target?.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value={1}>1 day</option>
                      <option value={3}>3 days</option>
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="outline" size="sm" onClick={() => setActionModal(null)} disabled={actionLoading}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={actionLoading}
                  onClick={
                    actionModal?.type === 'delete' ? handleDelete :
                    actionModal?.type === 'ban' ? handleBan : handleSuspend
                  }
                  className={
                    actionModal?.type === 'delete' ? 'bg-gray-700 hover:bg-gray-800 text-white' :
                    actionModal?.type === 'ban'? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-orange-500 hover:bg-orange-600 text-white'
                  }
                >
                  {actionLoading ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                      Processing...
                    </span>
                  ) : (
                    <span className="capitalize">
                      {actionModal?.type === 'delete' ? 'Delete' :
                       actionModal?.type === 'ban' ? 'Ban Customer' : `Suspend ${suspendDays}d`}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddModal && (
        <AddCustomerModal
          onClose={() => setShowAddModal(false)}
          onSuccess={(msg) => {
            setSuccessMsg(msg);
            loadCustomers();
            setTimeout(() => setSuccessMsg(''), 4000);
          }}
        />
      )}
    </div>
  );
};

const AddCustomerModal = ({ onClose, onSuccess }) => {
  const { userProfile } = useAuth();
  const [form, setForm] = useState({ full_name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form?.full_name?.trim() || !form?.email?.trim() || !form?.password?.trim()) {
      setError('Full name, email, and password are required.');
      return;
    }
    if (form?.password?.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { data: authData, error: authError } = await supabase?.auth?.signUp({
        email: form?.email?.trim()?.toLowerCase(),
        password: form?.password,
        options: {
          data: {
            full_name: form?.full_name?.trim(),
            role: 'customer',
          },
        },
      });
      if (authError) throw new Error(authError?.message);
      if (!authData?.user?.id) throw new Error('Failed to create customer account.');

      const { error: profileError } = await supabase?.from('user_profiles')?.upsert({
        id: authData?.user?.id,
        email: form?.email?.trim()?.toLowerCase(),
        full_name: form?.full_name?.trim(),
        role: 'customer',
        phone: form?.phone?.trim() || null,
        is_active: true,
        created_at: new Date()?.toISOString(),
        updated_at: new Date()?.toISOString(),
      }, { onConflict: 'id' });

      if (profileError) {
        console.warn('Profile upsert warning:', profileError?.message);
      }

      await logAdminAction({
        actionType: AUDIT_ACTIONS?.USER_CREATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: authData?.user?.id,
        targetType: 'user',
        targetName: form?.full_name?.trim(),
        description: `Created new customer account for ${form?.full_name?.trim()}`,
        metadata: { email: form?.email?.trim()?.toLowerCase(), role: 'customer' },
      });

      onSuccess?.(`Customer "${form?.full_name}" created successfully.`);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to create customer. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserPlus className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Add New Customer</h3>
              <p className="text-xs text-gray-500">Create a customer account manually</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form?.full_name}
              onChange={e => handleChange('full_name', e?.target?.value)}
              placeholder="e.g. Juan dela Cruz"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form?.email}
              onChange={e => handleChange('email', e?.target?.value)}
              placeholder="customer@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form?.password}
                onChange={e => handleChange('password', e?.target?.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={16} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={form?.phone}
              onChange={e => handleChange('phone', e?.target?.value)}
              placeholder="+63 9XX XXX XXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={onClose} type="button">
              Cancel
            </Button>
            <Button
              size="sm"
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <UserPlus className="w-3.5 h-3.5" />
                  Create Customer
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerManagement;
