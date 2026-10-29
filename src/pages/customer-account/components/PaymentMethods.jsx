import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const PaymentMethods = ({ paymentMethods, onAddPayment, onRemovePayment, onSetDefault }) => {

  const getPaymentIcon = (type) => {
    switch (type) {
      case 'credit': return 'CreditCard';
      case 'gcash': return 'Smartphone';
      case 'paymaya': return 'Wallet';
      case 'bank': return 'Building2';
      default: return 'CreditCard';
    }
  };

  const getPaymentColor = (type) => {
    switch (type) {
      case 'credit': return 'text-blue-600 bg-blue-100';
      case 'gcash': return 'text-green-600 bg-green-100';
      case 'paymaya': return 'text-purple-600 bg-purple-100';
      case 'bank': return 'text-gray-600 bg-gray-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Payment Methods</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onAddPayment && onAddPayment()}
        >
          <Icon name="Plus" size={16} className="mr-2" />
          Add Payment Method
        </Button>
      </div>

      {/* Payment Methods List */}
      <div className="space-y-4">
        {paymentMethods?.map((method) => (
          <div key={method?.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getPaymentColor(method?.type)}`}>
                  <Icon name={getPaymentIcon(method?.type)} size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{method?.name}</h3>
                    {method?.isDefault && (
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{method?.details}</p>
                  <p className="text-xs text-gray-500">Added on {method?.addedDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!method?.isDefault && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onSetDefault && onSetDefault(method?.id)}
                  >
                    Set Default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRemovePayment && onRemovePayment(method?.id)}
                >
                  <Icon name="Trash2" size={16} />
                </Button>
              </div>
            </div>

            {/* Payment Method Features */}
            <div className="mt-3 flex flex-wrap gap-2">
              {method?.features?.map((feature, index) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-700"
                >
                  <Icon name="Check" size={12} className="mr-1" />
                  {feature}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {(!paymentMethods || paymentMethods?.length === 0) && (
        <div className="text-center py-8">
          <Icon name="CreditCard" size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No payment methods</h3>
          <p className="text-gray-600 mb-4">Add a payment method to make booking easier.</p>
          <Button onClick={() => onAddPayment && onAddPayment()}>
            <Icon name="Plus" size={16} className="mr-2" />
            Add Your First Payment Method
          </Button>
        </div>
      )}

      {/* Security Notice */}
      <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
        <div className="flex items-start gap-3">
          <Icon name="Shield" size={20} className="text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-1">Secure Payment Processing</h4>
            <p className="text-sm text-blue-700">
              All payment information is encrypted and securely stored. We never store your full card details on our servers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentMethods;