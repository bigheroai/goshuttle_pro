import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const TrustSignals = () => {
  const certifications = [
  {
    id: 1,
    name: "DOTr Certified",
    description: "Department of Transportation Registered",
    icon: "Shield",
    badge: "https://img.rocket.new/generatedImages/rocket_gen_img_1035991d3-1762765314509.png",
    badgeAlt: "Official Department of Transportation certification badge with blue and gold seal",
    status: "Active",
    validUntil: "2025-12-31"
  },
  {
    id: 2,
    name: "LTFRB Licensed",
    description: "Land Transportation Franchising Board",
    icon: "FileCheck",
    badge: "https://images.unsplash.com/photo-1616101001234-7320af4f1aa7",
    badgeAlt: "LTFRB official license certificate with government seal and validation stamps",
    status: "Verified",
    validUntil: "2025-08-15"
  },
  {
    id: 3,
    name: "ISO 9001:2015",
    description: "Quality Management System",
    icon: "Award",
    badge: "https://img.rocket.new/generatedImages/rocket_gen_img_1ca7069ef-1762765315141.png",
    badgeAlt: "ISO 9001 quality management certification with international standards logo",
    status: "Certified",
    validUntil: "2026-03-20"
  },
  {
    id: 4,
    name: "Insurance Coverage",
    description: "Comprehensive Passenger Protection",
    icon: "Umbrella",
    badge: "https://images.unsplash.com/photo-1734809085415-3e502f241ffc",
    badgeAlt: "Insurance policy document with coverage details and company seal",
    status: "Active",
    validUntil: "2025-06-30"
  }];


  const partnerships = [
  {
    id: 1,
    name: "Manila Hotel",
    logo: "https://images.unsplash.com/photo-1714345543112-6a8b2706bdf1",
    logoAlt: "Luxury hotel building with elegant architecture and grand entrance",
    type: "Hospitality Partner",
    description: "Preferred transportation provider"
  },
  {
    id: 2,
    name: "NAIA Terminal",
    logo: "https://images.unsplash.com/photo-1670541606604-edc4b2002213",
    logoAlt: "Modern airport terminal building with glass facade and control tower",
    type: "Airport Partner",
    description: "Official shuttle service provider"
  },
  {
    id: 3,
    name: "SM Malls",
    logo: "https://images.unsplash.com/photo-1501232248039-fa886f02317f",
    logoAlt: "Large modern shopping mall with multiple levels and glass storefront",
    type: "Retail Partner",
    description: "Shopping center transportation"
  },
  {
    id: 4,
    name: "Ayala Corporation",
    logo: "https://images.unsplash.com/photo-1631856623216-d1fcecbf5b45",
    logoAlt: "Corporate office building with modern glass and steel architecture",
    type: "Corporate Client",
    description: "Executive transportation services"
  },
  {
    id: 5,
    name: "Resorts World",
    logo: "https://images.unsplash.com/photo-1638937918304-43f784065caf",
    logoAlt: "Luxury resort complex with tropical landscaping and modern facilities",
    type: "Entertainment Partner",
    description: "Guest transportation services"
  },
  {
    id: 6,
    name: "BPO Alliance",
    logo: "https://images.unsplash.com/photo-1698311427676-9495b8dc7244",
    logoAlt: "Modern office building with IT company logos and professional workspace",
    type: "Business Partner",
    description: "Employee shuttle services"
  }];


  const performanceMetrics = [
  {
    id: 1,
    metric: "On-Time Performance",
    value: "98.5%",
    icon: "Clock",
    color: "emerald",
    description: "Punctuality rate for all scheduled trips"
  },
  {
    id: 2,
    metric: "Safety Record",
    value: "99.9%",
    icon: "Shield",
    color: "blue",
    description: "Incident-free journey completion rate"
  },
  {
    id: 3,
    metric: "Customer Satisfaction",
    value: "4.9/5",
    icon: "Star",
    color: "yellow",
    description: "Average rating from customer reviews"
  },
  {
    id: 4,
    metric: "Fleet Reliability",
    value: "97.2%",
    icon: "Truck",
    color: "purple",
    description: "Vehicle availability and maintenance rate"
  }];


  const awards = [
  {
    id: 1,
    title: "Best Transportation Service 2024",
    organization: "Philippine Tourism Awards",
    year: "2024",
    icon: "Trophy"
  },
  {
    id: 2,
    title: "Excellence in Customer Service",
    organization: "Business Excellence Awards",
    year: "2024",
    icon: "Medal"
  },
  {
    id: 3,
    title: "Sustainable Transportation Leader",
    organization: "Green Business Council",
    year: "2023",
    icon: "Leaf"
  },
  {
    id: 4,
    title: "Innovation in Fleet Management",
    organization: "Transport Technology Awards",
    year: "2023",
    icon: "Zap"
  }];


  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
            <Icon name="ShieldCheck" size={16} />
            <span>Trust & Safety</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Licensed, Certified & Trusted
          </h2>
          
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Your safety and satisfaction are our top priorities. We maintain the highest standards through comprehensive certifications, strategic partnerships, and transparent performance metrics.
          </p>
        </div>

        {/* Certifications & Licenses */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Official Certifications & Licenses
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {certifications?.map((cert) =>
            <div key={cert?.id} className="bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl smooth-transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                    <Icon name={cert?.icon} size={24} className="text-emerald-600" />
                  </div>
                  {/* CLS fix: explicit width/height + aspect-ratio on badge images */}
                  <div className="w-16 h-10 overflow-hidden rounded" style={{ aspectRatio: '16/10' }}>
                    <Image
                      src={cert?.badge}
                      alt={cert?.badgeAlt}
                      width={64}
                      height={40}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                
                <h4 className="font-bold text-gray-900 mb-2">{cert?.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{cert?.description}</p>
                
                <div className="flex items-center justify-between text-xs">
                  <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                    {cert?.status}
                  </span>
                  <span className="text-gray-500">
                    Valid until {new Date(cert.validUntil)?.toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Performance Transparency
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {performanceMetrics?.map((metric) =>
            <div key={metric?.id} className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-200">
                <div className={`w-12 h-12 bg-${metric?.color}-100 rounded-lg flex items-center justify-center mb-4`}>
                  <Icon name={metric?.icon} size={24} className={`text-${metric?.color}-600`} />
                </div>
                
                <div className="text-3xl font-bold text-gray-900 mb-2">{metric?.value}</div>
                <h4 className="font-semibold text-gray-900 mb-2">{metric?.metric}</h4>
                <p className="text-sm text-gray-600">{metric?.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Strategic Partnerships */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Trusted by Leading Organizations
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {partnerships?.map((partner) =>
            <div key={partner?.id} className="group bg-white rounded-lg shadow-md border border-gray-200 p-4 hover:shadow-lg smooth-transition text-center">
                {/* CLS fix: explicit height container + aspect-ratio */}
                <div className="w-full overflow-hidden rounded mb-3" style={{ height: '48px', aspectRatio: 'auto' }}>
                  <Image
                    src={partner?.logo}
                    alt={partner?.logoAlt}
                    width={120}
                    height={48}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 smooth-transition"
                  />
                </div>
                
                <h5 className="font-semibold text-sm text-gray-900 mb-1">{partner?.name}</h5>
                <p className="text-xs text-primary font-medium mb-1">{partner?.type}</p>
                <p className="text-xs text-gray-600">{partner?.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Awards & Recognition */}
        <div className="mb-16">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">
            Awards & Recognition
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {awards?.map((award) =>
            <div key={award?.id} className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl p-6 border border-yellow-200 text-center">
                <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Icon name={award?.icon} size={32} className="text-yellow-600" />
                </div>
                
                <h4 className="font-bold text-gray-900 mb-2">{award?.title}</h4>
                <p className="text-sm text-gray-700 mb-2">{award?.organization}</p>
                <span className="inline-block bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-semibold">
                  {award?.year}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Trust Statement */}
        <div className="bg-gradient-to-r from-primary to-blue-700 rounded-2xl p-8 text-white text-center">
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="ShieldCheck" size={32} className="text-white" />
            </div>
            
            <h3 className="text-2xl font-bold">
              Your Safety is Our Commitment
            </h3>
            
            <p className="text-blue-100 leading-relaxed">
              Every certification, partnership, and performance metric reflects our unwavering commitment to providing safe, reliable, and professional transportation services. When you choose GoShuttle Pro, you're choosing a partner you can trust with your most important journeys.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <Icon name="Phone" size={16} />
                <span className="text-sm">24/7 Emergency Support</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <Icon name="Shield" size={16} />
                <span className="text-sm">Fully Insured Fleet</span>
              </div>
              <div className="flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2">
                <Icon name="CheckCircle" size={16} />
                <span className="text-sm">Verified Drivers</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>);

};

export default TrustSignals;