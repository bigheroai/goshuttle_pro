import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const FeaturedServices = () => {
  const services = [
    {
      id: 1,
      title: "Smart Booking Portal",
      description: "Advanced reservation system with intelligent suggestions, real-time availability, and seamless calendar integration for effortless journey planning.",
      icon: "Calendar",
      color: "blue",
      features: ["Real-time Availability", "Smart Suggestions", "Calendar Sync", "Instant Confirmation"],
      link: "/smart-booking-portal",
      badge: "Most Popular"
    },
    {
      id: 2,
      title: "Live Fleet Tracking",
      description: "Monitor your journey in real-time with GPS tracking, driver communication, and live updates for complete peace of mind throughout your trip.",
      icon: "Navigation",
      color: "emerald",
      features: ["GPS Tracking", "Driver Communication", "Live Updates", "ETA Notifications"],
      link: "/live-tracking",
      badge: "Real-time"
    },
    {
      id: 3,
      title: "Corporate Solutions",
      description: "Comprehensive B2B portal with account management, bulk booking capabilities, expense reporting, and dedicated corporate support services.",
      icon: "Building2",
      color: "purple",
      features: ["Bulk Booking", "Expense Reports", "Account Management", "Priority Support"],
      link: "/corporate-dashboard",
      badge: "Business"
    },
    {
      id: 4,
      title: "Premium Fleet Showcase",
      description: "Explore our diverse vehicle collection with 360° views, detailed specifications, amenity highlights, and capacity information for informed selection.",
      icon: "Car",
      color: "orange",
      features: ["360° Vehicle Views", "Detailed Specs", "Amenity Details", "Capacity Info"],
      link: "/fleet-showcase",
      badge: "Premium"
    },
    {
      id: 5,
      title: "Route Network",
      description: "Interactive coverage map showing all available destinations, popular routes, estimated travel times, and comprehensive route planning tools.",
      icon: "MapPin",
      color: "red",
      features: ["Interactive Maps", "Route Planning", "Travel Times", "Coverage Areas"],
      link: "/route-network",
      badge: "Comprehensive"
    },
    {
      id: 6,
      title: "24/7 Support Center",
      description: "Multi-channel customer support with live chat, comprehensive knowledge base, emergency contacts, and dedicated assistance for all your needs.",
      icon: "HelpCircle",
      color: "indigo",
      features: ["Live Chat", "Knowledge Base", "Emergency Support", "Multi-channel Help"],
      link: "/support-center",
      badge: "24/7 Available"
    }
  ];

  const getColorClasses = (color) => {
    const colorMap = {
      blue: {
        bg: "bg-blue-50",
        icon: "bg-blue-500",
        text: "text-blue-600",
        badge: "bg-blue-100 text-blue-700"
      },
      emerald: {
        bg: "bg-emerald-50",
        icon: "bg-emerald-500",
        text: "text-emerald-600",
        badge: "bg-emerald-100 text-emerald-700"
      },
      purple: {
        bg: "bg-purple-50",
        icon: "bg-purple-500",
        text: "text-purple-600",
        badge: "bg-purple-100 text-purple-700"
      },
      orange: {
        bg: "bg-orange-50",
        icon: "bg-orange-500",
        text: "text-orange-600",
        badge: "bg-orange-100 text-orange-700"
      },
      red: {
        bg: "bg-red-50",
        icon: "bg-red-500",
        text: "text-red-600",
        badge: "bg-red-100 text-red-700"
      },
      indigo: {
        bg: "bg-indigo-50",
        icon: "bg-indigo-500",
        text: "text-indigo-600",
        badge: "bg-indigo-100 text-indigo-700"
      }
    };
    return colorMap?.[color] || colorMap?.blue;
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
            <Icon name="Zap" size={16} />
            <span>Premium Services</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Complete Transportation Solutions
          </h2>
          
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            From intelligent booking systems to real-time tracking, our comprehensive suite of services ensures your journey is seamless, safe, and stress-free every step of the way.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services?.map((service) => {
            const colors = getColorClasses(service?.color);
            
            return (
              <div key={service?.id} className="group relative bg-white rounded-2xl shadow-lg border border-gray-200 hover:shadow-xl smooth-transition overflow-hidden">
                {/* Service Badge */}
                <div className="absolute top-4 right-4 z-10">
                  <span className={`${colors?.badge} px-3 py-1 rounded-full text-xs font-semibold`}>
                    {service?.badge}
                  </span>
                </div>
                <div className="p-8">
                  {/* Icon */}
                  <div className={`${colors?.bg} w-16 h-16 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 smooth-transition`}>
                    <div className={`${colors?.icon} w-10 h-10 rounded-lg flex items-center justify-center`}>
                      <Icon name={service?.icon} size={24} className="text-white" />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-4">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary smooth-transition">
                      {service?.title}
                    </h3>
                    
                    <p className="text-gray-600 leading-relaxed">
                      {service?.description}
                    </p>

                    {/* Features List */}
                    <div className="space-y-2">
                      {service?.features?.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-3">
                          <div className={`w-1.5 h-1.5 ${colors?.icon} rounded-full`}></div>
                          <span className="text-sm text-gray-700 font-medium">{feature}</span>
                        </div>
                      ))}
                    </div>

                    {/* Action Button */}
                    <div className="pt-4">
                      <Link to={service?.link}>
                        <Button 
                          fullWidth
                          variant="outline"
                          className={`border-gray-300 text-gray-700 hover:border-primary hover:text-primary hover:bg-primary/5 group-hover:border-primary group-hover:text-primary`}
                          iconName="ArrowRight"
                          iconPosition="right"
                        >
                          Explore Service
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
                {/* Hover Effect Overlay */}
                <div className={`absolute inset-0 ${colors?.bg} opacity-0 group-hover:opacity-5 smooth-transition pointer-events-none`}></div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA Section */}
        <div className="mt-16 text-center bg-gradient-to-r from-primary to-blue-700 rounded-2xl p-8 text-white">
          <div className="max-w-2xl mx-auto space-y-4">
            <h3 className="text-2xl font-bold">
              Ready to Experience Premium Transportation?
            </h3>
            <p className="text-blue-100">
              Join thousands of satisfied customers who trust GoShuttle Pro for their transportation needs. Book your first journey today and discover the difference.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/smart-booking-portal">
                <Button 
                  size="lg"
                  className="bg-white text-primary hover:bg-gray-100"
                  iconName="Calendar"
                  iconPosition="left"
                >
                  Start Booking
                </Button>
              </Link>
              <Link to="/fleet-showcase">
                <Button 
                  size="lg"
                  variant="outline"
                  className="border-white text-white hover:bg-white hover:text-primary"
                  iconName="Car"
                  iconPosition="left"
                >
                  View Fleet
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeaturedServices;