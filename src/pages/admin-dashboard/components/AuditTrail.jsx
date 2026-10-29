import React, { useState, useEffect } from 'react';
import { History, User, Calendar, Activity, Eye, Search, X } from 'lucide-react';
import { useAuth } from '../../../contexts/AuthContext';
import { getUserManagedEntities, getUserActivitySummary, getAllEntitiesWithAudit } from '../../../utils/auditService';

const AuditTrail = () => {
  const { user, userProfile } = useAuth();
  const [auditData, setAuditData] = useState([]);
  const [activitySummary, setActivitySummary] = useState(null);
  const [allEntities, setAllEntities] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('30 days');
  const [selectedUser, setSelectedUser] = useState('all');
  const [selectedEntityType, setSelectedEntityType] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);

  useEffect(() => {
    loadAuditData();
  }, [selectedTimeframe]);

  const loadAuditData = async () => {
    setLoading(true);
    setError('');
    
    try {
      if (user?.id) {
        const { data: userEntities, error: userError } = await getUserManagedEntities(user?.id);
        if (userError) {
          setError(userError);
        } else {
          setAuditData(userEntities || []);
        }

        const { data: summary, error: summaryError } = await getUserActivitySummary(user?.id, selectedTimeframe);
        if (summaryError) {
          setError(summaryError);
        } else {
          setActivitySummary(summary);
        }
      }

      const { data: entities, error: entitiesError } = await getAllEntitiesWithAudit();
      if (entitiesError) {
        setError(entitiesError);
      } else {
        setAllEntities(entities);
      }
    } catch (err) {
      setError('Failed to load audit data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString)?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getEntityIcon = (entityType) => {
    switch (entityType) {
      case 'partner': return '🤝';
      case 'company': return '🏢';
      case 'vehicle': return '🚐';
      case 'booking': return '📋';
      default: return '📄';
    }
  };

  const getEntityTypeColor = (entityType) => {
    switch (entityType) {
      case 'partner': return 'bg-purple-100 text-purple-800';
      case 'company': return 'bg-blue-100 text-blue-800';
      case 'vehicle': return 'bg-green-100 text-green-800';
      case 'booking': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openEntityDetail = (item) => {
    setSelectedItem(item);
  };

  const filteredAuditData = auditData?.filter(item => {
    if (selectedEntityType !== 'all' && item?.entity_type !== selectedEntityType) return false;
    if (searchTerm && item?.entity_name?.toLowerCase()?.includes(searchTerm?.toLowerCase()) === false) return false;
    return true;
  });

  const isAdmin = userProfile?.role === 'admin';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Audit Trail</h2>
          <p className="text-gray-600">Track user activities and data changes</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-blue-600" />
          <span className="text-sm text-gray-600">
            Tracking {isAdmin ? 'all' : 'your'} activities
          </span>
        </div>
      </div>
      {/* Activity Summary Cards */}
      {activitySummary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Companies</p>
                <p className="text-2xl font-bold text-blue-600">{activitySummary?.companies?.length || 0}</p>
              </div>
              <div className="text-2xl">🏢</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Partners</p>
                <p className="text-2xl font-bold text-purple-600">{activitySummary?.partners?.length || 0}</p>
              </div>
              <div className="text-2xl">🤝</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vehicles</p>
                <p className="text-2xl font-bold text-green-600">{activitySummary?.vehicles?.length || 0}</p>
              </div>
              <div className="text-2xl">🚐</div>
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Bookings</p>
                <p className="text-2xl font-bold text-orange-600">{activitySummary?.bookings?.length || 0}</p>
              </div>
              <div className="text-2xl">📋</div>
            </div>
          </div>
        </div>
      )}
      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow-sm border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search entities..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e?.target?.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e?.target?.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7 days">Last 7 days</option>
            <option value="30 days">Last 30 days</option>
            <option value="90 days">Last 90 days</option>
          </select>
          <select
            value={selectedEntityType}
            onChange={(e) => setSelectedEntityType(e?.target?.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="partner">Partners</option>
            <option value="company">Companies</option>
            <option value="vehicle">Vehicles</option>
            <option value="booking">Bookings</option>
          </select>
        </div>
      </div>
      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {/* Audit Trail List - Your Managed Entities */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <History className="w-5 h-5" />
            Your Managed Entities
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading audit trail...</p>
          </div>
        ) : filteredAuditData?.length === 0 ? (
          <div className="p-8 text-center">
            <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No activities found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredAuditData?.map((item, index) => (
              <div key={`${item?.entity_type}-${item?.entity_id}-${index}`} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="text-2xl">{getEntityIcon(item?.entity_type)}</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium text-gray-900">
                          {item?.entity_name}
                        </h4>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEntityTypeColor(item?.entity_type)}`}>
                          {item?.entity_type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Created: {formatDate(item?.created_at)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          Updated: {formatDate(item?.updated_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => openEntityDetail(item)}
                    className="text-blue-600 hover:text-blue-800 p-2 rounded-lg hover:bg-blue-50 transition-colors"
                    title="View Details"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {/* Admin View - All Entities */}
      {isAdmin && allEntities && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <User className="w-5 h-5" />
              All System Entities (Admin View)
            </h3>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Companies */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Companies ({allEntities?.companies?.length || 0})</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allEntities?.companies?.map((company) => (
                    <div key={company?.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{company?.name}</p>
                        <p className="text-xs text-gray-500">
                          Created by: {company?.created_by_profile?.full_name || 'Unknown'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {formatDate(company?.updated_at)}
                        </span>
                        <button
                          onClick={() => openEntityDetail({ entity_type: 'company', entity_name: company?.name, entity_id: company?.id, created_at: company?.created_at, updated_at: company?.updated_at, created_by: company?.created_by_profile?.full_name, metadata: { email: company?.email, phone: company?.phone, address: company?.address } })}
                          className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Partners */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-3">Partners ({allEntities?.partners?.length || 0})</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {allEntities?.partners?.map((partner) => (
                    <div key={partner?.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{partner?.name}</p>
                        <p className="text-xs text-gray-500">
                          Created by: {partner?.created_by_profile?.full_name || 'Unknown'}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {formatDate(partner?.updated_at)}
                        </span>
                        <button
                          onClick={() => openEntityDetail({ entity_type: 'partner', entity_name: partner?.name, entity_id: partner?.id, created_at: partner?.created_at, updated_at: partner?.updated_at, created_by: partner?.created_by_profile?.full_name, metadata: { email: partner?.email, phone: partner?.phone, status: partner?.status } })}
                          className="text-blue-600 hover:text-blue-800 p-1.5 rounded-lg hover:bg-blue-50 transition-colors"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Entity Detail Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <span className="text-2xl">{getEntityIcon(selectedItem?.entity_type)}</span>
                  Entity Details
                </h3>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Entity Name</p>
                    <p className="text-sm font-medium text-gray-900 mt-1">{selectedItem?.entity_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Entity Type</p>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1 ${getEntityTypeColor(selectedItem?.entity_type)}`}>
                      {selectedItem?.entity_type}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Entity ID</p>
                    <p className="text-xs font-mono text-gray-700 mt-1 break-all">{selectedItem?.entity_id || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Created At</p>
                    <p className="text-sm text-gray-700 mt-1">{formatDate(selectedItem?.created_at)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Last Updated</p>
                    <p className="text-sm text-gray-700 mt-1">{formatDate(selectedItem?.updated_at)}</p>
                  </div>
                  {selectedItem?.created_by && (
                    <div>
                      <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Created By</p>
                      <p className="text-sm text-gray-700 mt-1">{selectedItem?.created_by}</p>
                    </div>
                  )}
                </div>

                {selectedItem?.metadata && Object.keys(selectedItem?.metadata)?.some(k => selectedItem?.metadata?.[k]) && (
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Additional Data</p>
                    <div className="bg-gray-50 border border-gray-200 rounded p-3 space-y-1">
                      {Object.entries(selectedItem?.metadata)?.map(([key, value]) =>
                        value ? (
                          <div key={key} className="flex gap-2 text-xs">
                            <span className="font-medium text-gray-600 capitalize min-w-[80px]">{key?.replace(/_/g, ' ')}:</span>
                            <span className="text-gray-800">{String(value)}</span>
                          </div>
                        ) : null
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setSelectedItem(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditTrail;