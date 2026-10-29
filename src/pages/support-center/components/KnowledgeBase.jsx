import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';

const KnowledgeBase = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  const categories = [
    { id: 'all', name: 'All Topics', icon: 'Grid3X3', count: 45 },
    { id: 'booking', name: 'Booking & Reservations', icon: 'Calendar', count: 12 },
    { id: 'payment', name: 'Payment & Billing', icon: 'CreditCard', count: 8 },
    { id: 'tracking', name: 'Live Tracking', icon: 'Navigation', count: 6 },
    { id: 'corporate', name: 'Corporate Accounts', icon: 'Building2', count: 9 },
    { id: 'safety', name: 'Safety & Security', icon: 'Shield', count: 7 },
    { id: 'policies', name: 'Policies & Terms', icon: 'FileText', count: 3 }
  ];

  const knowledgeArticles = [
    {
      id: 1,
      category: 'booking',
      title: 'How to book a shuttle for multiple passengers?',
      excerpt: 'Learn how to make group bookings and manage passenger details for corporate or family travel.',
      readTime: '3 min read',
      popularity: 'Most Popular',
      lastUpdated: '2025-10-15'
    },
    {
      id: 2,
      category: 'payment',
      title: 'Accepted payment methods and billing cycles',
      excerpt: 'Complete guide to payment options including GCash, PayMaya, credit cards, and corporate billing.',
      readTime: '4 min read',
      popularity: 'Trending',
      lastUpdated: '2025-10-14'
    },
    {
      id: 3,
      category: 'tracking',
      title: 'Real-time tracking and driver communication',
      excerpt: 'How to track your shuttle in real-time and communicate with your assigned driver.',
      readTime: '2 min read',
      popularity: 'New',
      lastUpdated: '2025-10-16'
    },
    {
      id: 4,
      category: 'booking',
      title: 'Modifying or canceling your reservation',
      excerpt: 'Step-by-step guide to change booking details, reschedule trips, or process cancellations.',
      readTime: '5 min read',
      popularity: 'Popular',
      lastUpdated: '2025-10-13'
    },
    {
      id: 5,
      category: 'corporate',
      title: 'Setting up corporate accounts and expense reporting',
      excerpt: 'Complete setup guide for business accounts including automated expense reporting and approval workflows.',
      readTime: '6 min read',
      popularity: 'Featured',
      lastUpdated: '2025-10-12'
    },
    {
      id: 6,
      category: 'safety',
      title: 'Driver verification and vehicle safety protocols',
      excerpt: 'Learn about our comprehensive safety measures including driver background checks and vehicle maintenance.',
      readTime: '4 min read',
      popularity: 'Important',
      lastUpdated: '2025-10-11'
    },
    {
      id: 7,
      category: 'payment',
      title: 'Understanding dynamic pricing and fare calculation',
      excerpt: 'How our transparent pricing works including peak hours, distance calculation, and additional fees.',
      readTime: '3 min read',
      popularity: 'Popular',
      lastUpdated: '2025-10-10'
    },
    {
      id: 8,
      category: 'policies',
      title: 'Luggage policies and special requirements',
      excerpt: 'Guidelines for luggage limits, special items, and accessibility requirements for all passengers.',
      readTime: '2 min read',
      popularity: 'Essential',
      lastUpdated: '2025-10-09'
    }
  ];

  const filteredArticles = knowledgeArticles?.filter(article => {
    const matchesCategory = activeCategory === 'all' || article?.category === activeCategory;
    const matchesSearch = article?.title?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
                         article?.excerpt?.toLowerCase()?.includes(searchQuery?.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getPopularityColor = (popularity) => {
    switch (popularity) {
      case 'Most Popular': return 'bg-red-100 text-red-800';
      case 'Trending': return 'bg-orange-100 text-orange-800';
      case 'New': return 'bg-green-100 text-green-800';
      case 'Featured': return 'bg-purple-100 text-purple-800';
      case 'Important': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Knowledge Base
          </h2>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto mb-8">
            Find answers to common questions and learn how to make the most of GoShuttle Pro services
          </p>
          
          {/* Search Bar */}
          <div className="max-w-2xl mx-auto">
            <Input
              type="search"
              placeholder="Search for help articles, guides, or topics..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e?.target?.value)}
              className="text-lg"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Categories Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 sticky top-24">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Browse by Category
              </h3>
              
              <div className="space-y-2">
                {categories?.map((category) => (
                  <button
                    key={category?.id}
                    onClick={() => setActiveCategory(category?.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-lg text-left smooth-transition ${
                      activeCategory === category?.id
                        ? 'bg-primary text-white' :'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center">
                      <Icon 
                        name={category?.icon} 
                        size={18} 
                        className="mr-3" 
                      />
                      <span className="text-sm font-medium">
                        {category?.name}
                      </span>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      activeCategory === category?.id
                        ? 'bg-white/20 text-white' :'bg-gray-200 text-gray-600'
                    }`}>
                      {category?.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Articles Grid */}
          <div className="lg:col-span-3">
            <div className="mb-6 flex items-center justify-between">
              <p className="text-gray-600">
                Showing {filteredArticles?.length} articles
                {activeCategory !== 'all' && (
                  <span> in {categories?.find(c => c?.id === activeCategory)?.name}</span>
                )}
              </p>
              
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Icon name="Filter" size={16} />
                <span>Sort by relevance</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredArticles?.map((article) => (
                <div
                  key={article?.id}
                  className="bg-white rounded-lg p-6 shadow-sm border border-gray-200 hover:shadow-md smooth-transition cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPopularityColor(article?.popularity)}`}>
                      {article?.popularity}
                    </span>
                    <span className="text-xs text-gray-500">
                      {article?.readTime}
                    </span>
                  </div>
                  
                  <h3 className="text-lg font-semibold text-gray-900 mb-3 line-clamp-2">
                    {article?.title}
                  </h3>
                  
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {article?.excerpt}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Updated {new Date(article.lastUpdated)?.toLocaleDateString()}
                    </span>
                    <Icon name="ArrowRight" size={16} className="text-primary" />
                  </div>
                </div>
              ))}
            </div>

            {filteredArticles?.length === 0 && (
              <div className="text-center py-12">
                <Icon name="Search" size={48} className="text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No articles found
                </h3>
                <p className="text-gray-600">
                  Try adjusting your search terms or browse different categories
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default KnowledgeBase;