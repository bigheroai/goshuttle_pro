import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const NotificationPanel = ({ notifications, onMarkAsRead, onClearAll }) => {
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'arrival': return 'MapPin';
      case 'delay': return 'Clock';
      case 'route_change': return 'Route';
      case 'driver_message': return 'MessageCircle';
      case 'emergency': return 'AlertTriangle';
      case 'payment': return 'CreditCard';
      default: return 'Bell';
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'arrival': return 'text-green-600 bg-green-100';
      case 'delay': return 'text-amber-600 bg-amber-100';
      case 'route_change': return 'text-blue-600 bg-blue-100';
      case 'driver_message': return 'text-purple-600 bg-purple-100';
      case 'emergency': return 'text-red-600 bg-red-100';
      case 'payment': return 'text-indigo-600 bg-indigo-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const formatTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return notificationTime?.toLocaleDateString();
  };

  if (!notifications || notifications?.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Icon name="Bell" size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Notifications</h3>
        <p className="text-gray-600">You're all caught up!</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
          {notifications?.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              iconName="X"
              iconPosition="left"
            >
              Clear All
            </Button>
          )}
        </div>
      </div>
      <div className="max-h-96 overflow-y-auto">
        {notifications?.map((notification) => (
          <div
            key={notification?.id}
            className={`p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
              !notification?.read ? 'bg-blue-50/50' : ''
            }`}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-full ${getNotificationColor(notification?.type)}`}>
                <Icon name={getNotificationIcon(notification?.type)} size={16} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-gray-900 mb-1">
                      {notification?.title}
                    </h4>
                    <p className="text-sm text-gray-600 mb-2">
                      {notification?.message}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>{formatTime(notification?.timestamp)}</span>
                      {notification?.tripId && (
                        <>
                          <span>•</span>
                          <span>Trip #{notification?.tripId}</span>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {!notification?.read && (
                    <Button
                      variant="ghost"
                      size="xs"
                      onClick={() => onMarkAsRead(notification?.id)}
                      className="ml-2"
                    >
                      <Icon name="Check" size={14} />
                    </Button>
                  )}
                </div>

                {notification?.actionRequired && (
                  <div className="mt-3">
                    <Button
                      variant="outline"
                      size="xs"
                      iconName="ExternalLink"
                      iconPosition="right"
                    >
                      {notification?.actionText || 'Take Action'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotificationPanel;