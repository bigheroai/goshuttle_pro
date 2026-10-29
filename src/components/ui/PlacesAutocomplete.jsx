import React, { useEffect, useRef, useState, useCallback } from 'react';
import Icon from '../AppIcon';

// Singleton: track if script is loading/loaded
let googleMapsScriptPromise = null;

// Global auth-failure hook — Google calls this when the API key is invalid,
// missing, or the Maps JS API is not enabled for this domain.
// Without it, Google injects a full-page error overlay.
if (typeof window !== 'undefined') {
  window.gm_authFailure = () => {
    // Reset so a future valid key can retry
    googleMapsScriptPromise = null;
    // Suppress the default Google error overlay
    const overlay = document.querySelector('.gm-err-container, #map-error, [class*="gm-err"]');
    if (overlay) overlay.style.display = 'none';
  };
}

const loadGoogleMapsScript = (apiKey) => {
  if (googleMapsScriptPromise) return googleMapsScriptPromise;

  googleMapsScriptPromise = new Promise((resolve, reject) => {
    // Already loaded
    if (window.google && window.google.maps && window.google.maps.places) {
      resolve();
      return;
    }

    const callbackName = '__googleMapsInitCallback__';
    window[callbackName] = () => {
      resolve();
      delete window[callbackName];
    };

    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&callback=${callbackName}&loading=async`;
    script.async = true;
    script.defer = true;
    script.onerror = (err) => {
      googleMapsScriptPromise = null;
      reject(err);
    };
    document.head.appendChild(script);
  });

  return googleMapsScriptPromise;
};

// Philippines fallback locations
const philippinesLocations = [
  'NAIA Terminal 1, Pasay City',
  'NAIA Terminal 2, Pasay City',
  'NAIA Terminal 3, Pasay City',
  'Makati Central Business District',
  'BGC, Taguig City',
  'Ortigas Center, Pasig City',
  'Alabang Town Center, Muntinlupa',
  'SM Mall of Asia, Pasay City',
  'Quezon City Circle',
  'Manila Bay Area',
  'Ayala Triangle, Makati',
  'Greenbelt, Makati',
  'SM North EDSA, Quezon City',
  'Eastwood City, Quezon City',
  'UP Diliman, Quezon City',
  'Bonifacio High Street, BGC',
  'Rockwell Center, Makati',
  'Araneta Coliseum, Quezon City',
  'Mall of Asia Arena, Pasay',
  'Circuit Makati',
  'Newport City, Pasay',
  'Aseana City, Paranaque',
  'Festival Mall, Alabang',
  'Gateway Mall, Cubao',
  "Robinson's Galleria, Ortigas",
  'Tagaytay City, Cavite',
  'Tagaytay Rotonda, Cavite',
  'Sky Ranch, Tagaytay, Cavite',
  'Taal Vista Hotel, Tagaytay, Cavite',
  "Sonya's Garden, Tagaytay, Cavite",
  'Twin Lakes, Tagaytay, Cavite',
  'Mahogany Market, Tagaytay, Cavite',
  'Santo Tomas City, Batangas',
  'Santo Tomas, Batangas',
  'Santo Tomas Public Market, Batangas',
  'Santo Tomas City Hall, Batangas',
  'Santo Tomas Bus Terminal, Batangas',
  'Antipolo City, Rizal',
  'Cainta, Rizal',
  'Marikina City',
  'Pasay City',
  'Las Pinas City',
  'Paranaque City',
  'Muntinlupa City',
  'Taguig City',
  'Pasig City',
  'Mandaluyong City',
  'San Juan City',
  'Caloocan City',
  'Malabon City',
  'Navotas City',
  'Valenzuela City',
  'Manila City',
  'Cavite City',
  'Laguna Province',
  'Bulacan Province',
  'Rizal Province',
];

const PlacesAutocomplete = ({
  label,
  placeholder,
  value,
  onChange,
  onPlaceSelect,
  className,
  icon,
  ...props
}) => {
  const inputRef = useRef(null);
  const autocompleteRef = useRef(null);
  const listenerRef = useRef(null);
  const [isGoogleMapsMode, setIsGoogleMapsMode] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLocating, setIsLocating] = useState(false);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const apiKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey === 'your-google-maps-api-key-here') {
      return;
    }

    let isMounted = true;

    const initAutocomplete = async () => {
      try {
        await loadGoogleMapsScript(apiKey);

        if (!isMounted || !inputRef?.current) return;

        // Clean up previous instance
        if (autocompleteRef?.current && listenerRef?.current) {
          window.google?.maps?.event?.removeListener(listenerRef?.current);
        }

        const autocomplete = new window.google.maps.places.Autocomplete(
          inputRef.current,
          {
            types: ['establishment', 'geocode'],
            componentRestrictions: { country: 'ph' },
            fields: ['place_id', 'formatted_address', 'geometry', 'name'],
          }
        );

        autocompleteRef.current = autocomplete;

        listenerRef.current = autocomplete?.addListener('place_changed', () => {
          const place = autocomplete?.getPlace();
          if (place && place?.formatted_address) {
            const placeData = {
              placeId: place?.place_id,
              address: place?.formatted_address,
              name: place?.name || place?.formatted_address,
              geometry: place?.geometry,
            };
            if (onPlaceSelect) onPlaceSelect(placeData);
            if (onChange) onChange(place?.formatted_address);
          }
        });

        if (isMounted) setIsGoogleMapsMode(true);
      } catch (err) {
        // Script failed to load or auth error — stay in fallback mode
        console.warn('Google Maps unavailable, using local suggestions fallback.', err);
        googleMapsScriptPromise = null;
        if (isMounted) setIsGoogleMapsMode(false);
      }
    };

    initAutocomplete();

    return () => {
      isMounted = false;
      if (listenerRef?.current) {
        window.google?.maps?.event?.removeListener(listenerRef?.current);
      }
    };
  }, []); // run once on mount

  // Fallback: filter local suggestions
  const filterSuggestions = useCallback((inputValue) => {
    if (!inputValue) return [];
    const searchTerm = inputValue?.toLowerCase()?.trim();
    const filtered = philippinesLocations?.filter((loc) => {
      const l = loc?.toLowerCase();
      if (l?.startsWith(searchTerm)) return true;
      const words = l?.split(/[\s,]+/);
      if (words?.some((w) => w?.startsWith(searchTerm))) return true;
      if (l?.includes(searchTerm)) return true;
      return false;
    });
    return filtered?.sort((a, b) => {
        const al = a?.toLowerCase();
        const bl = b?.toLowerCase();
        if (al?.startsWith(searchTerm) && !bl?.startsWith(searchTerm)) return -1;
        if (!al?.startsWith(searchTerm) && bl?.startsWith(searchTerm)) return 1;
        return a?.length - b?.length;
      })?.slice(0, 10);
  }, []);

  const handleInputChange = (e) => {
    const val = e?.target?.value;
    if (onChange) onChange(val);

    if (!isGoogleMapsMode) {
      if (val?.length > 0) {
        setSuggestions(filterSuggestions(val));
        setShowSuggestions(true);
      } else {
        setSuggestions(philippinesLocations?.slice(0, 8));
        setShowSuggestions(true);
      }
    }
  };

  const handleInputFocus = () => {
    if (!isGoogleMapsMode) {
      if (value && value?.length > 0) {
        setSuggestions(filterSuggestions(value));
      } else {
        setSuggestions(philippinesLocations?.slice(0, 8));
      }
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSuggestionClick = (suggestion) => {
    if (onChange) onChange(suggestion);
    if (onPlaceSelect) {
      onPlaceSelect({ address: suggestion, name: suggestion, placeId: null, geometry: null });
    }
    setShowSuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (!isGoogleMapsMode && e?.key === 'Enter') {
      e?.preventDefault();
      if (suggestions?.length > 0) handleSuggestionClick(suggestions?.[0]);
    }
  };

  // Geolocation: get user's current location and reverse-geocode
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);

    navigator.geolocation?.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position?.coords;

        try {
          const apiKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY;
          if (apiKey && apiKey !== 'your-google-maps-api-key-here') {
            await loadGoogleMapsScript(apiKey);
            const geocoder = new window.google.maps.Geocoder();
            geocoder?.geocode(
              { location: { lat: latitude, lng: longitude } },
              (results, status) => {
                setIsLocating(false);
                if (status === 'OK' && results?.[0]) {
                  const address = results?.[0]?.formatted_address;
                  if (onChange) onChange(address);
                  if (onPlaceSelect) {
                    onPlaceSelect({
                      address,
                      name: address,
                      placeId: results?.[0]?.place_id,
                      geometry: results?.[0]?.geometry,
                    });
                  }
                }
              }
            );
          } else {
            // Fallback without Google Maps
            const address = `${latitude?.toFixed(4)}, ${longitude?.toFixed(4)}`;
            if (onChange) onChange(address);
            if (onPlaceSelect) onPlaceSelect({ address, name: address, placeId: null, geometry: null });
            setIsLocating(false);
          }
        } catch (err) {
          console.error('Geocoding error:', err);
          setIsLocating(false);
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative flex items-center">
        {/* Left icon */}
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none z-10">
            <Icon name={icon} size={18} />
          </div>
        )}

        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={value || ''}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          className={`w-full ${icon ? 'pl-9' : 'pl-3'} pr-10 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary ${className || ''}`}
          {...props}
        />

        {/* Use my location button */}
        <button
          type="button"
          onClick={handleUseMyLocation}
          title="Use my current location"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-primary transition-colors"
        >
          {isLocating ? (
            <Icon name="Loader2" size={18} className="animate-spin" />
          ) : (
            <Icon name="LocateFixed" size={18} />
          )}
        </button>
      </div>
      {/* Fallback suggestions dropdown */}
      {!isGoogleMapsMode && showSuggestions && suggestions?.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions?.map((suggestion, index) => (
            <div
              key={index}
              onMouseDown={() => handleSuggestionClick(suggestion)}
              className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-center space-x-2">
                <Icon name="MapPin" size={14} className="text-gray-400 flex-shrink-0" />
                <span className="text-gray-800">{suggestion}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {/* Mode hint */}
      <div className="text-xs mt-1 flex items-center space-x-1">
        {isGoogleMapsMode ? (
          <>
            <Icon name="CheckCircle" size={11} className="text-green-500" />
            <span className="text-green-600">Google Places active — type to search any address</span>
          </>
        ) : (
          <>
            <Icon name="Search" size={11} className="text-blue-500" />
            <span className="text-blue-600">Type to search Philippines locations</span>
          </>
        )}
      </div>
    </div>
  );
};

export default PlacesAutocomplete;