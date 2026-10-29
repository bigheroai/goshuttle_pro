import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import cmsService from '../../../services/cmsService';

const Footer = () => {
  const currentYear = new Date()?.getFullYear();
  const [subscribeEmail, setSubscribeEmail] = useState('');
  const [subscribeStatus, setSubscribeStatus] = useState(''); // 'success' | 'error' | ''
  const [subscribeLoading, setSubscribeLoading] = useState(false);
  const [cmsLinks, setCmsLinks] = useState({ company: [], legal: [] });

  useEffect(() => {
    const loadCmsLinks = async () => {
      try {
        const grouped = await cmsService?.getAllPublishedPagesGrouped();
        setCmsLinks({
          company: grouped?.company || [],
          legal: grouped?.legal || [],
        });
      } catch {
        // fallback to empty — static links remain for quick/services
      }
    };
    loadCmsLinks();
  }, []);

  const handleSubscribe = async (e) => {
    e?.preventDefault();
    if (!subscribeEmail?.trim()) {
      setSubscribeStatus('error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRegex?.test(subscribeEmail?.trim())) {
      setSubscribeStatus('error');
      return;
    }
    setSubscribeLoading(true);
    // Simulate subscription (replace with actual API call if needed)
    await new Promise(resolve => setTimeout(resolve, 800));
    setSubscribeLoading(false);
    setSubscribeStatus('success');
    setSubscribeEmail('');
    setTimeout(() => setSubscribeStatus(''), 5000);
  };

  const quickLinks = [
    { name: 'Book Now', path: '/smart-booking-portal' },
    { name: 'Fleet Showcase', path: '/fleet-showcase' },
    { name: 'Route Network', path: '/route-network' },
    { name: 'Live Tracking', path: '/live-tracking' },
    { name: 'How It Works', path: '/how-it-works' }
  ];

  const services = [
    { name: 'Corporate Solutions', path: '/corporate-dashboard' },
    { name: 'Customer Account', path: '/customer-account' },
    { name: 'Support Center', path: '/support-center' },
    { name: 'Airport Transfers', path: '/smart-booking-portal' }
  ];

  // Company and Legal links are dynamically loaded from CMS (published pages only)
  const company = cmsLinks?.company?.length > 0
    ? cmsLinks?.company
    : [
        { name: 'About Us', path: '/pages/about-us' },
        { name: 'Safety Standards', path: '/pages/safety-standards' },
        { name: 'Careers', path: '/pages/careers' },
        { name: 'Press & Media', path: '/pages/press-media' },
      ];

  const legal = cmsLinks?.legal?.length > 0
    ? cmsLinks?.legal
    : [
        { name: 'Terms of Service', path: '/pages/terms-of-service' },
        { name: 'Privacy Policy', path: '/pages/privacy-policy' },
        { name: 'Refund Policy', path: '/pages/refund-policy' },
        { name: 'Cookie Policy', path: '/pages/cookie-policy' },
      ];

  const socialLinks = [
    { name: 'Facebook', icon: 'Facebook', url: 'https://facebook.com/goshuttlepro' },
    { name: 'Twitter', icon: 'Twitter', url: 'https://twitter.com/goshuttlepro' },
    { name: 'Instagram', icon: 'Instagram', url: 'https://instagram.com/goshuttlepro' },
    { name: 'LinkedIn', icon: 'Linkedin', url: 'https://linkedin.com/company/goshuttlepro' }
  ];

  const contactInfo = [
    { icon: 'Phone', label: 'Call Us', value: '+63 2 8123 4567', action: 'tel:+6328123456' },
    { icon: 'Mail', label: 'Email Us', value: 'info@goshuttlepro.ph', action: 'mailto:info@goshuttlepro.ph' },
    { icon: 'MapPin', label: 'Visit Us', value: 'Makati City, Metro Manila', action: null },
    { icon: 'Clock', label: 'Available', value: '24/7 Customer Support', action: null }
  ];

  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Company Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Logo — links to root, not /homepage */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-operational-gradient rounded-lg flex items-center justify-center">
                <Icon name="Zap" size={28} color="white" strokeWidth={2.5} />
              </div>
              <div className="flex flex-col">
                <span className="text-2xl font-bold text-white tracking-tight">GoShuttle</span>
                <span className="text-sm font-medium text-blue-300 -mt-1">Pro</span>
              </div>
            </Link>

            <p className="text-gray-300 leading-relaxed">
              Premium shuttle and van booking platform delivering seamless, technology-driven ground transportation with real-time tracking and professional service.
            </p>

            <div className="space-y-3">
              {contactInfo?.map((contact, index) => (
                <div key={index} className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Icon name={contact?.icon} size={16} className="text-blue-400" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{contact?.label}</div>
                    {contact?.action ? (
                      <a href={contact?.action} className="text-sm text-white hover:text-blue-400 smooth-transition">
                        {contact?.value}
                      </a>
                    ) : (
                      <div className="text-sm text-white">{contact?.value}</div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-4">
              {socialLinks?.map((social) => (
                <a
                  key={social?.name}
                  href={social?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-primary smooth-transition group"
                >
                  <Icon name={social?.icon} size={18} className="text-gray-400 group-hover:text-white smooth-transition" />
                </a>
              ))}
            </div>
          </div>

          {/* Navigation Links */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            <div>
              <h4 className="font-semibold text-white mb-4">Quick Links</h4>
              <ul className="space-y-3">
                {quickLinks?.map((link) => (
                  <li key={link?.name}>
                    <Link to={link?.path} className="text-gray-300 hover:text-white smooth-transition text-sm">
                      {link?.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Services</h4>
              <ul className="space-y-3">
                {services?.map((service) => (
                  <li key={service?.name}>
                    <Link to={service?.path} className="text-gray-300 hover:text-white smooth-transition text-sm">
                      {service?.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-3">
                {company?.map((item) => (
                  <li key={item?.name}>
                    <Link to={item?.path} className="text-gray-300 hover:text-white smooth-transition text-sm">
                      {item?.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-3">
                {legal?.map((item) => (
                  <li key={item?.name}>
                    <Link to={item?.path} className="text-gray-300 hover:text-white smooth-transition text-sm">
                      {item?.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="max-w-2xl mx-auto text-center space-y-4">
            <h4 className="text-xl font-semibold text-white">Stay Updated</h4>
            <p className="text-gray-300">
              Get the latest updates on routes, promotions, and travel tips delivered to your inbox.
            </p>

            {subscribeStatus === 'success' && (
              <div className="flex items-center justify-center space-x-2 bg-green-900/40 border border-green-700 rounded-lg px-4 py-3">
                <Icon name="CheckCircle" size={18} className="text-green-400" />
                <span className="text-green-300 text-sm font-medium">You're subscribed! Thank you for joining.</span>
              </div>
            )}

            {subscribeStatus === 'error' && (
              <div className="flex items-center justify-center space-x-2 bg-red-900/40 border border-red-700 rounded-lg px-4 py-3">
                <Icon name="AlertCircle" size={18} className="text-red-400" />
                <span className="text-red-300 text-sm">Please enter a valid email address.</span>
              </div>
            )}

            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <div className="flex-1">
                <input
                  type="email"
                  value={subscribeEmail}
                  onChange={(e) => setSubscribeEmail(e?.target?.value)}
                  placeholder="Enter your email address"
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={subscribeLoading}
                className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:opacity-60 text-white font-semibold rounded-lg smooth-transition flex items-center justify-center space-x-2"
              >
                {subscribeLoading ? (
                  <Icon name="Loader2" size={16} className="animate-spin" />
                ) : (
                  <Icon name="Send" size={16} />
                )}
                <span>{subscribeLoading ? 'Subscribing...' : 'Subscribe'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between space-y-4 lg:space-y-0">
            <div className="text-sm text-gray-400">
              © {currentYear} GoShuttle Pro. All rights reserved. | Licensed by DOTr &amp; LTFRB
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Icon name="Shield" size={16} className="text-emerald-400" />
                <span>SSL Secured</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <Icon name="Award" size={16} className="text-blue-400" />
                <span>LTFRB Accredited</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;