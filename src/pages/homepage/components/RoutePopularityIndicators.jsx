import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import routeService from '../../../services/routeService';

const RoutePopularityIndicators = ({ onRouteClick }) => {
  const [trendingRoutes, setTrendingRoutes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPopularRoutes();
  }, []);

  const loadPopularRoutes = async () => {
    try {
      setLoading(true);
      const routes = await routeService?.getPopularRoutes(6);
      setTrendingRoutes(routes);
    } catch (err) {
      console.error('Error loading popular routes:', err);
      setError('Unable to load popular routes');
      // Keep existing data if error occurs
    } finally {
      setLoading(false);
    }
  };

  const handleRouteClick = (route) => {
    // Store route data for quick booking
    sessionStorage.setItem('selectedRoute', JSON.stringify({
      from: route?.from,
      to: route?.to,
      estimatedPrice: route?.price
    }));

    // Callback to parent component
    if (onRouteClick) {
      onRouteClick(route);
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'up': return 'TrendingUp';
      case 'down': return 'TrendingDown';
      default: return 'Minus';
    }
  };

  const getTrendColor = (trend) => {
    switch (trend) {
      case 'up': return 'text-emerald-600 bg-emerald-50';
      case 'down': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  if (loading) {
    return (
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Icon name="Loader2" size={32} className="animate-spin text-primary mx-auto mb-4" />
            <p className="text-gray-600">Loading popular routes...</p>
          </div>
        </div>
      </section>
    );
  }

  if (error && trendingRoutes?.length === 0) {
    return (
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Icon name="AlertCircle" size={32} className="text-red-500 mx-auto mb-4" />
            <p className="text-red-600 mb-4">{error}</p>
            <Button onClick={loadPopularRoutes} className="bg-primary text-white">
              Try Again
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center space-x-2 bg-orange-50 text-orange-700 px-4 py-2 rounded-full text-sm font-medium">
            <Icon name="TrendingUp" size={16} />
            <span>Route Analytics</span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Most Popular Routes
          </h2>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover trending destinations and popular routes based on real booking data. Join thousands of satisfied travelers on these top-rated journeys.
          </p>
        </div>

        {/* Featured Route - Top Performer */}
        {trendingRoutes?.length > 0 && (
          <div className="mb-12">
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
              <div className="relative">
                <Image
                  src={trendingRoutes?.[0]?.image}
                  alt={trendingRoutes?.[0]?.alt}
                  className="w-full h-64 sm:h-80 object-cover" />

                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
                
                {/* Featured Badge */}
                <div className="absolute top-4 left-4">
                  <div className="bg-conversion-accent text-white px-4 py-2 rounded-full text-sm font-semibold flex items-center space-x-2">
                    <Icon name="Star" size={16} />
                    <span>Most Popular</span>
                  </div>
                </div>

                {/* Trend Indicator */}
                <div className="absolute top-4 right-4">
                  <div className={`${getTrendColor(trendingRoutes?.[0]?.trend)} px-3 py-2 rounded-full text-sm font-semibold flex items-center space-x-1`}>
                    <Icon name={getTrendIcon(trendingRoutes?.[0]?.trend)} size={14} />
                    <span>{trendingRoutes?.[0]?.trendPercent > 0 ? '+' : ''}{trendingRoutes?.[0]?.trendPercent}%</span>
                  </div>
                </div>

                {/* Route Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">
                        {trendingRoutes?.[0]?.from} → {trendingRoutes?.[0]?.to}
                      </h3>
                      <p className="text-gray-200 mb-2">{trendingRoutes?.[0]?.description}</p>
                      <div className="flex flex-wrap gap-2">
                        {trendingRoutes?.[0]?.tags?.map((tag, index) =>
                        <span key={index} className="bg-white/20 backdrop-blur-sm px-2 py-1 rounded text-xs">
                            {tag}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="text-3xl font-bold">{trendingRoutes?.[0]?.price}</div>
                      <div className="text-sm text-gray-200">{trendingRoutes?.[0]?.duration}</div>
                      <div className="text-sm text-gray-200">{trendingRoutes?.[0]?.bookings} bookings</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span>Popularity</span>
                        <span>{trendingRoutes?.[0]?.popularity}%</span>
                      </div>
                      <div className="w-full bg-white/20 rounded-full h-2">
                        <div
                          className="bg-white h-2 rounded-full smooth-transition"
                          style={{ width: `${trendingRoutes?.[0]?.popularity}%` }}>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleRouteClick(trendingRoutes?.[0])}
                        className="bg-white/20 backdrop-blur-sm text-white hover:bg-white/30 border border-white/30"
                        iconName="ArrowUp"
                        iconPosition="left"
                      >
                        Quick Book
                      </Button>
                      <Link to="/smart-booking-portal">
                        <Button
                          className="bg-white text-gray-900 hover:bg-gray-100"
                          iconName="ArrowRight"
                          iconPosition="right"
                        >
                          Book Now
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Other Popular Routes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {trendingRoutes?.slice(1)?.map((route) =>
          <div key={route?.id} className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200 hover:shadow-xl smooth-transition group">
              <div className="relative">
                <Image
                src={route?.image}
                alt={route?.alt}
                className="w-full h-48 object-cover group-hover:scale-105 smooth-transition" />

                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
                
                {/* Trend Badge */}
                <div className="absolute top-3 right-3">
                  <div className={`${getTrendColor(route?.trend)} px-2 py-1 rounded-full text-xs font-semibold flex items-center space-x-1`}>
                    <Icon name={getTrendIcon(route?.trend)} size={12} />
                    <span>{route?.trendPercent > 0 ? '+' : ''}{route?.trendPercent}%</span>
                  </div>
                </div>

                {/* Route Title */}
                <div className="absolute bottom-3 left-3 right-3 text-white">
                  <h4 className="font-bold text-lg mb-1">
                    {route?.from} → {route?.to}
                  </h4>
                  <p className="text-sm text-gray-200">{route?.description}</p>
                </div>
              </div>

              <div className="p-6">
                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {route?.tags?.map((tag, index) =>
                <span key={index} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                      {tag}
                    </span>
                )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div>
                    <div className="font-bold text-lg text-primary">{route?.price}</div>
                    <div className="text-xs text-gray-600">Price</div>
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-900">{route?.duration}</div>
                    <div className="text-xs text-gray-600">Duration</div>
                  </div>
                  <div>
                    <div className="font-bold text-lg text-gray-900">{route?.bookings}</div>
                    <div className="text-xs text-gray-600">Bookings</div>
                  </div>
                </div>

                {/* Popularity Bar */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>Popularity</span>
                    <span>{route?.popularity}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                    className="bg-primary h-2 rounded-full smooth-transition"
                    style={{ width: `${route?.popularity}%` }}>
                  </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => handleRouteClick(route)}
                    className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                    iconName="ArrowUp"
                    iconPosition="left"
                  >
                    Quick Book
                  </Button>
                  <Link to="/smart-booking-portal" className="flex-1">
                    <Button
                      fullWidth
                      variant="outline"
                      className="border-primary text-primary hover:bg-primary hover:text-white"
                      iconName="Calendar"
                      iconPosition="left"
                    >
                      Book Route
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* View All Routes CTA */}
        <div className="text-center">
          <Link to="/route-network">
            <Button
              size="lg"
              className="bg-primary hover:bg-primary/90 text-white px-8"
              iconName="Map"
              iconPosition="left"
            >
              Explore All Routes
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
};

export default RoutePopularityIndicators;