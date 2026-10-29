import React, { useState } from 'react';
import { FileText, DollarSign, Shield, Users, CheckCircle, AlertTriangle } from 'lucide-react';

const PartnershipAgreement = ({ formData, setFormData, errors }) => {
  const [agreementAccepted, setAgreementAccepted] = useState(formData?.agreementAccepted || false);
  const [termsAccepted, setTermsAccepted] = useState(formData?.termsAccepted || false);

  const handleAgreementChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    if (field === 'agreementAccepted') {
      setAgreementAccepted(value);
    } else if (field === 'termsAccepted') {
      setTermsAccepted(value);
    }
  };

  const partnershipBenefits = [
    {
      icon: DollarSign,
      title: 'Revenue Sharing',
      description: 'Competitive commission structure with transparent billing',
      details: ['15-25% commission on completed trips', 'Weekly automated payments', 'No hidden fees or charges']
    },
    {
      icon: Users,
      title: 'Driver Support',
      description: 'Access to our driver network and training programs',
      details: ['Driver recruitment assistance', 'Training and certification programs', 'Performance monitoring tools']
    },
    {
      icon: Shield,
      title: 'Insurance & Protection',
      description: 'Comprehensive coverage for operations and passengers',
      details: ['Commercial vehicle insurance support', 'Passenger liability coverage', 'Emergency assistance services']
    }
  ];

  const keyTerms = [
    'Maintain minimum service quality standards as defined by GoShuttle',
    'Provide vehicles that meet safety and maintenance requirements',
    'Ensure all drivers complete mandatory training and certification',
    'Maintain appropriate insurance coverage for all vehicles',
    'Comply with local transportation regulations and licensing',
    'Use GoShuttle platform exclusively during operating hours',
    'Maintain 4.5+ star average rating from passengers',
    'Respond to service requests within agreed timeframes'
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Partnership Agreement</h3>
        <p className="text-sm text-gray-600 mb-6">
          Review the partnership terms and benefits. This agreement outlines the relationship between your fleet and GoShuttle.
        </p>

        {/* Partnership Benefits */}
        <div className="mb-8">
          <h4 className="font-medium text-gray-900 mb-4">Partnership Benefits</h4>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {partnershipBenefits?.map((benefit, index) => (
              <div key={index} className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-3 mb-3">
                  <benefit.icon className="h-6 w-6 text-blue-600" />
                  <h5 className="font-medium text-blue-900">{benefit?.title}</h5>
                </div>
                <p className="text-sm text-blue-800 mb-3">{benefit?.description}</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  {benefit?.details?.map((detail, idx) => (
                    <li key={idx} className="flex items-start space-x-1">
                      <CheckCircle className="h-3 w-3 text-blue-600 mt-0.5 flex-shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Key Terms */}
        <div className="mb-8">
          <h4 className="font-medium text-gray-900 mb-4">Key Partnership Terms</h4>
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <ul className="space-y-3">
              {keyTerms?.map((term, index) => (
                <li key={index} className="flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-blue-600">{index + 1}</span>
                  </div>
                  <span className="text-sm text-gray-700">{term}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Commission Structure */}
        <div className="mb-8">
          <h4 className="font-medium text-gray-900 mb-4">Commission Structure</h4>
          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <h5 className="font-medium text-green-900 mb-2">Standard Trips</h5>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Local trips: 15% commission</li>
                  <li>• Corporate bookings: 20% commission</li>
                  <li>• Airport transfers: 18% commission</li>
                </ul>
              </div>
              <div>
                <h5 className="font-medium text-green-900 mb-2">Premium Services</h5>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>• Executive vehicles: 25% commission</li>
                  <li>• Multi-day charters: 22% commission</li>
                  <li>• Special events: 20% commission</li>
                </ul>
              </div>
            </div>
            <div className="mt-4 p-3 bg-green-100 rounded-md">
              <p className="text-sm text-green-800">
                <strong>Performance Bonus:</strong> Additional 2-5% commission for partners maintaining 4.8+ star rating and 95%+ completion rate.
              </p>
            </div>
          </div>
        </div>

        {/* Agreement Acceptance */}
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="agreementAccepted"
              checked={agreementAccepted}
              onChange={(e) => handleAgreementChange('agreementAccepted', e?.target?.checked)}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="agreementAccepted" className="text-sm font-medium text-gray-900">
                I accept the Partnership Agreement terms and conditions *
              </label>
              <p className="text-xs text-gray-600 mt-1">
                By checking this box, you agree to the commission structure, service requirements, and operational guidelines outlined above.
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              id="termsAccepted"
              checked={termsAccepted}
              onChange={(e) => handleAgreementChange('termsAccepted', e?.target?.checked)}
              className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <div className="flex-1">
              <label htmlFor="termsAccepted" className="text-sm font-medium text-gray-900">
                I agree to GoShuttle's Terms of Service and Privacy Policy *
              </label>
              <p className="text-xs text-gray-600 mt-1">
                This includes data processing agreements, liability terms, and platform usage policies.
              </p>
            </div>
          </div>

          {(errors?.agreementAccepted || errors?.termsAccepted) && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <p className="text-sm text-red-800">
                  Please accept both the Partnership Agreement and Terms of Service to continue.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Important Notice */}
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <FileText className="h-5 w-5 text-yellow-600 mt-0.5" />
            <div>
              <h5 className="font-medium text-yellow-900 mb-2">Important Notice</h5>
              <ul className="text-sm text-yellow-800 space-y-1">
                <li>• Partnership approval is subject to business verification and fleet inspection</li>
                <li>• Final agreement documents will be provided upon approval</li>
                <li>• Terms may be updated with 30 days notice to partners</li>
                <li>• Partnership can be terminated by either party with 30 days notice</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PartnershipAgreement;