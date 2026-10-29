import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';


const QuickActions = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      id: 1,
      title: "Book a Ride",
      description: "Need immediate transportation? Start booking now",
      icon: "Calendar",
      action: "Book Now",
      variant: "default",
      path: "/smart-booking-portal",
      buttonClass: "bg-blue-800 hover:bg-blue-900 text-white font-semibold"
    },
    {
      id: 2,
      title: "Track Your Journey",
      description: "Monitor your current trip in real-time",
      icon: "Navigation",
      action: "Track Now",
      variant: "outline",
      path: "/live-tracking",
      buttonClass: "border-2 border-blue-800 text-blue-800 hover:bg-blue-800 hover:text-white font-semibold"
    },
    {
      id: 3,
      title: "Modify Booking",
      description: "Change or cancel your existing reservation",
      icon: "Edit",
      action: "Manage Booking",
      variant: "outline",
      path: "/customer-account",
      buttonClass: "border-2 border-emerald-600 text-emerald-700 hover:bg-emerald-600 hover:text-white font-semibold"
    },
    {
      id: 4,
      title: "Report Issue",
      description: "Something went wrong? Let us know immediately",
      icon: "AlertTriangle",
      action: "Report Now",
      variant: "destructive",
      urgent: true,
      buttonClass: "bg-red-600 hover:bg-red-700 text-white font-semibold shadow-sm"
    }
  ];

  const handleAction = (action) => {
    if (action?.path) {
      navigate(action?.path);
    } else if (action?.id === 4) {
      // Report Issue - scroll to support channels
      const el = document.getElementById('support-channels');
      if (el) {
        el?.scrollIntoView({ behavior: 'smooth' });
      } else {
        navigate('/support-center');
      }
    }
  };

  return (
    <section className="py-12 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Need immediate help? Choose from these common actions to get started quickly
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions?.map((action) => (
            <div 
              key={action?.id}
              className={`bg-white rounded-lg p-6 shadow-sm border hover:shadow-md transition-shadow duration-200 ${
                action?.urgent ? 'border-red-200 bg-red-50' : 'border-gray-200'
              }`}
            >
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto mb-4 rounded-full flex items-center justify-center ${
                  action?.urgent 
                    ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-800'
                }`}>
                  <Icon name={action?.icon} size={24} />
                </div>
                
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {action?.title}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4">
                  {action?.description}
                </p>
                
                <button
                  onClick={() => handleAction(action)}
                  className={`w-full py-2 px-4 rounded-md text-sm transition-colors duration-200 cursor-pointer ${action?.buttonClass}`}
                >
                  {action?.action}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default QuickActions;