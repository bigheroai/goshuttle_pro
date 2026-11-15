import React, { useState, useEffect } from 'react';
import { Building2, Users, DollarSign, MapPin } from 'lucide-react';
import { driverRegistrationService } from '../../../services/driverRegistrationService';

const FleetSelection = ({ formData, setFormData, errors }) => {
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPartners();
  }, []);

  const loadPartners = async () => {
    try {
      setLoading(true);
      const partnerData = await driverRegistrationService?.getActivePartners();
      setPartners(partnerData);
    } catch (err) {
      setError(err?.message || 'Failed to load fleet partners');
    } finally {
      setLoading(false);
    }
  };

  const handleFleetSelection = (fleetType, partnerId = null) => {
    setFormData(prev => ({
      ...prev,
      preferredFleetType: fleetType,
      partnerId: partnerId
    }));
  };

  const fleetOptions = [
    {
      id: 'goshuttle',
      name: 'GoShuttle Main Fleet',
      description: 'Direct employment with GoShuttle',
      benefits: [
        'Competitive base salary + commission',
        'Full benefits package',
        'Vehicle provided',
        'Comprehensive insurance coverage'
      ],
      commission: '15-25% of trip revenue',
      requirements: 'Minimum 3 years driving experience'
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Fleet Selection</h3>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Loading fleet options...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Fleet Selection</h3>
        <p className="text-sm text-gray-600 mb-6">
          Choose your preferred fleet option. You can select GoShuttle's main fleet or partner with one of our certified fleet operators.
        </p>

        <div className="space-y-4">
          {/* GoShuttle Main Fleet */}
          {fleetOptions?.map((fleet) => (
            <div key={fleet?.id} className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
              formData?.preferredFleetType === fleet?.id 
                ? 'border-blue-500 bg-blue-50' :'border-gray-200 hover:border-gray-300'
            }`} onClick={() => handleFleetSelection(fleet?.id)}>
              <div className="flex items-start space-x-4">
                <input
                  type="radio"
                  name="fleetType"
                  value={fleet?.id}
                  checked={formData?.preferredFleetType === fleet?.id}
                  onChange={() => handleFleetSelection(fleet?.id)}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                />
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <Building2 className="h-5 w-5 text-blue-600" />
                    <h4 className="font-medium text-gray-900">{fleet?.name}</h4>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{fleet?.description}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-gray-700">Commission: {fleet?.commission}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm text-gray-700">{fleet?.requirements}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h5 className="font-medium text-gray-900 text-sm">Benefits:</h5>
                    <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                      {fleet?.benefits?.map((benefit, index) => (
                        <li key={index}>{benefit}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Partner Fleet Options */}
          {partners?.length > 0 && (
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-4">Partner Fleet Options</h4>
              <div className="space-y-4">
                {partners?.map((partner) => (
                  <div key={partner?.id} className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                    formData?.partnerId === partner?.id 
                      ? 'border-blue-500 bg-blue-50' :'border-gray-200 hover:border-gray-300'
                  }`} onClick={() => handleFleetSelection('partner_fleet', partner?.id)}>
                    <div className="flex items-start space-x-4">
                      <input
                        type="radio"
                        name="fleetType"
                        value={partner?.id}
                        checked={formData?.partnerId === partner?.id}
                        onChange={() => handleFleetSelection('partner_fleet', partner?.id)}
                        className="mt-1 h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Building2 className="h-5 w-5 text-orange-600" />
                          <h4 className="font-medium text-gray-900">{partner?.name}</h4>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{partner?.companyName}</p>
                        
                        <div className="flex items-center space-x-2 mb-3">
                          <MapPin className="h-4 w-4 text-gray-400" />
                          <span className="text-sm text-gray-600">Specialization: {partner?.specialization}</span>
                        </div>

                        <div className="bg-orange-50 border border-orange-200 rounded-md p-3">
                          <p className="text-sm text-orange-800">
                            Partner fleet - Terms and commission rates may vary. Contact partner directly for details.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        {errors?.preferredFleetType && (
          <p className="mt-2 text-sm text-red-600">{errors?.preferredFleetType}</p>
        )}
      </div>
    </div>
  );
};

export default FleetSelection;