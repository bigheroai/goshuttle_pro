import React, { useState, useEffect } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import supportService from '../../../services/supportService';

const SupportChannels = ({ onCreateTicket }) => {
  const { user } = useAuth();
  const [selectedFAQ, setSelectedFAQ] = useState(null);
  const [faqItems, setFAQItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Load FAQ items
    const items = supportService?.getFAQItems();
    setFAQItems(items);
  }, []);

  const filteredFAQs = faqItems?.filter(faq =>
    faq?.question?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
    faq?.answer?.toLowerCase()?.includes(searchQuery?.toLowerCase())
  );

  const handleQuickSupport = async (type) => {
    try {
      const ticket = await supportService?.createQuickTicket(type);
      alert(`Support ticket created successfully! Ticket ID: ${ticket?.id?.substring(0, 8)?.toUpperCase()}`);
      
      if (onCreateTicket) {
        onCreateTicket(ticket);
      }
    } catch (error) {
      console.error('Error creating quick ticket:', error);
      alert('Failed to create support ticket. Please try again.');
    }
  };

  const quickSupportOptions = [
    {
      id: 'driver-contact',
      title: 'Cannot Contact Driver',
      description: 'Driver not responding to calls or messages',
      icon: 'UserX',
      priority: 'high'
    },
    {
      id: 'booking-modification',
      title: 'Modify Booking',
      description: 'Change trip details or passenger count',
      icon: 'Edit',
      priority: 'medium'
    },
    {
      id: 'payment-issue',
      title: 'Payment Problem',
      description: 'Issues with payment processing',
      icon: 'CreditCard',
      priority: 'medium'
    },
    {
      id: 'vehicle-issue',
      title: 'Vehicle/Service Issue',
      description: 'Problems with vehicle or service quality',
      icon: 'AlertCircle',
      priority: 'medium'
    }
  ];

  const contactMethods = [
    {
      id: 'phone',
      title: '24/7 Hotline',
      description: 'Call us anytime for immediate assistance',
      value: '+63 2 8123 4567',
      icon: 'Phone',
      action: () => window.open('tel:+6328123456', '_self')
    },
    {
      id: 'email',
      title: 'Email Support',
      description: 'Send us detailed inquiries',
      value: 'support@goshuttle.com',
      icon: 'Mail',
      action: () => window.open('mailto:support@goshuttle.com', '_self')
    },
    {
      id: 'chat',
      title: 'Live Chat',
      description: 'Chat with our support team',
      value: 'Available 6AM - 10PM',
      icon: 'MessageCircle',
      action: () => {
        // Trigger the live chat widget by dispatching a custom event
        const chatBtn = document.querySelector('[aria-label="Open live chat"]') || 
                        document.querySelector('.fixed.bottom-6.right-6 button');
        if (chatBtn) {
          chatBtn?.click();
        } else {
          window.scrollTo({ top: document.body?.scrollHeight, behavior: 'smooth' });
        }
      }
    }
  ];

  return (
    <div className="space-y-8">
      {/* Quick Support Actions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Icon name="Zap" size={24} className="text-orange-500" />
          <h3 className="text-lg font-semibold text-gray-900">Quick Support</h3>
        </div>
        <p className="text-gray-600 mb-6">Get instant help for common issues</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {quickSupportOptions?.map((option) => (
            <div key={option?.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start space-x-3">
                <div className={`p-2 rounded-lg ${
                  option?.priority === 'high' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                }`}>
                  <Icon name={option?.icon} size={20} />
                </div>
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 mb-1">{option?.title}</h4>
                  <p className="text-sm text-gray-600 mb-3">{option?.description}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleQuickSupport(option?.id)}
                    disabled={!user}
                  >
                    Get Help
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Contact Methods */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Icon name="Phone" size={24} className="text-green-500" />
          <h3 className="text-lg font-semibold text-gray-900">Contact Us</h3>
        </div>
        <p className="text-gray-600 mb-6">Multiple ways to reach our support team</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {contactMethods?.map((method) => (
            <div key={method?.id} className="text-center p-6 border border-gray-200 rounded-lg hover:border-primary transition-colors">
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Icon name={method?.icon} size={24} className="text-gray-600" />
              </div>
              <h4 className="font-medium text-gray-900 mb-1">{method?.title}</h4>
              <p className="text-sm text-gray-600 mb-2">{method?.description}</p>
              <p className="text-sm font-medium text-primary mb-3">{method?.value}</p>
              <Button variant="outline" size="sm" onClick={method?.action}>
                Contact Now
              </Button>
            </div>
          ))}
        </div>
      </div>
      {/* FAQ Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <Icon name="HelpCircle" size={24} className="text-blue-500" />
          <h3 className="text-lg font-semibold text-gray-900">Frequently Asked Questions</h3>
        </div>
        
        {/* FAQ Search */}
        <div className="mb-6">
          <div className="relative">
            <Icon name="Search" size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e?.target?.value)}
              placeholder="Search FAQs..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* FAQ Items */}
        <div className="space-y-3">
          {filteredFAQs?.length > 0 ? (
            filteredFAQs?.map((faq) => (
              <div key={faq?.id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => setSelectedFAQ(selectedFAQ === faq?.id ? null : faq?.id)}
                  className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <span className="font-medium text-gray-900">{faq?.question}</span>
                  <Icon 
                    name={selectedFAQ === faq?.id ? 'ChevronUp' : 'ChevronDown'} 
                    size={20} 
                    className="text-gray-400"
                  />
                </button>
                
                {selectedFAQ === faq?.id && (
                  <div className="px-4 pb-4">
                    <div className="border-t border-gray-200 pt-4">
                      <p className="text-gray-600">{faq?.answer}</p>
                    </div>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Icon name="Search" size={48} className="text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No results found</h3>
              <p className="text-gray-600">Try adjusting your search terms or browse all FAQs</p>
            </div>
          )}
        </div>

        {/* Create Ticket CTA */}
        <div className="mt-8 p-6 bg-gray-50 rounded-lg text-center">
          <h4 className="font-medium text-gray-900 mb-2">Still need help?</h4>
          <p className="text-gray-600 mb-4">Can't find what you're looking for? Create a support ticket and our team will assist you.</p>
          <Button onClick={() => onCreateTicket && onCreateTicket()}>
            <Icon name="Plus" size={16} className="mr-2" />
            Create Support Ticket
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SupportChannels;