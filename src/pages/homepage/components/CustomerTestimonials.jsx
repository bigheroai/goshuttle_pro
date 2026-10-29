import React, { useState, useEffect, useRef } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';

const CustomerTestimonials = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  // Track whether carousel container has a fixed height to prevent CLS
  const carouselRef = useRef(null);

  const testimonials = [
  {
    id: 1,
    name: "Maria Santos",
    role: "Corporate Travel Manager",
    company: "TechCorp Philippines",
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1b33e57c8-1762274356059.png",
    avatarAlt: "Professional headshot of Filipino woman with shoulder-length black hair in navy business suit",
    rating: 5,
    content: `GoShuttle Pro has revolutionized our corporate transportation. The real-time tracking and automated expense reporting have saved us countless hours. Our employees love the reliability and comfort of their premium fleet.`,
    highlight: "Saved 40% on transportation costs",
    route: "Manila ↔ Makati Business District",
    bookings: 156,
    date: "2024-10-15"
  },
  {
    id: 2,
    name: "James Rodriguez",
    role: "Family Travel Coordinator",
    company: "Rodriguez Family",
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1621a6564-1762274178844.png",
    avatarAlt: "Smiling middle-aged Hispanic man with graying beard wearing casual blue shirt",
    rating: 5,
    content: `Planning our family reunion transportation was seamless with GoShuttle Pro. The group booking feature and real-time updates kept everyone informed. The drivers were professional and the vehicles were immaculate.`,
    highlight: "Coordinated 25 family members",
    route: "Manila → Baguio Family Reunion",
    bookings: 8,
    date: "2024-10-12"
  },
  {
    id: 3,
    name: "Dr. Sarah Chen",
    role: "Medical Conference Organizer",
    company: "Philippine Medical Association",
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_13e4965db-1762273297969.png",
    avatarAlt: "Professional Asian woman doctor with short black hair wearing white medical coat",
    rating: 5,
    content: `The corporate dashboard made managing transportation for 200+ medical professionals effortless. The punctuality rate is exceptional - crucial for our tight conference schedule. Highly recommend for event organizers.`,
    highlight: "100% on-time performance",
    route: "NAIA → Manila Hotel Conference",
    bookings: 24,
    date: "2024-10-10"
  },
  {
    id: 4,
    name: "Miguel Dela Cruz",
    role: "Tourism Business Owner",
    company: "Island Adventures Tours",
    avatar: "https://images.unsplash.com/photo-1721356043080-88c72fa368da",
    avatarAlt: "Friendly Filipino man with warm smile wearing tropical print shirt and sunglasses",
    rating: 5,
    content: `As a tour operator, reliable transportation is critical. GoShuttle Pro's fleet diversity and professional drivers have enhanced our guests' experience significantly. The booking system integrates perfectly with our operations.`,
    highlight: "98% customer satisfaction",
    route: "Various Tourist Destinations",
    bookings: 89,
    date: "2024-10-08"
  },
  {
    id: 5,
    name: "Anna Reyes",
    role: "Executive Assistant",
    company: "Global Finance Corp",
    avatar: "https://images.unsplash.com/photo-1645553010077-dc88431f7b20",
    avatarAlt: "Professional Filipina woman with long straight hair in elegant black blazer",
    rating: 5,
    content: `Managing executive transportation has never been easier. The calendar integration and automatic notifications ensure our C-level executives are always on time. The premium vehicles reflect our company's standards perfectly.`,
    highlight: "Zero missed appointments",
    route: "BGC ↔ Ortigas Business District",
    bookings: 67,
    date: "2024-10-05"
  },
  {
    id: 6,
    name: "Robert Kim",
    role: "International Visitor",
    company: "Samsung Electronics",
    avatar: "https://img.rocket.new/generatedImages/rocket_gen_img_1bf062db5-1762273420323.png",
    avatarAlt: "Professional Korean businessman with glasses wearing dark suit and tie",
    rating: 5,
    content: `Visiting the Philippines for business, GoShuttle Pro provided exceptional service. The English-speaking drivers, clean vehicles, and reliable scheduling made my trip stress-free. Will definitely use again on future visits.`,
    highlight: "Seamless international experience",
    route: "NAIA → Various Business Meetings",
    bookings: 12,
    date: "2024-10-03"
  }];


  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % testimonials?.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + testimonials?.length) % testimonials?.length);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
  };

  useEffect(() => {
    if (!isAutoPlaying) return;
    const interval = setInterval(nextSlide, 5000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoPlaying, currentSlide]);

  const handleMouseEnter = () => setIsAutoPlaying(false);
  const handleMouseLeave = () => setIsAutoPlaying(true);

  return (
    <section className="py-16 bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
            <Icon name="MessageSquare" size={16} />
            <span>Customer Stories</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Trusted by Thousands of Travelers
          </h2>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Real experiences from our valued customers who have chosen GoShuttle Pro for their transportation needs. See why we maintain a 98.5% satisfaction rate.
          </p>
        </div>

        {/* Testimonial Carousel — fixed min-height prevents CLS during slide transitions */}
        <div
          ref={carouselRef}
          className="relative max-w-4xl mx-auto"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {/* CLS fix: explicit min-height so container doesn't collapse before content loads */}
          <div className="overflow-hidden rounded-2xl shadow-2xl bg-white" style={{ minHeight: '380px' }}>
            <div
              className="flex smooth-transition"
              style={{ transform: `translateX(-${currentSlide * 100}%)`, willChange: 'transform' }}
            >
              {testimonials?.map((testimonial) => (
                <div key={testimonial?.id} className="w-full flex-shrink-0 p-8 sm:p-12">
                  <div className="flex flex-col lg:flex-row items-center lg:items-start space-y-6 lg:space-y-0 lg:space-x-8">
                    {/* Avatar — explicit width/height prevents CLS */}
                    <div className="flex-shrink-0 text-center lg:text-left">
                      <div className="relative inline-block">
                        <Image
                          src={testimonial?.avatar}
                          alt={testimonial?.avatarAlt}
                          width={96}
                          height={96}
                          loading="lazy"
                          decoding="async"
                          className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                          style={{ aspectRatio: '1/1' }}
                        />
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-2">
                          <Icon name="CheckCircle" size={16} className="text-white" />
                        </div>
                      </div>
                      
                      <div className="mt-4 space-y-1">
                        <h4 className="font-bold text-lg text-gray-900">{testimonial?.name}</h4>
                        <p className="text-sm font-medium text-primary">{testimonial?.role}</p>
                        <p className="text-xs text-gray-600">{testimonial?.company}</p>
                        
                        <div className="flex justify-center lg:justify-start space-x-1 mt-2">
                          {[...Array(testimonial?.rating)]?.map((_, i) => (
                            <Icon key={i} name="Star" size={16} className="text-yellow-400 fill-current" />
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Testimonial Content */}
                    <div className="flex-1 space-y-6">
                      <div className="relative">
                        <Icon name="Quote" size={32} className="text-primary/20 absolute -top-2 -left-2" />
                        <blockquote className="text-lg text-gray-700 leading-relaxed italic pl-8">
                          "{testimonial?.content}"
                        </blockquote>
                      </div>

                      <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-semibold">
                        <Icon name="TrendingUp" size={14} />
                        <span>{testimonial?.highlight}</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-200">
                        <div className="text-center sm:text-left">
                          <div className="font-bold text-lg text-gray-900">{testimonial?.bookings}</div>
                          <div className="text-sm text-gray-600">Total Bookings</div>
                        </div>
                        <div className="text-center sm:text-left">
                          <div className="font-bold text-lg text-gray-900">{testimonial?.route}</div>
                          <div className="text-sm text-gray-600">Primary Route</div>
                        </div>
                        <div className="text-center sm:text-left">
                          <div className="font-bold text-lg text-gray-900">
                            {new Date(testimonial.date)?.toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600">Latest Review</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows */}
          <button
            onClick={prevSlide}
            aria-label="Previous testimonial"
            className="absolute left-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 smooth-transition z-10"
          >
            <Icon name="ChevronLeft" size={20} className="text-gray-600" />
          </button>
          
          <button
            onClick={nextSlide}
            aria-label="Next testimonial"
            className="absolute right-4 top-1/2 transform -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center hover:bg-gray-50 smooth-transition z-10"
          >
            <Icon name="ChevronRight" size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Slide Indicators */}
        <div className="flex justify-center space-x-2 mt-8">
          {testimonials?.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              aria-label={`Go to testimonial ${index + 1}`}
              className={`w-3 h-3 rounded-full smooth-transition ${
                index === currentSlide ? 'bg-primary' : 'bg-gray-300 hover:bg-gray-400'
              }`}
            />
          ))}
        </div>

        {/* Trust Metrics */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">98.5%</div>
            <div className="text-sm text-gray-600">Customer Satisfaction</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">50,000+</div>
            <div className="text-sm text-gray-600">Happy Customers</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">4.9/5</div>
            <div className="text-sm text-gray-600">Average Rating</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-primary mb-2">24/7</div>
            <div className="text-sm text-gray-600">Customer Support</div>
          </div>
        </div>
      </div>
    </section>);

};

export default CustomerTestimonials;