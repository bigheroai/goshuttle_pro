import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Button from './ui/Button';
import Icon from './AppIcon';
import communicationService from '../services/communicationService';

const InAppMessaging = ({ 
  bookingId, 
  recipientId, 
  recipientName, 
  isOpen, 
  onClose,
  className = "" 
}) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [realtimeChannel, setRealtimeChannel] = useState(null);
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize conversation when component mounts
  useEffect(() => {
    if (isOpen && bookingId && recipientId) {
      initializeConversation();
    }
    
    return () => {
      // Clean up real-time subscription
      if (realtimeChannel) {
        communicationService?.unsubscribeFromConversation(realtimeChannel);
      }
    };
  }, [isOpen, bookingId, recipientId]);

  const initializeConversation = async () => {
    try {
      setLoading(true);
      
      // Get conversation ID
      const convId = await communicationService?.getConversationId(bookingId, recipientId);
      setConversationId(convId);
      
      if (convId) {
        // Load existing messages
        const history = await communicationService?.getConversationHistory(convId);
        setMessages(history || []);
        
        // Mark messages as read
        await communicationService?.markMessagesAsRead(convId);
        
        // Subscribe to real-time updates
        const channel = communicationService?.subscribeToConversation(convId, (newMessage) => {
          setMessages(prev => [...prev, newMessage]);
          // Mark new incoming messages as read if not from current user
          if (newMessage?.sender_id !== user?.id) {
            communicationService?.markMessagesAsRead(convId);
          }
        });
        setRealtimeChannel(channel);
      }
    } catch (error) {
      console.error('Error initializing conversation:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e?.preventDefault();
    
    if (!newMessage?.trim() || sending || !conversationId) return;

    try {
      setSending(true);
      
      await communicationService?.sendInAppMessage(
        bookingId, 
        recipientId, 
        newMessage?.trim()
      );
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    // Less than 1 minute ago
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than 1 hour ago
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m ago`;
    }
    
    // Same day
    if (date?.toDateString() === now?.toDateString()) {
      return date?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    // Different day
    return date?.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const quickReplies = [
    "I\'m on my way",
    "Running 5 minutes late",
    "At the pickup location",
    "Thank you!",
    "Please call me"
  ];

  const handleQuickReply = (reply) => {
    setNewMessage(reply);
  };

  if (!isOpen) return null;

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
            <Icon name="MessageCircle" size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">{recipientName || 'Chat'}</h3>
            <p className="text-sm text-gray-600">
              {realtimeChannel ? 'Connected' : 'Connecting...'}
            </p>
          </div>
        </div>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="h-80 overflow-y-auto p-4 space-y-3 bg-gray-50">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Icon name="Loader2" className="animate-spin mr-2" size={20} />
            <span className="text-sm text-gray-600">Loading conversation...</span>
          </div>
        ) : messages?.length > 0 ? (
          <>
            {messages?.map((msg) => (
              <div
                key={msg?.id}
                className={`flex ${msg?.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg?.sender_id === user?.id
                      ? 'bg-primary text-white' :'bg-white border border-gray-200 text-gray-900'
                  }`}
                >
                  <p className="text-sm">{msg?.message_content}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-xs ${
                      msg?.sender_id === user?.id ? 'text-blue-100' : 'text-gray-500'
                    }`}>
                      {formatMessageTime(msg?.created_at)}
                    </p>
                    {msg?.sender_id === user?.id && (
                      <div className={`ml-2 text-xs ${
                        msg?.message_status === 'read' ? 'text-blue-100' : 'text-blue-200'
                      }`}>
                        <Icon 
                          name={msg?.message_status === 'read' ? 'CheckCheck' : 'Check'} 
                          size={12} 
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        ) : (
          <div className="text-center py-12 text-gray-500">
            <Icon name="MessageSquare" size={32} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">Start your conversation</p>
            <p className="text-xs text-gray-400">Messages are delivered instantly</p>
          </div>
        )}
      </div>

      {/* Quick Replies */}
      <div className="px-4 py-2 border-t border-gray-200 bg-white">
        <div className="flex flex-wrap gap-2">
          {quickReplies?.map((reply, index) => (
            <button
              key={index}
              onClick={() => handleQuickReply(reply)}
              className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
            >
              {reply}
            </button>
          ))}
        </div>
      </div>

      {/* Message Input */}
      <div className="p-4 border-t border-gray-200 bg-white rounded-b-lg">
        <form onSubmit={handleSendMessage} className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e?.target?.value)}
            placeholder="Type your message..."
            disabled={sending || loading}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-sm disabled:opacity-50"
          />
          <Button 
            type="submit"
            size="sm"
            disabled={sending || loading || !newMessage?.trim()}
          >
            {sending ? (
              <Icon name="Loader2" className="animate-spin" size={16} />
            ) : (
              <Icon name="Send" size={16} />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default InAppMessaging;