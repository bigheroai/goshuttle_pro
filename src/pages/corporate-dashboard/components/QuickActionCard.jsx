import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const QuickActionCard = ({ title, description, icon, buttonText, onClick, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-50 border-blue-200",
    green: "bg-green-50 border-green-200",
    orange: "bg-orange-50 border-orange-200",
    purple: "bg-purple-50 border-purple-200"
  };

  return (
    <div className={`rounded-lg border p-6 hover:shadow-md smooth-transition ${colorClasses?.[color]}`}>
      <div className="flex items-start space-x-4">
        <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
          <Icon name={icon} size={20} className="text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          <p className="text-sm text-gray-600 mb-4">{description}</p>
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClick}
            className="text-primary border-primary hover:bg-primary hover:text-white"
          >
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default QuickActionCard;