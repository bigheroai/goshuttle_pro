import React from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const SupportHero = () => {
  const navigate = useNavigate();

  const handleStartLiveChat = () => {
    // Scroll to bottom where the live chat widget is, then open it
    window.scrollTo({ top: document.body?.scrollHeight, behavior: 'smooth' });
    setTimeout(() => {
      const chatBtn = document.querySelector('[aria-label="Open live chat"]') ||
        document.querySelector('.fixed.bottom-6.right-6 button');
      if (chatBtn) {
        chatBtn?.click();
      }
    }, 600);
  };

  const handleEmergencyCall = () => {
    window.open('tel:+639171234567', '_self');
  };

  const handleSearchRoutes = () => {
    navigate('/route-network');
  };

  return (
    <section className="bg-gradient-to-br from-blue-800 to-blue-900 py-16 lg:py-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
              <Icon name="HelpCircle" size={32} color="white" strokeWidth={2} />
            </div>
          </div>
          
          <h1 className="text-4xl lg:text-5xl font-bold mb-6 text-balance text-white">
            How Can We Help You Today?
          </h1>
          
          <p className="text-xl lg:text-2xl text-white/90 mb-8 text-balance">
            Get instant support through our comprehensive help center, live chat, or emergency assistance
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              variant="secondary" 
              size="lg"
              className="bg-white text-blue-800 hover:bg-gray-50 font-semibold shadow-md"
              onClick={handleStartLiveChat}
            >
              <Icon name="MessageCircle" size={20} className="mr-2" />
              Start Live Chat
            </Button>
            
            <Button 
              variant="outline" 
              size="lg"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-800 font-semibold"
              onClick={handleEmergencyCall}
            >
              <Icon name="Phone" size={20} className="mr-2" />
              Emergency: +63 917 123 4567
            </Button>

            <Button
              variant="outline"
              size="lg"
              className="border-2 border-white text-white hover:bg-white hover:text-blue-800 font-semibold"
              onClick={handleSearchRoutes}
            >
              <Icon name="Map" size={20} className="mr-2" />
              Search Routes
            </Button>
          </div>
          
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-white/80">
            <div className="flex items-center">
              <Icon name="Clock" size={16} className="mr-2" />
              24/7 Emergency Support
            </div>
            <div className="flex items-center">
              <Icon name="Users" size={16} className="mr-2" />
              Live Chat: 6AM - 10PM
            </div>
            <div className="flex items-center">
              <Icon name="Globe" size={16} className="mr-2" />
              Multilingual Support
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default SupportHero;