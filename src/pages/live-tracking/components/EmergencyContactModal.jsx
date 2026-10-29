import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const EmergencyContactModal = ({ isOpen, onClose, currentTrip }) => {
  const [selectedContact, setSelectedContact] = useState(null);

  const emergencyContacts = [
    {
      id: 'police',
      name: 'Philippine National Police',
      number: '117',
      description: 'For immediate police assistance',
      icon: 'Shield',
      color: 'text-blue-600 bg-blue-100'
    },
    {
      id: 'medical',
      name: 'Emergency Medical Services',
      number: '911',
      description: 'For medical emergencies',
      icon: 'Heart',
      color: 'text-red-600 bg-red-100'
    },
    {
      id: 'fire',
      name: 'Bureau of Fire Protection',
      number: '116',
      description: 'For fire emergencies',
      icon: 'Flame',
      color: 'text-orange-600 bg-orange-100'
    },
    {
      id: 'goshuttle',
      name: 'GoShuttle Emergency',
      number: '+63 2 8888 4567',
      description: 'GoShuttle 24/7 emergency support',
      icon: 'Phone',
      color: 'text-primary bg-blue-100'
    }
  ];

  const handleCall = (contact) => {
    // In a real app, this would initiate a phone call
    console.log(`Calling ${contact?.name} at ${contact?.number}`);
    setSelectedContact(contact);
  };

  const handleShareLocation = () => {
    if (currentTrip && navigator.share) {
      navigator.share({
        title: 'Emergency - Share My Location',
        text: `I need help. My current location: ${currentTrip?.currentLocation?.address}`,
        url: `https://maps.google.com/?q=${currentTrip?.currentLocation?.lat},${currentTrip?.currentLocation?.lng}`
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-red-100 rounded-full">
                <Icon name="AlertTriangle" size={24} className="text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Emergency Contacts</h2>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              iconName="X"
            />
          </div>
        </div>

        <div className="p-6">
          {currentTrip && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-start space-x-3">
                <Icon name="MapPin" size={20} className="text-red-600 mt-1" />
                <div>
                  <h3 className="font-medium text-red-900 mb-1">Current Location</h3>
                  <p className="text-sm text-red-700 mb-3">{currentTrip?.currentLocation?.address}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShareLocation}
                    iconName="Share2"
                    iconPosition="left"
                    className="border-red-300 text-red-700 hover:bg-red-100"
                  >
                    Share Location
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {emergencyContacts?.map((contact) => (
              <div
                key={contact?.id}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full ${contact?.color}`}>
                      <Icon name={contact?.icon} size={20} />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{contact?.name}</h4>
                      <p className="text-sm text-gray-600">{contact?.description}</p>
                      <p className="text-sm font-mono text-gray-800 mt-1">{contact?.number}</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCall(contact)}
                    iconName="Phone"
                    className="ml-4"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-3">
              <Icon name="Info" size={20} className="text-amber-600 mt-1" />
              <div>
                <h4 className="font-medium text-amber-900 mb-1">Important Note</h4>
                <p className="text-sm text-amber-700">
                  In case of immediate danger, call 911 or 117 first. GoShuttle support is available for service-related emergencies.
                </p>
              </div>
            </div>
          </div>
        </div>

        {selectedContact && (
          <div className="p-6 border-t border-gray-200 bg-gray-50">
            <div className="text-center">
              <Icon name="Phone" size={24} className="mx-auto text-green-600 mb-2" />
              <p className="text-sm text-gray-600">
                Calling {selectedContact?.name}...
              </p>
              <p className="text-lg font-mono font-bold text-gray-900">
                {selectedContact?.number}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyContactModal;