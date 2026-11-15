import React, { useState, useRef, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

const LiveChat = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatStatus, setChatStatus] = useState('online');
  const messagesEndRef = useRef(null);

  const initialMessages = [
    {
      id: 1,
      sender: 'agent',
      name: 'Maria Santos',
      message: 'Hello! Welcome to GoShuttle Pro support. How can I help you today?',
      timestamp: new Date(Date.now() - 300000),
      avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_13f6d061c-1762249131875.png",
      avatarAlt: 'Professional headshot of Filipino woman with shoulder-length black hair in white blouse'
    },
    {
      id: 2,
      sender: 'system',
      message: 'You are now connected with Maria Santos, Customer Support Specialist',
      timestamp: new Date(Date.now() - 299000)
    }
  ];

  // Context-aware response templates
  const getContextualResponse = (userMessage) => {
    const msg = userMessage?.toLowerCase()?.trim();

    if (msg?.includes('book') || msg?.includes('reservation') || msg?.includes('schedule')) {
      return 'I can help you with your booking! You can book a ride at our Smart Booking Portal. Would you like me to guide you through the process, or do you have a specific question about an existing booking?';
    }
    if (msg?.includes('track') || msg?.includes('location') || msg?.includes('where') || msg?.includes('driver')) {
      return 'For live trip tracking, please visit the Live Tracking page. You can monitor your driver\'s location in real-time. If your driver hasn\'t arrived, please share your booking reference number and I\'ll check the status for you.';
    }
    if (msg?.includes('cancel') || msg?.includes('refund') || msg?.includes('modify') || msg?.includes('change')) {
      return 'For booking modifications or cancellations, please go to My Account → Trip History and click "Modify" or "Cancel" on your booking. Refunds are processed within 3-5 business days. What is your booking reference number?';
    }
    if (msg?.includes('payment') || msg?.includes('pay') || msg?.includes('gcash') || msg?.includes('credit card') || msg?.includes('charge')) {
      return 'We accept GCash, PayMaya, Credit/Debit Cards, and Cash on Pickup. If you\'re experiencing a payment issue, please share your booking reference number and the error message you received so I can assist you.';
    }
    if (msg?.includes('price') || msg?.includes('cost') || msg?.includes('rate') || msg?.includes('fare') || msg?.includes('how much')) {
      return 'Our rates vary by vehicle type and destination. You can get an instant quote on our booking page by entering your pickup and drop-off locations. Would you like me to help you find the best rate for your route?';
    }
    if (msg?.includes('driver') || msg?.includes('contact') || msg?.includes('call') || msg?.includes('phone')) {
      return 'To contact your assigned driver, go to Live Tracking and use the "Contact Driver" button. For general driver inquiries, you can reach our dispatch at +63 2 8123 4567. Is there a specific concern about your driver?';
    }
    if (msg?.includes('emergency') || msg?.includes('accident') || msg?.includes('unsafe') || msg?.includes('help')) {
      return '🚨 For emergencies, please call our 24/7 Emergency Hotline: +63 917 123 4567 immediately. If you\'re in immediate danger, please call 911 first. Our emergency response team is available around the clock.';
    }
    if (msg?.includes('corporate') || msg?.includes('business') || msg?.includes('company') || msg?.includes('bulk')) {
      return 'We offer comprehensive corporate solutions including bulk bookings, expense reporting, and dedicated account management. Please visit our Corporate Dashboard or email corporate@goshuttlepro.ph for a customized quote.';
    }
    if (msg?.includes('hello') || msg?.includes('hi') || msg?.includes('hey') || msg?.includes('good morning') || msg?.includes('good afternoon')) {
      return 'Hello! Great to hear from you. I\'m here to help with any questions about GoShuttle Pro — bookings, tracking, payments, or anything else. What can I assist you with today?';
    }
    if (msg?.includes('thank') || msg?.includes('thanks') || msg?.includes('great') || msg?.includes('perfect')) {
      return 'You\'re very welcome! Is there anything else I can help you with? We\'re here 24/7 for all your transportation needs.';
    }
    if (msg?.includes('complaint') || msg?.includes('problem') || msg?.includes('issue') || msg?.includes('wrong')) {
      return 'I\'m sorry to hear you\'re experiencing an issue. I want to make this right for you. Could you please describe the problem in detail and share your booking reference number? I\'ll escalate this to our resolution team immediately.';
    }
    if (msg?.includes('route') || msg?.includes('destination') || msg?.includes('baguio') || msg?.includes('naia') || msg?.includes('tagaytay')) {
      return 'We cover a wide range of routes across Metro Manila and nearby provinces including Baguio, NAIA Airport, Tagaytay, and more. You can view all available routes on our Route Network page. Which destination are you interested in?';
    }
    // Default contextual response
    return `Thank you for your message. I understand you're asking about "${userMessage?.substring(0, 50)}${userMessage?.length > 50 ? '...' : ''}". Let me connect you with the right information. Could you provide more details so I can give you the most accurate assistance? Alternatively, you can reach our team at +63 2 8123 4567 or support@goshuttle.com.`;
  };

  useEffect(() => {
    if (isChatOpen && messages?.length === 0) {
      setMessages(initialMessages);
    }
  }, [isChatOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = () => {
    if (!newMessage?.trim()) return;

    const userMessage = {
      id: Date.now(),
      sender: 'user',
      message: newMessage,
      timestamp: new Date()
    };

    const capturedMessage = newMessage;
    setMessages((prev) => [...prev, userMessage]);
    setNewMessage('');
    setIsTyping(true);

    // Context-aware response with slight delay
    setTimeout(() => {
      setIsTyping(false);
      const agentResponse = {
        id: Date.now() + 1,
        sender: 'agent',
        name: 'Maria Santos',
        message: getContextualResponse(capturedMessage),
        timestamp: new Date(),
        avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_13f6d061c-1762249131875.png",
        avatarAlt: 'Professional headshot of Filipino woman with shoulder-length black hair in white blouse'
      };
      setMessages((prev) => [...prev, agentResponse]);
    }, 1500 + Math.random() * 1000);
  };

  const handleKeyPress = (e) => {
    if (e?.key === 'Enter' && !e?.shiftKey) {
      e?.preventDefault();
      handleSendMessage();
    }
  };

  const quickReplies = [
    'I need help with booking',
    'Track my current trip',
    'Payment issue',
    'Cancel reservation',
    'Speak to manager'
  ];

  const getStatusColor = () => {
    switch (chatStatus) {
      case 'online': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'offline': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (chatStatus) {
      case 'online': return 'Online - Average response time: 30 seconds';
      case 'busy': return 'Busy - Average response time: 2-3 minutes';
      case 'offline': return "Offline - We'll respond via email";
      default: return 'Connecting...';
    }
  };

  return (
    <>
      {/* Chat Widget Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsChatOpen(!isChatOpen)}
          aria-label="Open live chat"
          className="w-16 h-16 rounded-full bg-primary hover:bg-primary/90 shadow-lg"
          size="icon"
        >
          <Icon name={isChatOpen ? "X" : "MessageCircle"} size={24} color="white" />
        </Button>
        {!isChatOpen && (
          <div className="absolute -top-2 -left-2">
            <div className={`w-4 h-4 rounded-full ${getStatusColor()} animate-pulse`} />
          </div>
        )}
      </div>

      {/* Chat Window */}
      {isChatOpen && (
        <div className="fixed bottom-24 right-6 w-80 sm:w-96 h-[500px] bg-white rounded-lg shadow-premium border border-gray-200 z-50 flex flex-col">
          {/* Chat Header */}
          <div className="bg-primary text-white p-4 rounded-t-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="relative">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                    <Icon name="Headphones" size={20} />
                  </div>
                  <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${getStatusColor()} border-2 border-white`} />
                </div>
                <div>
                  <h3 className="font-semibold">Live Support</h3>
                  <p className="text-xs text-white/80">{getStatusText()}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsChatOpen(false)} className="text-white hover:bg-white/20">
                <Icon name="Minimize2" size={16} />
              </Button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages?.map((message) => (
              <div key={message?.id}>
                {message?.sender === 'system' ? (
                  <div className="text-center">
                    <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {message?.message}
                    </span>
                  </div>
                ) : (
                  <div className={`flex ${message?.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] ${message?.sender === 'user' ? 'order-2' : 'order-1'}`}>
                      {message?.sender === 'agent' && (
                        <div className="flex items-center space-x-2 mb-1">
                          <img src={message?.avatar} alt={message?.avatarAlt} className="w-6 h-6 rounded-full" />
                          <span className="text-xs text-gray-600 font-medium">{message?.name}</span>
                        </div>
                      )}
                      <div className={`p-3 rounded-lg ${message?.sender === 'user' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-900'}`}>
                        <p className="text-sm">{message?.message}</p>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {message?.timestamp?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 p-3 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          {messages?.length <= 2 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-600 mb-2">Quick replies:</p>
              <div className="flex flex-wrap gap-2">
                {quickReplies?.slice(0, 3)?.map((reply, index) => (
                  <button
                    key={index}
                    onClick={() => setNewMessage(reply)}
                    className="text-xs bg-gray-100 hover:bg-gray-200 px-3 py-1 rounded-full smooth-transition"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message Input */}
          <div className="p-4 border-t border-gray-200">
            <div className="flex space-x-2">
              <Input
                type="text"
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e?.target?.value)}
                onKeyPress={handleKeyPress}
                className="flex-1"
              />
              <Button onClick={handleSendMessage} disabled={!newMessage?.trim()} size="sm">
                <Icon name="Send" size={16} />
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LiveChat;