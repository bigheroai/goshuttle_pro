import React, { useState } from 'react';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const VehicleCard = ({ vehicle, onViewDetails, onBookNow }) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

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
    <div className="bg-white rounded-xl shadow-lg hover:shadow-xl smooth-transition border border-gray-200 overflow-hidden">
      {/* Image Gallery */}
      <div className="relative h-64 overflow-hidden">
        <Image
          src={vehicle?.images?.[currentImageIndex]?.url}
          alt={vehicle?.images?.[currentImageIndex]?.alt}
          className="w-full h-full object-cover"
        />
        
        {/* Image Navigation */}
        {vehicle?.images?.length > 1 && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center smooth-transition"
            >
              <Icon name="ChevronLeft" size={16} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-black/50 hover:bg-black/70 text-white rounded-full flex items-center justify-center smooth-transition"
            >
              <Icon name="ChevronRight" size={16} />
            </button>
            
            {/* Image Indicators */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
              {vehicle?.images?.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImageIndex(index)}
                  className={`w-2 h-2 rounded-full smooth-transition ${
                    index === currentImageIndex ? 'bg-white' : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            vehicle?.status === 'available' ?'bg-success text-white' 
              : vehicle?.status === 'maintenance' ?'bg-warning text-gray-800' :'bg-error text-white'
          }`}>
            {vehicle?.status === 'available' ? 'Available' : 
             vehicle?.status === 'maintenance' ? 'Maintenance' : 'Booked'}
          </span>
        </div>

        {/* Premium Badge */}
        {vehicle?.isPremium && (
          <div className="absolute top-3 right-3">
            <span className="bg-accent text-gray-800 px-2 py-1 rounded-full text-xs font-medium flex items-center">
              <Icon name="Star" size={12} className="mr-1" />
              Premium
            </span>
          </div>
        )}
      </div>
      {/* Vehicle Info */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">{vehicle?.name}</h3>
            <p className="text-sm text-gray-600">{vehicle?.category}</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-primary">₱{vehicle?.pricePerHour}</div>
            <div className="text-xs text-gray-500">per hour</div>
          </div>
        </div>

        {/* Key Features */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <Icon name="Users" size={20} className="mx-auto mb-1 text-primary" />
            <div className="text-sm font-medium">{vehicle?.capacity}</div>
            <div className="text-xs text-gray-500">Passengers</div>
          </div>
          <div className="text-center">
            <Icon name="Luggage" size={20} className="mx-auto mb-1 text-primary" />
            <div className="text-sm font-medium">{vehicle?.luggage}</div>
            <div className="text-xs text-gray-500">Luggage</div>
          </div>
          <div className="text-center">
            <Icon name="Fuel" size={20} className="mx-auto mb-1 text-primary" />
            <div className="text-sm font-medium">{vehicle?.fuelType}</div>
            <div className="text-xs text-gray-500">Fuel</div>
          </div>
        </div>

        {/* Amenities */}
        <div className="mb-4">
          <div className="flex flex-wrap gap-2">
            {vehicle?.amenities?.slice(0, 3)?.map((amenity, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
              >
                <Icon name={amenity?.icon} size={12} className="mr-1" />
                {amenity?.name}
              </span>
            ))}
            {vehicle?.amenities?.length > 3 && (
              <span className="text-xs text-primary font-medium">
                +{vehicle?.amenities?.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* Rating */}
        <div className="flex items-center mb-4">
          <div className="flex items-center">
            {[...Array(5)]?.map((_, i) => (
              <Icon
                key={i}
                name="Star"
                size={14}
                className={i < Math.floor(vehicle?.rating) ? 'text-yellow-400 fill-current' : 'text-gray-300'}
              />
            ))}
          </div>
          <span className="ml-2 text-sm text-gray-600">
            {vehicle?.rating} ({vehicle?.reviewCount} reviews)
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(vehicle)}
            className="flex-1"
          >
            View Details
          </Button>
          <Button
            size="sm"
            onClick={() => onBookNow(vehicle)}
            disabled={vehicle?.status !== 'available'}
            className="flex-1 bg-conversion-accent hover:bg-conversion-accent/90"
          >
            {vehicle?.status === 'available' ? 'Book Now' : 'Unavailable'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default VehicleCard;