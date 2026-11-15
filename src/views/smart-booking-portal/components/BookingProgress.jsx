import React from 'react';
import Icon from '../../../components/AppIcon';

const stepIcons = ['MapPin', 'Calendar', 'Car', 'Users', 'CreditCard'];
const stepDescriptions = ['Choose route', 'Pick date & time', 'Select vehicle', 'Add passengers', 'Confirm & pay'];

const BookingProgress = ({ currentStep, steps }) => {
  const totalSteps = steps?.length || 1;
  const completedSteps = currentStep;
  const progressPercent = Math.round((completedSteps / totalSteps) * 100);
  const isPaymentStep = currentStep === totalSteps - 1;

  return (
    <div className={`w-full bg-white rounded-lg shadow-sm border p-5 mb-6 transition-all duration-300 ${
      isPaymentStep ? 'border-primary/40 bg-blue-50/30' : 'border-gray-200'
    }`}>
      {/* Top bar: label + percent */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {isPaymentStep && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
              <Icon name="Lock" size={11} />
              Secure Checkout
            </span>
          )}
          {!isPaymentStep && (
            <span className="text-xs text-gray-500 font-medium">
              Step {currentStep + 1} of {totalSteps}
            </span>
          )}
        </div>
        <span className={`text-xs font-semibold ${isPaymentStep ? 'text-primary' : 'text-gray-500'}`}>
          {progressPercent}% complete
        </span>
      </div>
      {/* Linear progress bar */}
      <div className="w-full h-1.5 bg-gray-200 rounded-full mb-5 overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
      {/* Step circles */}
      <div className="flex items-start justify-between">
        {steps?.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const iconName = stepIcons?.[index] || 'Circle';
          const desc = stepDescriptions?.[index] || '';

          return (
            <React.Fragment key={step?.id}>
              <div className="flex flex-col items-center flex-1 min-w-0">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : isCurrent
                      ? 'bg-white border-primary text-primary shadow-md ring-2 ring-primary/20'
                      : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}>
                  {isCompleted ? (
                    <Icon name="Check" size={16} />
                  ) : (
                    <Icon name={iconName} size={15} />
                  )}
                </div>
                <span className={`mt-1.5 text-xs font-semibold text-center leading-tight ${
                  isCurrent ? 'text-primary' : isCompleted ? 'text-gray-600' : 'text-gray-400'
                }`}>
                  {step?.title}
                </span>
                <span className={`text-[10px] text-center leading-tight hidden sm:block ${
                  isCurrent ? 'text-primary/70' : 'text-gray-400'
                }`}>
                  {desc}
                </span>
              </div>
              {index < steps?.length - 1 && (
                <div className={`h-0.5 flex-1 mx-1 mt-4 transition-all duration-500 ${
                  index < currentStep ? 'bg-primary' : 'bg-gray-200'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* Payment step trust badges */}
      {isPaymentStep && (
        <div className="mt-4 pt-3 border-t border-primary/10 flex flex-wrap items-center justify-center gap-3">
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Icon name="ShieldCheck" size={13} className="text-green-500" />
            SSL Encrypted
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Icon name="Lock" size={13} className="text-blue-500" />
            Secure Payment
          </span>
          <span className="flex items-center gap-1 text-xs text-gray-500">
            <Icon name="RefreshCw" size={13} className="text-orange-500" />
            Auto-saved
          </span>
        </div>
      )}
    </div>
  );
};

export default BookingProgress;