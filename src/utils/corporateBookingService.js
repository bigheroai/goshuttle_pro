import { supabase } from '../lib/supabase';

class CorporateBookingService {
  // Get company employees for bulk booking
  async getCompanyEmployees(companyId) {
    try {
      const { data, error } = await supabase?.from('company_employees')?.select('*')?.eq('company_id', companyId)?.eq('is_active', true)?.order('employee_name');

      if (error) throw error;

      return data?.map(emp => ({
        id: emp?.id,
        name: emp?.employee_name,
        email: emp?.employee_email,
        department: emp?.department,
        isActive: emp?.is_active,
        createdAt: emp?.created_at
      })) || [];
    } catch (error) {
      console.error('Error fetching company employees:', error);
      throw error;
    }
  }

  // Add new company employee
  async addEmployee(companyId, employeeData) {
    try {
      const { data, error } = await supabase?.from('company_employees')?.insert([{
          company_id: companyId,
          employee_name: employeeData?.name,
          employee_email: employeeData?.email,
          department: employeeData?.department
        }])?.select()?.single();

      if (error) throw error;

      return {
        id: data?.id,
        name: data?.employee_name,
        email: data?.employee_email,
        department: data?.department,
        isActive: data?.is_active,
        createdAt: data?.created_at
      };
    } catch (error) {
      console.error('Error adding employee:', error);
      throw error;
    }
  }

  // Create bulk booking
  async createBulkBooking(bulkBookingData) {
    try {
      const { data, error } = await supabase?.from('bulk_bookings')?.insert([{
          company_id: bulkBookingData?.companyId,
          created_by: bulkBookingData?.createdBy,
          booking_name: bulkBookingData?.bookingName,
          pickup_location: bulkBookingData?.pickupLocation,
          dropoff_location: bulkBookingData?.dropoffLocation,
          pickup_date: bulkBookingData?.pickupDate,
          vehicle_id: bulkBookingData?.vehicleId,
          employee_ids: bulkBookingData?.employeeIds,
          notes: bulkBookingData?.notes
        }])?.select()?.single();

      if (error) throw error;

      // Create individual bookings for each selected employee
      const individualBookings = [];
      for (const employeeId of bulkBookingData?.employeeIds) {
        const employee = await this.getEmployeeById(employeeId);
        if (employee) {
          const booking = await supabase?.from('bookings')?.insert([{
              pickup_location: bulkBookingData?.pickupLocation,
              dropoff_location: bulkBookingData?.dropoffLocation,
              pickup_date: bulkBookingData?.pickupDate,
              vehicle_id: bulkBookingData?.vehicleId,
              passenger_count: 1,
              notes: `Bulk booking: ${bulkBookingData?.bookingName} - Employee: ${employee?.name}`,
              status: 'pending'
            }])?.select()?.single();
          
          if (booking?.data) {
            individualBookings?.push(booking?.data);
          }
        }
      }

      return {
        bulkBooking: {
          id: data?.id,
          bookingName: data?.booking_name,
          pickupLocation: data?.pickup_location,
          dropoffLocation: data?.dropoff_location,
          pickupDate: data?.pickup_date,
          vehicleId: data?.vehicle_id,
          employeeIds: data?.employee_ids,
          status: data?.status,
          createdAt: data?.created_at
        },
        individualBookings
      };
    } catch (error) {
      console.error('Error creating bulk booking:', error);
      throw error;
    }
  }

  // Get employee by ID
  async getEmployeeById(employeeId) {
    try {
      const { data, error } = await supabase?.from('company_employees')?.select('*')?.eq('id', employeeId)?.single();

      if (error) throw error;

      return data ? {
        id: data?.id,
        name: data?.employee_name,
        email: data?.employee_email,
        department: data?.department
      } : null;
    } catch (error) {
      console.error('Error fetching employee:', error);
      return null;
    }
  }

  // Get bulk bookings for company
  async getBulkBookings(companyId) {
    try {
      const { data, error } = await supabase?.from('bulk_bookings')?.select('*, vehicles(name), user_profiles(full_name)')?.eq('company_id', companyId)?.order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map(booking => ({
        id: booking?.id,
        bookingName: booking?.booking_name,
        pickupLocation: booking?.pickup_location,
        dropoffLocation: booking?.dropoff_location,
        pickupDate: booking?.pickup_date,
        vehicleName: booking?.vehicles?.name,
        employeeCount: booking?.employee_ids?.length || 0,
        status: booking?.status,
        createdBy: booking?.user_profiles?.full_name,
        createdAt: booking?.created_at
      })) || [];
    } catch (error) {
      console.error('Error fetching bulk bookings:', error);
      throw error;
    }
  }

  // Get available vehicles
  async getAvailableVehicles() {
    try {
      const { data, error } = await supabase?.from('vehicles')?.select('*')?.eq('status', 'active')?.order('name');

      if (error) throw error;

      return data?.map(vehicle => ({
        id: vehicle?.id,
        name: vehicle?.name,
        capacity: vehicle?.capacity,
        vehicleType: vehicle?.vehicle_type,
        dailyRate: vehicle?.daily_rate,
        features: vehicle?.features
      })) || [];
    } catch (error) {
      console.error('Error fetching vehicles:', error);
      throw error;
    }
  }
}

export default new CorporateBookingService();