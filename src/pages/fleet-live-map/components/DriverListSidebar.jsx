import React from 'react';
import Icon from '../../../components/AppIcon';

const statusConfig = {
  in_progress: { label: 'On Trip', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  confirmed: { label: 'Confirmed', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  available: { label: 'Available', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  offline: { label: 'Offline', color: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  pending: { label: 'Pending', color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
};

const DriverListSidebar = ({ drivers, selectedDriver, onSelectDriver, searchTerm, onSearchChange, statusFilter, onStatusFilterChange, loading }) => {
  const filteredDrivers = drivers?.filter(d => {
    const matchSearch = !searchTerm ||
      d?.driverName?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      d?.plateNumber?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
      d?.vehicleName?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    const matchStatus = !statusFilter || d?.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: drivers?.length || 0,
    in_progress: drivers?.filter(d => d?.status === 'in_progress')?.length || 0,
    available: drivers?.filter(d => d?.status === 'available')?.length || 0,
    offline: drivers?.filter(d => d?.status === 'offline')?.length || 0,
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Sidebar Header */}
      <div className="px-4 py-4 border-b border-gray-100">
        <h2 className="text-sm font-bold text-gray-900 mb-3">Fleet Overview</h2>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <div className="text-center bg-blue-50 rounded-lg py-1.5">
            <p className="text-base font-bold text-blue-700">{counts?.in_progress}</p>
            <p className="text-xs text-blue-600">On Trip</p>
          </div>
          <div className="text-center bg-green-50 rounded-lg py-1.5">
            <p className="text-base font-bold text-green-700">{counts?.available}</p>
            <p className="text-xs text-green-600">Available</p>
          </div>
          <div className="text-center bg-gray-50 rounded-lg py-1.5">
            <p className="text-base font-bold text-gray-600">{counts?.offline}</p>
            <p className="text-xs text-gray-500">Offline</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-2">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search driver, plate..."
            value={searchTerm}
            onChange={e => onSearchChange(e?.target?.value)}
            className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={e => onStatusFilterChange(e?.target?.value)}
          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-white"
        >
          <option value="">All Statuses ({counts?.all})</option>
          <option value="in_progress">On Trip ({counts?.in_progress})</option>
          <option value="available">Available ({counts?.available})</option>
          <option value="confirmed">Confirmed</option>
          <option value="offline">Offline ({counts?.offline})</option>
        </select>
      </div>

      {/* Driver List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="Loader2" size={20} className="animate-spin text-primary" />
          </div>
        ) : filteredDrivers?.length === 0 ? (
          <div className="text-center py-10 px-4">
            <Icon name="Users" size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500">No drivers found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredDrivers?.map(driver => {
              const status = statusConfig?.[driver?.status] || statusConfig?.offline;
              const isSelected = selectedDriver?.id === driver?.id;
              return (
                <button
                  key={driver?.id}
                  onClick={() => onSelectDriver(driver)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${isSelected ? 'bg-primary/5 border-l-2 border-primary' : ''}`}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="relative flex-shrink-0">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <Icon name="User" size={16} className="text-gray-500" />
                      </div>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${status?.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-gray-900 truncate">{driver?.driverName}</p>
                      <p className="text-xs text-gray-500 truncate">{driver?.vehicleName}</p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-xs font-mono text-gray-500">{driver?.plateNumber}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${status?.bg} ${status?.text}`}>
                          {status?.label}
                        </span>
                      </div>
                      {driver?.status === 'in_progress' && driver?.currentTrip?.eta && (
                        <p className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                          <Icon name="Clock" size={10} />
                          ETA {driver?.currentTrip?.eta}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DriverListSidebar;
