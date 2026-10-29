import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const handleCallOffice = (phone) => {
  const cleaned = phone?.replace(/\s/g, '')?.replace(/-/g, '');
  window.open(`tel:${cleaned}`, '_self');
};

const handleGetDirections = (coordinates) => {
  window.open(`https://www.google.com/maps/search/?api=1&query=${coordinates}`, '_blank');
};

const ContactInfo = () => {
  const contactMethods = [
    {
      id: 1,
      title: 'Customer Service',
      description: 'General inquiries and booking assistance',
      icon: 'Headphones',
      details: [
        { label: 'Phone', value: '+63 917 123 4567', icon: 'Phone' },
        { label: 'Email', value: 'support@goshuttle.ph', icon: 'Mail' },
        { label: 'Hours', value: '6:00 AM - 10:00 PM (PHT)', icon: 'Clock' }
      ],
      availability: 'online'
    },
    {
      id: 2,
      title: 'Corporate Sales',
      description: 'Business accounts and enterprise solutions',
      icon: 'Building2',
      details: [
        { label: 'Phone', value: '+63 917 123 4570', icon: 'Phone' },
        { label: 'Email', value: 'corporate@goshuttle.ph', icon: 'Mail' },
        { label: 'Hours', value: '8:00 AM - 6:00 PM (PHT)', icon: 'Clock' }
      ],
      availability: 'available'
    },
    {
      id: 3,
      title: 'Technical Support',
      description: 'App issues and technical assistance',
      icon: 'Settings',
      details: [
        { label: 'Phone', value: '+63 917 123 4571', icon: 'Phone' },
        { label: 'Email', value: 'tech@goshuttle.ph', icon: 'Mail' },
        { label: 'Hours', value: '24/7 Online Support', icon: 'Clock' }
      ],
      availability: 'online'
    },
    {
      id: 4,
      title: 'Billing & Payments',
      description: 'Payment issues and billing inquiries',
      icon: 'CreditCard',
      details: [
        { label: 'Phone', value: '+63 917 123 4572', icon: 'Phone' },
        { label: 'Email', value: 'billing@goshuttle.ph', icon: 'Mail' },
        { label: 'Hours', value: '7:00 AM - 9:00 PM (PHT)', icon: 'Clock' }
      ],
      availability: 'available'
    }
  ];

  const officeLocations = [
    {
      id: 1,
      name: 'Manila Head Office',
      address: '1234 Ayala Avenue, Makati City, Metro Manila 1226',
      phone: '+63 2 8123 4567',
      hours: 'Monday - Friday: 8:00 AM - 6:00 PM',
      coordinates: '14.5547,121.0244'
    },
    {
      id: 2,
      name: 'Cebu Branch Office',
      address: '5678 IT Park, Lahug, Cebu City, Cebu 6000',
      phone: '+63 32 123 4567',
      hours: 'Monday - Friday: 8:00 AM - 6:00 PM',
      coordinates: '10.3157,123.8854'
    },
    {
      id: 3,
      name: 'Davao Service Center',
      address: '9012 J.P. Laurel Avenue, Bajada, Davao City 8000',
      phone: '+63 82 123 4567',
      hours: 'Monday - Friday: 8:00 AM - 6:00 PM',
      coordinates: '7.0731,125.6128'
    }
  ];

  const socialChannels = [
    { name: 'Facebook', icon: 'Facebook', handle: '@GoShuttlePro', followers: '25.2K' },
    { name: 'Twitter', icon: 'Twitter', handle: '@GoShuttlePH', followers: '12.8K' },
    { name: 'Instagram', icon: 'Instagram', handle: '@goshuttlepro', followers: '18.5K' },
    { name: 'LinkedIn', icon: 'Linkedin', handle: 'GoShuttle Pro Philippines', followers: '8.9K' }
  ];

  const getAvailabilityStatus = (availability) => {
    switch (availability) {
      case 'online':
        return { color: 'bg-green-500', text: 'Online Now', textColor: 'text-green-600' };
      case 'available':
        return { color: 'bg-blue-500', text: 'Available', textColor: 'text-blue-600' };
      case 'busy':
        return { color: 'bg-yellow-500', text: 'Busy', textColor: 'text-yellow-600' };
      default:
        return { color: 'bg-gray-500', text: 'Offline', textColor: 'text-gray-600' };
    }
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Get in Touch
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Multiple ways to reach us for any questions, concerns, or feedback about our services
          </p>
        </div>

        {/* Contact Methods */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {contactMethods?.map((method) => {
            const status = getAvailabilityStatus(method?.availability);
            
            return (
              <div
                key={method?.id}
                className="bg-gray-50 rounded-lg p-6 hover:shadow-md smooth-transition"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                    <Icon name={method?.icon} size={24} color="white" />
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${status?.color}`} />
                    <span className={`text-xs font-medium ${status?.textColor}`}>
                      {status?.text}
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {method?.title}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {method?.description}
                </p>
                <div className="space-y-2">
                  {method?.details?.map((detail, index) => (
                    <div key={index} className="flex items-center text-sm">
                      <Icon name={detail?.icon} size={14} className="text-gray-400 mr-2" />
                      <span className="text-gray-700">{detail?.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Office Locations */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Office Locations
            </h3>
            
            <div className="space-y-6">
              {officeLocations?.map((office) => (
                <div
                  key={office?.id}
                  className="bg-gray-50 rounded-lg p-6"
                >
                  <h4 className="text-lg font-semibold text-gray-900 mb-3">
                    {office?.name}
                  </h4>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex items-start">
                      <Icon name="MapPin" size={16} className="text-gray-400 mr-2 mt-0.5" />
                      <span className="text-gray-700 text-sm">{office?.address}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Icon name="Phone" size={16} className="text-gray-400 mr-2" />
                      <span className="text-gray-700 text-sm">{office?.phone}</span>
                    </div>
                    
                    <div className="flex items-center">
                      <Icon name="Clock" size={16} className="text-gray-400 mr-2" />
                      <span className="text-gray-700 text-sm">{office?.hours}</span>
                    </div>
                  </div>
                  
                  <div className="flex space-x-3">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleGetDirections(office?.coordinates)}>
                      <Icon name="Navigation" size={16} className="mr-2" />
                      Get Directions
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleCallOffice(office?.phone)}>
                      <Icon name="Phone" size={16} className="mr-2" />
                      Call Office
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Social Media & Additional Info */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 mb-6">
              Connect With Us
            </h3>
            
            {/* Social Media */}
            <div className="bg-gray-50 rounded-lg p-6 mb-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Social Media
              </h4>
              
              <div className="grid grid-cols-2 gap-4">
                {socialChannels?.map((channel, index) => (
                  <div
                    key={index}
                    className="bg-white rounded-lg p-4 hover:shadow-sm smooth-transition cursor-pointer"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                        <Icon name={channel?.icon} size={16} color="white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">
                          {channel?.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {channel?.followers} followers
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">
                      {channel?.handle}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-gray-50 rounded-lg p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-4">
                Additional Information
              </h4>
              
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Icon name="Globe" size={20} className="text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Website</p>
                    <p className="text-sm text-gray-600">www.goshuttle.ph</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Icon name="FileText" size={20} className="text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">Business Registration</p>
                    <p className="text-sm text-gray-600">SEC Registration No: CS201234567</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Icon name="Shield" size={20} className="text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">DOTr Accreditation</p>
                    <p className="text-sm text-gray-600">License No: LTFRB-2024-001234</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <Icon name="Award" size={20} className="text-primary mt-0.5" />
                  <div>
                    <p className="font-medium text-gray-900">ISO Certification</p>
                    <p className="text-sm text-gray-600">ISO 9001:2015 Quality Management</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactInfo;