import React from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';

const QuickActions = ({ onAction }) => {
  const actions = [
    {
      id: 'book',
      label: 'Book Journey',
      icon: 'Calendar',
      variant: 'default',
      description: 'Quick booking'
    },
    {
      id: 'track',
      label: 'Track Trip',
      icon: 'Navigation',
      variant: 'outline',
      description: 'Live tracking'
    },
    {
      id: 'support',
      label: 'Get Support',
      icon: 'HelpCircle',
      variant: 'outline',
      description: '24/7 assistance'
    },
    {
      id: 'referral',
      label: 'Refer Friend',
      icon: 'Users',
      variant: 'outline',
      description: 'Earn rewards'
    }
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {actions?.map((action) => (
          <Button
            key={action?.id}
            variant={action?.variant}
            onClick={() => onAction(action?.id)}
            className="h-auto p-4 flex flex-col items-center gap-2 text-center"
          >
            <Icon name={action?.icon} size={24} />
            <div>
              <div className="font-medium">{action?.label}</div>
              <div className="text-xs opacity-70">{action?.description}</div>
            </div>
          </Button>
        ))}
      </div>
    </div>
  );
};

export default QuickActions;