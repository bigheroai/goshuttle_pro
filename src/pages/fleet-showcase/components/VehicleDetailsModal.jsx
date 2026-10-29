import React, { useState } from 'react';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const VehicleDetailsModal = ({ vehicle, isOpen, onClose, onBookNow }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  if (!isOpen || !vehicle) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'Info' },
    { id: 'amenities', label: 'Amenities', icon: 'Star' },
    { id: 'specifications', label: 'Specifications', icon: 'Settings' },
    { id: 'reviews', label: 'Reviews', icon: 'MessageCircle' },
    { id: 'maintenance', label: 'Safety & Maintenance', icon: 'Shield' }
  ];

  const nextImage = () => {
    setCurrentImageIndex((prev) => 
      prev === vehicle?.images?.length - 1 ? 0 : prev + 1
    );
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => 
      prev === 0 ? vehicle?.images?.length - 1 : prev - 1
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm smooth-transition"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="inline-block w-full max-w-6xl my-8 overflow-hidden text-left align-middle bg-white rounded-2xl shadow-2xl smooth-transition transform">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{vehicle?.name}</h2>
                <p className="text-gray-600">{vehicle?.category} • {vehicle?.capacity} passengers</p>
              </div>
              {vehicle?.isPremium && (
                <span className="bg-accent text-gray-800 px-3 py-1 rounded-full text-sm font-medium flex items-center">
                  <Icon name="Star" size={14} className="mr-1" />
                  Premium
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-3xl font-bold text-primary">₱{vehicle?.pricePerHour}</div>
                <div className="text-sm text-gray-500">per hour</div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <Icon name="X" size={24} />
              </Button>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row">
            {/* Image Gallery */}
            <div className="lg:w-1/2 p-6">
              <div className="relative h-80 rounded-xl overflow-hidden mb-4">
                <Image
                  src={vehicle?.images?.[currentImageIndex]?.url}
                  alt={vehicle?.images?.[currentImageIndex]?.alt}
                  className="w-full h-full object-cover"
                />
                
                {vehicle?.images?.length > 1 && (
                  <>
                    <button
                      onClick={prevImage}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center smooth-transition"
                    >
                      <Icon name="ChevronLeft" size={20} />
                    </button>
                    <button
                      onClick={nextImage}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center smooth-transition"
                    >
                      <Icon name="ChevronRight" size={20} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail Gallery */}
              <div className="grid grid-cols-4 gap-2">
                {vehicle?.images?.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`relative h-20 rounded-lg overflow-hidden border-2 smooth-transition ${
                      index === currentImageIndex ? 'border-primary' : 'border-gray-200'
                    }`}
                  >
                    <Image
                      src={image?.url}
                      alt={image?.alt}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div className="lg:w-1/2 flex flex-col">
              {/* Tabs */}
              <div className="border-b border-gray-200">
                <nav className="flex space-x-8 px-6">
                  {tabs?.map((tab) => (
                    <button
                      key={tab?.id}
                      onClick={() => setActiveTab(tab?.id)}
                      className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm smooth-transition ${
                        activeTab === tab?.id
                          ? 'border-primary text-primary' :'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      <Icon name={tab?.icon} size={16} />
                      <span>{tab?.label}</span>
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="flex-1 p-6 overflow-y-auto max-h-96">
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                      <p className="text-gray-600">{vehicle?.description}</p>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Icon name="Users" size={24} className="mx-auto mb-2 text-primary" />
                        <div className="font-semibold">{vehicle?.capacity}</div>
                        <div className="text-sm text-gray-500">Passengers</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Icon name="Luggage" size={24} className="mx-auto mb-2 text-primary" />
                        <div className="font-semibold">{vehicle?.luggage}</div>
                        <div className="text-sm text-gray-500">Luggage</div>
                      </div>
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <Icon name="Fuel" size={24} className="mx-auto mb-2 text-primary" />
                        <div className="font-semibold">{vehicle?.fuelType}</div>
                        <div className="text-sm text-gray-500">Fuel Type</div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="flex items-center">
                        {[...Array(5)]?.map((_, i) => (
                          <Icon
                            key={i}
                            name="Star"
                            size={16}
                            className={i < Math.floor(vehicle?.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                      <span className="text-gray-600">
                        {vehicle?.rating} out of 5 ({vehicle?.reviewCount} reviews)
                      </span>
                    </div>
                  </div>
                )}

                {activeTab === 'amenities' && (
                  <div className="grid grid-cols-2 gap-4">
                    {vehicle?.amenities?.map((amenity, index) => (
                      <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                        <Icon name={amenity?.icon} size={20} className="text-primary" />
                        <span className="font-medium">{amenity?.name}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'specifications' && (
                  <div className="space-y-4">
                    {vehicle?.specifications?.map((spec, index) => (
                      <div key={index} className="flex justify-between py-2 border-b border-gray-100">
                        <span className="text-gray-600">{spec?.label}</span>
                        <span className="font-medium">{spec?.value}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div className="space-y-4">
                    {vehicle?.reviews?.map((review, index) => (
                      <div key={index} className="border-b border-gray-100 pb-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <Image
                              src={review?.avatar}
                              alt={review?.avatarAlt}
                              className="w-8 h-8 rounded-full"
                            />
                            <span className="font-medium">{review?.name}</span>
                          </div>
                          <div className="flex items-center">
                            {[...Array(5)]?.map((_, i) => (
                              <Icon
                                key={i}
                                name="Star"
                                size={14}
                                className={i < review?.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-gray-600 text-sm">{review?.comment}</p>
                        <span className="text-xs text-gray-400">{review?.date}</span>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'maintenance' && (
                  <div className="space-y-4">
                    <div className="bg-success/10 border border-success/20 rounded-lg p-4">
                      <div className="flex items-center space-x-2 mb-2">
                        <Icon name="Shield" size={20} className="text-success" />
                        <span className="font-semibold text-success">Safety Certified</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        This vehicle has passed all safety inspections and meets DOTr standards.
                      </p>
                    </div>

                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Maintenance Records</h4>
                      <div className="space-y-2">
                        {vehicle?.maintenanceRecords?.map((record, index) => (
                          <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="text-gray-600">{record?.type}</span>
                            <span className="text-sm text-gray-500">{record?.date}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-gray-200 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                      vehicle?.status === 'available' ?'bg-success text-white' :'bg-error text-white'
                    }`}>
                      {vehicle?.status === 'available' ? 'Available Now' : 'Currently Booked'}
                    </span>
                    {vehicle?.nextAvailable && (
                      <span className="text-sm text-gray-500">
                        Next available: {vehicle?.nextAvailable}
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={() => onBookNow(vehicle)}
                    disabled={vehicle?.status !== 'available'}
                    className="bg-conversion-accent hover:bg-conversion-accent/90"
                  >
                    <Icon name="Calendar" size={16} className="mr-2" />
                    Book This Vehicle
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VehicleDetailsModal;