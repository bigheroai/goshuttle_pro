import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const DateTimeSelector = ({ onDateTimeSelect, selectedDateTime, onPassengerCountUpdate, passengerCount, onComplete }) => {
  const [selectedDate, setSelectedDate] = useState(selectedDateTime?.date || '');
  const [selectedTime, setSelectedTime] = useState(selectedDateTime?.time || '');
  const [currentPassengerCount, setCurrentPassengerCount] = useState(passengerCount || 1);
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return { year: today?.getFullYear(), month: today?.getMonth() };
  });

  // Generate available dates (next 30 days)
  const generateAvailableDates = () => {
    const dates = [];
    const today = new Date();
    
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date?.setDate(today?.getDate() + i);
      
      const dateString = date?.toISOString()?.split('T')?.[0];
      const dayName = date?.toLocaleDateString('en-US', { weekday: 'short' });
      const dayNumber = date?.getDate();
      const monthName = date?.toLocaleDateString('en-US', { month: 'short' });
      
      dates?.push({
        value: dateString,
        label: `${dayName}, ${monthName} ${dayNumber}`,
        isToday: i === 0,
        isWeekend: date?.getDay() === 0 || date?.getDay() === 6
      });
    }
    
    return dates;
  };

  // Generate available time slots
  const generateTimeSlots = () => {
    const slots = [];
    
    for (let hour = 5; hour <= 23; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour?.toString()?.padStart(2, '0')}:${minute?.toString()?.padStart(2, '0')}`;
        const displayTime = new Date(`2000-01-01T${timeString}`)?.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
        
        slots?.push({
          value: timeString,
          label: displayTime
        });
      }
    }
    
    return slots;
  };

  const availableDates = generateAvailableDates();
  const availableTimeSlots = generateTimeSlots();

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setShowCalendar(false);
    if (date && selectedTime) {
      onDateTimeSelect?.({ date, time: selectedTime });
    } else if (date) {
      onDateTimeSelect?.({ date, time: selectedTime });
    }
  };

  const handleTimeSelect = (time) => {
    setSelectedTime(time);
    if (selectedDate && time) {
      onDateTimeSelect?.({ date: selectedDate, time });
    }
  };

  const handlePassengerCountChange = (count) => {
    if (count >= 1 && count <= 12) {
      setCurrentPassengerCount(count);
      onPassengerCountUpdate?.(count);
    }
  };

  // Calendar helpers
  const today = new Date();
  today?.setHours(0, 0, 0, 0);

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0)?.getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1)?.getDay();

  const prevMonth = () => {
    setCalendarMonth(prev => {
      if (prev?.month === 0) return { year: prev?.year - 1, month: 11 };
      return { year: prev?.year, month: prev?.month - 1 };
    });
  };

  const nextMonth = () => {
    setCalendarMonth(prev => {
      if (prev?.month === 11) return { year: prev?.year + 1, month: 0 };
      return { year: prev?.year, month: prev?.month + 1 };
    });
  };

  const renderCalendar = () => {
    const { year, month } = calendarMonth;
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const monthName = new Date(year, month, 1)?.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const cells = [];
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      cells?.push(<div key={`empty-${i}`} />);
    }
    // Day cells
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(year, month, day);
      dateObj?.setHours(0, 0, 0, 0);
      const dateString = `${year}-${String(month + 1)?.padStart(2, '0')}-${String(day)?.padStart(2, '0')}`;
      const isPast = dateObj < today;
      const isSelected = selectedDate === dateString;
      const isToday = dateObj?.getTime() === today?.getTime();
      const isWeekend = dateObj?.getDay() === 0 || dateObj?.getDay() === 6;

      cells?.push(
        <button
          key={day}
          disabled={isPast}
          onClick={() => !isPast && handleDateSelect(dateString)}
          className={`
            w-9 h-9 rounded-full text-sm font-medium transition-all duration-150 mx-auto flex items-center justify-center
            ${isPast ? 'text-gray-300 cursor-not-allowed' : ''}
            ${!isPast && isSelected ? 'bg-primary text-white' : ''}
            ${!isPast && !isSelected && isToday ? 'border-2 border-primary text-primary' : ''}
            ${!isPast && !isSelected && !isToday && isWeekend ? 'text-amber-600 hover:bg-blue-50' : ''}
            ${!isPast && !isSelected && !isToday && !isWeekend ? 'text-gray-700 hover:bg-blue-50' : ''}
          `}
        >
          {day}
        </button>
      );
    }

    return (
      <div className="absolute z-50 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg p-4 w-72">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <button onClick={prevMonth} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <Icon name="ChevronLeft" size={18} className="text-gray-600" />
          </button>
          <span className="text-sm font-semibold text-gray-900">{monthName}</span>
          <button onClick={nextMonth} className="p-1 rounded hover:bg-gray-100 transition-colors">
            <Icon name="ChevronRight" size={18} className="text-gray-600" />
          </button>
        </div>
        {/* Day labels */}
        <div className="grid grid-cols-7 mb-1">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']?.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
          ))}
        </div>
        {/* Day cells */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells}
        </div>
        {/* Close button */}
        <div className="mt-3 border-t pt-2 flex justify-end">
          <button
            onClick={() => setShowCalendar(false)}
            className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Select Date, Time & Passengers</h3>
      {/* Passenger Count Section */}
      <div className="mb-8">
        <label className="block text-sm font-medium text-gray-700 mb-3">Number of Passengers</label>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePassengerCountChange(currentPassengerCount - 1)}
            disabled={currentPassengerCount <= 1}
          >
            <Icon name="Minus" size={16} />
          </Button>
          <span className="text-lg font-semibold text-gray-900 min-w-[2rem] text-center">
            {currentPassengerCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePassengerCountChange(currentPassengerCount + 1)}
            disabled={currentPassengerCount >= 12}
          >
            <Icon name="Plus" size={16} />
          </Button>
          <span className="text-sm text-gray-500">
            (Maximum 12 passengers)
          </span>
        </div>
        
        {currentPassengerCount > 5 && (
          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Icon name="Users" size={16} className="text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-700">
                <p className="font-medium">Large Group Booking</p>
                <p>For {currentPassengerCount} passengers, only van vehicles will be available in the next step.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Date Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Date {selectedDate && <span className="text-green-600 ml-1">✓</span>}
        </label>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {availableDates?.slice(0, 12)?.map((date) => (
            <button
              key={date?.value}
              onClick={() => handleDateSelect(date?.value)}
              className={`p-3 rounded-lg border text-sm font-medium transition-all duration-200 ${
                selectedDate === date?.value
                  ? 'border-primary bg-blue-50 text-primary' :'border-gray-200 hover:border-primary hover:bg-gray-50'
              } ${date?.isToday ? 'ring-2 ring-primary ring-opacity-20' : ''}`}
            >
              <div className="text-center">
                <div className={`text-xs ${date?.isWeekend ? 'text-amber-600' : 'text-gray-500'}`}>
                  {date?.label?.split(',')?.[0]}
                </div>
                <div className="mt-1">
                  {date?.label?.split(',')?.[1]?.trim()}
                </div>
                {date?.isToday && (
                  <div className="text-xs text-primary font-semibold mt-1">Today</div>
                )}
              </div>
            </button>
          ))}
        </div>
        
        {/* More Dates Button with Calendar */}
        <div className="mt-3 flex items-center gap-3 relative">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCalendar(prev => !prev)}
          >
            <Icon name="Calendar" size={16} className="mr-2" />
            More Dates
          </Button>

          {showCalendar && renderCalendar()}

          {selectedDate && !availableDates?.slice(0, 12)?.find(d => d?.value === selectedDate) && (
            <span className="text-sm text-primary font-medium">
              {new Date(selectedDate + 'T00:00:00')?.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              <span className="text-green-600 ml-1">✓</span>
            </span>
          )}
        </div>
      </div>

      {/* Time Selection */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Time {selectedTime && <span className="text-green-600 ml-1">✓</span>}
        </label>
        
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-600 mb-2">Popular Times</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {['06:00', '08:00', '17:00', '19:00']?.map((time) => {
              const timeSlot = availableTimeSlots?.find(slot => slot?.value === time);
              return (
                <button
                  key={time}
                  onClick={() => handleTimeSelect(time)}
                  className={`p-2 rounded-lg border text-sm font-medium transition-all duration-200 ${
                    selectedTime === time
                      ? 'border-primary bg-blue-50 text-primary' :'border-gray-200 hover:border-primary hover:bg-gray-50'
                  }`}
                >
                  {timeSlot?.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 mb-2">All Available Times</h4>
          <div className="grid grid-cols-3 md:grid-cols-6 gap-2 max-h-40 overflow-y-auto">
            {availableTimeSlots?.map((timeSlot) => (
              <button
                key={timeSlot?.value}
                onClick={() => handleTimeSelect(timeSlot?.value)}
                className={`p-2 rounded-lg border text-xs font-medium transition-all duration-200 ${
                  selectedTime === timeSlot?.value
                    ? 'border-primary bg-blue-50 text-primary' :'border-gray-200 hover:border-primary hover:bg-gray-50'
                }`}
              >
                {timeSlot?.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Selection Summary */}
      {(selectedDate || selectedTime || currentPassengerCount > 1) && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-2">Selection Summary</h4>
          <div className="text-sm text-gray-600 space-y-1">
            <div className="flex items-center space-x-2">
              <Icon name="Users" size={16} className="text-gray-400" />
              <span>Passengers: {currentPassengerCount}</span>
            </div>
            {selectedDate && (
              <div className="flex items-center space-x-2">
                <Icon name="Calendar" size={16} className="text-gray-400" />
                <span>Date: {availableDates?.find(d => d?.value === selectedDate)?.label || selectedDate}</span>
              </div>
            )}
            {selectedTime && (
              <div className="flex items-center space-x-2">
                <Icon name="Clock" size={16} className="text-gray-400" />
                <span>Time: {availableTimeSlots?.find(t => t?.value === selectedTime)?.label}</span>
              </div>
            )}
          </div>
          {selectedDate && selectedTime && (
            <div className="mt-3 flex items-center text-green-600 text-sm font-medium">
              <Icon name="CheckCircle" size={16} className="mr-1" />
              Date &amp; time confirmed — proceeding to vehicle selection
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DateTimeSelector;