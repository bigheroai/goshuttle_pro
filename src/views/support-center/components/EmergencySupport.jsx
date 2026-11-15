import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const EmergencySupport = () => {
  const [emergencyType, setEmergencyType] = useState('');

  const emergencyTypes = [
    {
      id: 'safety',
      title: 'Safety Emergency',
      description: 'Immediate safety concerns during your trip',
      icon: 'AlertTriangle',
      color: 'red',
      priority: 'Critical',
      responseTime: 'Immediate'
    },
    {
      id: 'breakdown',
      title: 'Vehicle Breakdown',
      description: 'Vehicle malfunction or breakdown assistance',
      icon: 'Wrench',
      color: 'orange',
      priority: 'High',
      responseTime: '5-10 minutes'
    },
    {
      id: 'medical',
      title: 'Medical Emergency',
      description: 'Medical assistance needed during travel',
      icon: 'Heart',
      color: 'red',
      priority: 'Critical',
      responseTime: 'Immediate'
    },
    {
      id: 'accident',
      title: 'Traffic Accident',
      description: 'Involved in or witnessed a traffic incident',
      icon: 'Car',
      color: 'red',
      priority: 'Critical',
      responseTime: 'Immediate'
    },
    {
      id: 'lost',
      title: 'Lost or Stranded',
      description: 'Unable to locate pickup point or stranded',
      icon: 'MapPin',
      color: 'yellow',
      priority: 'Medium',
      responseTime: '2-5 minutes'
    },
    {
      id: 'other',
      title: 'Other Emergency',
      description: 'Any other urgent situation requiring immediate help',
      icon: 'Phone',
      color: 'blue',
      priority: 'High',
      responseTime: '1-3 minutes'
    }
  ];

  const emergencyContacts = [
    {
      id: 1,
      name: 'Emergency Hotline',
      number: '+63 917 123 4567',
      description: '24/7 Emergency Response Team',
      type: 'primary',
      tel: 'tel:+639171234567'
    },
    {
      id: 2,
      name: 'Safety Dispatch',
      number: '+63 917 123 4568',
      description: 'Direct line to safety coordinators',
      type: 'safety',
      tel: 'tel:+639171234568'
    },
    {
      id: 3,
      name: 'Medical Assistance',
      number: '+63 917 123 4569',
      description: 'Medical emergency coordination',
      type: 'medical',
      tel: 'tel:+639171234569'
    }
  ];

  const getColorClasses = (color, selected = false) => {
    const colors = {
      red: selected ? 'bg-red-600 text-white' : 'border-red-200 hover:border-red-300 text-red-700',
      orange: selected ? 'bg-orange-600 text-white' : 'border-orange-200 hover:border-orange-300 text-orange-700',
      yellow: selected ? 'bg-yellow-600 text-white' : 'border-yellow-200 hover:border-yellow-300 text-yellow-700',
      blue: selected ? 'bg-blue-600 text-white' : 'border-blue-200 hover:border-blue-300 text-blue-700'
    };
    return colors?.[color] || colors?.blue;
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <section className="py-16 bg-red-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
              <Icon name="Phone" size={32} color="white" strokeWidth={2} />
            </div>
          </div>
          
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Emergency Support
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Need immediate assistance? Our 24/7 emergency response team is here to help with any urgent situation
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Emergency Contacts */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 mb-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Icon name="Phone" size={20} className="mr-2 text-red-600" />
                Emergency Contacts
              </h3>
              
              <div className="space-y-4">
                {emergencyContacts?.map((contact) => (
                  <div key={contact?.id} className="border-b border-gray-100 pb-4 last:border-b-0">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-gray-900">
                        {contact?.name}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        contact?.type === 'primary' ? 'bg-red-100 text-red-800' :
                        contact?.type === 'safety'? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {contact?.type}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2">
                      {contact?.description}
                    </p>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      className="text-red-600 border-red-200 hover:bg-red-50"
                      onClick={() => window.open(contact?.tel, '_self')}
                    >
                      <Icon name="Phone" size={16} className="mr-2" />
                      {contact?.number}
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Emergency Actions
              </h3>
              
              <div className="space-y-3">
                <Button
                  variant="destructive"
                  fullWidth
                  size="lg"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={() => window.open('tel:+639171234567', '_self')}
                >
                  <Icon name="AlertTriangle" size={20} className="mr-2" />
                  Report Emergency Now
                </Button>
                
                <Button
                  variant="outline"
                  fullWidth
                  className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  onClick={() => {
                    if (navigator?.geolocation) {
                      navigator.geolocation?.getCurrentPosition(
                        (pos) => alert(`Your location: ${pos?.coords?.latitude?.toFixed(4)}, ${pos?.coords?.longitude?.toFixed(4)}\nShared with emergency team.`),
                        () => alert('Unable to get location. Please share your location manually.')
                      );
                    } else {
                      alert('Geolocation not supported. Please share your location manually with our team.');
                    }
                  }}
                >
                  <Icon name="MapPin" size={20} className="mr-2" />
                  Share My Location
                </Button>
                
                <Button
                  variant="outline"
                  fullWidth
                  className="text-green-600 border-green-200 hover:bg-green-50"
                  onClick={() => window.open('mailto:emergency@goshuttlepro.ph?subject=Emergency%20Chat%20Request', '_self')}
                >
                  <Icon name="MessageSquare" size={20} className="mr-2" />
                  Emergency Chat
                </Button>
              </div>
            </div>
          </div>

          {/* Emergency Types */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">
                Select Emergency Type
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {emergencyTypes?.map((type) => (
                  <div
                    key={type?.id}
                    onClick={() => setEmergencyType(type?.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer smooth-transition ${
                      emergencyType === type?.id
                        ? getColorClasses(type?.color, true)
                        : `bg-white ${getColorClasses(type?.color)}`
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        emergencyType === type?.id
                          ? 'bg-white/20'
                          : `bg-${type?.color}-100`
                      }`}>
                        <Icon 
                          name={type?.icon} 
                          size={20} 
                          className={emergencyType === type?.id ? 'text-white' : `text-${type?.color}-600`}
                        />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">
                            {type?.title}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            emergencyType === type?.id
                              ? 'bg-white/20 text-white'
                              : getPriorityColor(type?.priority)
                          }`}>
                            {type?.priority}
                          </span>
                        </div>
                        
                        <p className={`text-sm mb-2 ${
                          emergencyType === type?.id ? 'text-white/90' : 'text-gray-600'
                        }`}>
                          {type?.description}
                        </p>
                        
                        <div className={`flex items-center text-xs ${
                          emergencyType === type?.id ? 'text-white/80' : 'text-gray-500'
                        }`}>
                          <Icon name="Clock" size={12} className="mr-1" />
                          Response: {type?.responseTime}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {emergencyType && (
                <div className="bg-gray-50 rounded-lg p-6">
                  <h4 className="font-semibold text-gray-900 mb-4">
                    Emergency Response Protocol
                  </h4>
                  
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                        1
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Immediate Contact</p>
                        <p className="text-sm text-gray-600">
                          Call our emergency hotline or use the emergency button below
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                        2
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Location Sharing</p>
                        <p className="text-sm text-gray-600">
                          Share your current location for faster response
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-start space-x-3">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-white text-xs font-bold">
                        3
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Stay Connected</p>
                        <p className="text-sm text-gray-600">
                          Keep your phone available for updates from our response team
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-6 border-t border-gray-200">
                    <Button
                      size="lg"
                      fullWidth
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Icon name="Phone" size={20} className="mr-2" />
                      Call Emergency Support Now
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default EmergencySupport;