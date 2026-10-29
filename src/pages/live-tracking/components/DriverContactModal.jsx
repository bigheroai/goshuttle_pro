import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import communicationService from '../../../services/communicationService';
import { supabase } from '../../../lib/supabase';

const DriverContactModal = ({ isOpen, onClose, currentTrip, driverData }) => {
  const { user } = useAuth();
  const [contactMethod, setContactMethod] = useState('in_app');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [realtimeChannel, setRealtimeChannel] = useState(null);

  // Load conversation when modal opens
  useEffect(() => {
    if (isOpen && currentTrip?.id && driverData) {
      loadConversation();
    }
    return () => {
      // Clean up real-time subscription
      if (realtimeChannel) {
        communicationService?.unsubscribeFromConversation(realtimeChannel);
      }
    };
  }, [isOpen, currentTrip, driverData]);

  const loadConversation = async () => {
    try {
      setLoadingHistory(true);
      
      // Get driver user ID
      const { data: driverAssignment } = await supabase?.from('driver_assignments')?.select(`
          driver:driver_profiles(user_id)
        `)?.eq('booking_id', currentTrip?.id)?.eq('assignment_status', 'confirmed')?.single();

      if (!driverAssignment?.driver?.user_id) {
        console.error('Driver user ID not found');
        return;
      }

      const driverUserId = driverAssignment?.driver?.user_id;
      
      // Get conversation ID
      const convId = await communicationService?.getConversationId(currentTrip?.id, driverUserId);
      setConversationId(convId);
      
      if (convId) {
        // Load existing messages
        const history = await communicationService?.getConversationHistory(convId);
        setMessages(history);
        
        // Mark messages as read
        await communicationService?.markMessagesAsRead(convId);
        
        // Subscribe to real-time updates
        const channel = communicationService?.subscribeToConversation(convId, (newMessage) => {
          setMessages(prev => [...prev, newMessage]);
          // Mark new incoming messages as read
          if (newMessage?.sender_id !== user?.id) {
            communicationService?.markMessagesAsRead(convId);
          }
        });
        setRealtimeChannel(channel);
      }
    } catch (error) {
      console.error('Error loading conversation:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendMessage = async () => {
    if (!message?.trim() || !driverData || !conversationId) return;

    try {
      setSending(true);
      
      if (contactMethod === 'call') {
        await communicationService?.contactDriver(currentTrip, message, 'call');
        alert('Call initiated successfully!');
      } else if (contactMethod === 'sms') {
        await communicationService?.contactDriver(currentTrip, message, 'sms');
        alert('SMS sent successfully!');
      } else {
        // In-app messaging
        await communicationService?.contactDriver(currentTrip, message, 'in_app');
        // Message will appear via real-time subscription
      }
      
      setMessage('');
    } catch (error) {
      console.error('Error contacting driver:', error);
      alert(`Failed to ${contactMethod === 'call' ? 'call' : contactMethod === 'sms' ? 'send SMS to' : 'message'} driver: ${error?.message}`);
    } finally {
      setSending(false);
    }
  };

  const handleQuickMessage = (quickMessage) => {
    setMessage(quickMessage);
  };

  const quickMessages = [
    "I\'m running 5 minutes late",
    "I\'m at the pickup location",
    "Please call me when you arrive",
    "Where are you currently located?",
    "Thank you for the smooth ride!"
  ];

  const formatMessageTime = (timestamp) => {
    return new Date(timestamp)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Icon name="MessageCircle" size={24} className="text-primary" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Contact Driver</h3>
              <p className="text-sm text-gray-600">{driverData?.name}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Driver Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex items-center space-x-3">
              <img
                src={driverData?.photo || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d"}
                alt={driverData?.photoAlt || "Driver photo"}
                className="w-12 h-12 rounded-full object-cover"
              />
              <div>
                <h4 className="font-medium text-gray-900">{driverData?.name}</h4>
                <div className="flex items-center space-x-2 text-sm text-gray-600">
                  <Icon name="Star" size={16} className="text-yellow-400 fill-current" />
                  <span>{driverData?.rating}</span>
                  <span>•</span>
                  <span>{driverData?.totalTrips} trips</span>
                </div>
              </div>
            </div>
          </div>

          {/* Contact Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contact Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setContactMethod('in_app')}
                className={`flex items-center justify-center space-x-1 p-2 rounded-lg border-2 transition-colors text-sm ${
                  contactMethod === 'in_app' ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon name="MessageSquare" size={16} />
                <span>Chat</span>
              </button>
              <button
                onClick={() => setContactMethod('sms')}
                className={`flex items-center justify-center space-x-1 p-2 rounded-lg border-2 transition-colors text-sm ${
                  contactMethod === 'sms' ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon name="MessageCircle" size={16} />
                <span>SMS</span>
              </button>
              <button
                onClick={() => setContactMethod('call')}
                className={`flex items-center justify-center space-x-1 p-2 rounded-lg border-2 transition-colors text-sm ${
                  contactMethod === 'call' ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon name="Phone" size={16} />
                <span>Call</span>
              </button>
            </div>
          </div>

          {/* In-App Chat Interface */}
          {contactMethod === 'in_app' && (
            <div className="border border-gray-200 rounded-lg">
              {/* Messages */}
              <div className="h-64 overflow-y-auto p-4 space-y-3 bg-gray-50">
                {loadingHistory ? (
                  <div className="flex items-center justify-center py-8">
                    <Icon name="Loader2" className="animate-spin" size={20} />
                    <span className="ml-2 text-sm text-gray-600">Loading conversation...</span>
                  </div>
                ) : messages?.length > 0 ? (
                  messages?.map((msg) => (
                    <div
                      key={msg?.id}
                      className={`flex ${msg?.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-3 py-2 rounded-lg ${
                          msg?.sender_id === user?.id
                            ? 'bg-primary text-white' :'bg-white border border-gray-200'
                        }`}
                      >
                        <p className="text-sm">{msg?.message_content}</p>
                        <p className={`text-xs mt-1 ${
                          msg?.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                        }`}>
                          {formatMessageTime(msg?.created_at)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Icon name="MessageCircle" size={32} className="mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Start a conversation with your driver</p>
                  </div>
                )}
              </div>
              
              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e?.target?.value)}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                    onKeyPress={(e) => e?.key === 'Enter' && handleSendMessage()}
                  />
                  <Button 
                    onClick={handleSendMessage} 
                    size="sm"
                    disabled={sending || !message?.trim()}
                  >
                    {sending ? <Icon name="Loader2" className="animate-spin" size={16} /> : <Icon name="Send" size={16} />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* SMS/Call Interface */}
          {(contactMethod === 'sms' || contactMethod === 'call') && (
            <>
              {/* Quick Messages */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Messages
                </label>
                <div className="space-y-2">
                  {quickMessages?.map((msg, index) => (
                    <button
                      key={index}
                      onClick={() => handleQuickMessage(msg)}
                      className="w-full text-left p-3 text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      {msg}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Message */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {contactMethod === 'call' ? 'Call Reason' : 'Custom Message'}
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e?.target?.value)}
                  placeholder={contactMethod === 'call' ? 'Brief reason for calling...' : 'Type your message...'}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                  rows={3}
                />
              </div>

              {contactMethod === 'call' && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-blue-800 mb-2">
                    <Icon name="Info" size={20} />
                    <span className="font-medium">Direct Call</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    This will open your phone's dialer to call the driver directly. 
                    The call will be logged for your safety and security.
                  </p>
                </div>
              )}

              {contactMethod === 'sms' && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <div className="flex items-center space-x-2 text-orange-800 mb-2">
                    <Icon name="AlertTriangle" size={20} />
                    <span className="font-medium">SMS Charges Apply</span>
                  </div>
                  <p className="text-sm text-orange-700">
                    SMS messages may incur charges. Consider using the free in-app chat for regular communication.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <Button variant="outline" onClick={onClose} disabled={sending}>
            Cancel
          </Button>
          {contactMethod !== 'in_app' && (
            <Button 
              onClick={handleSendMessage} 
              disabled={sending || (contactMethod !== 'call' && !message?.trim())}
            >
              {sending && <Icon name="Loader2" className="animate-spin mr-2" size={16} />}
              {contactMethod === 'call' ? 'Call Driver' : 'Send SMS'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default DriverContactModal;