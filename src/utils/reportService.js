import { supabase } from '../lib/supabase';

class ReportService {
  // Helper: get user IDs for a company
  async _getCompanyUserIds(companyId) {
    const { data } = await supabase
      ?.from('user_profiles')
      ?.select('id')
      ?.eq('company_id', companyId);
    return data?.map(u => u?.id) || [];
  }

  // Get booking statistics for company
  async getBookingStats(companyId, dateRange = 30) {
    try {
      const startDate = new Date();
      startDate?.setDate(startDate?.getDate() - dateRange);

      const userIds = await this._getCompanyUserIds(companyId);
      if (userIds?.length === 0) {
        return {
          totalBookings: 0, completedBookings: 0, cancelledBookings: 0,
          completionRate: 0, totalCost: '0.00', averageCost: '0.00',
          statusBreakdown: {}, vehicleTypeBreakdown: {}, dateRange
        };
      }

      const { data: bookings, error } = await supabase?.from('bookings')?.select(`
          *,
          user_profiles!bookings_user_id_fkey(company_id, full_name),
          vehicles(name, vehicle_type)
        `)?.in('user_id', userIds)?.gte('created_at', startDate?.toISOString());

      if (error) throw error;

      const totalBookings = bookings?.length || 0;
      const completedBookings = bookings?.filter(b => b?.status === 'completed')?.length || 0;
      const cancelledBookings = bookings?.filter(b => b?.status === 'cancelled')?.length || 0;
      const totalCost = bookings?.reduce((sum, b) => sum + (parseFloat(b?.total_cost) || 0), 0) || 0;

      const statusBreakdown = {};
      bookings?.forEach(booking => {
        const status = booking?.status || 'unknown';
        statusBreakdown[status] = (statusBreakdown?.[status] || 0) + 1;
      });

      const vehicleTypeBreakdown = {};
      bookings?.forEach(booking => {
        const type = booking?.vehicles?.vehicle_type || 'unknown';
        vehicleTypeBreakdown[type] = (vehicleTypeBreakdown?.[type] || 0) + 1;
      });

      return {
        totalBookings,
        completedBookings,
        cancelledBookings,
        completionRate: totalBookings > 0 ? (completedBookings / totalBookings * 100)?.toFixed(1) : 0,
        totalCost: totalCost?.toFixed(2),
        averageCost: totalBookings > 0 ? (totalCost / totalBookings)?.toFixed(2) : 0,
        statusBreakdown,
        vehicleTypeBreakdown,
        dateRange
      };
    } catch (error) {
      console.error('Error fetching booking stats:', error);
      throw error;
    }
  }

  // Get detailed bookings report for export
  async getDetailedReport(companyId, dateRange = 30, format = 'json') {
    try {
      const startDate = new Date();
      startDate?.setDate(startDate?.getDate() - dateRange);

      const userIds = await this._getCompanyUserIds(companyId);
      if (userIds?.length === 0) return format === 'csv' ? '' : [];

      const { data: bookings, error } = await supabase?.from('bookings')?.select(`
          *,
          user_profiles!bookings_user_id_fkey(company_id, full_name, email),
          vehicles(name, vehicle_type, license_plate)
        `)?.in('user_id', userIds)?.gte('created_at', startDate?.toISOString())?.order('created_at', { ascending: false });

      if (error) throw error;

      const reportData = bookings?.map(booking => ({
        bookingId: booking?.id,
        employeeName: booking?.user_profiles?.full_name,
        employeeEmail: booking?.user_profiles?.email,
        vehicleName: booking?.vehicles?.name,
        vehicleType: booking?.vehicles?.vehicle_type,
        licensePlate: booking?.vehicles?.license_plate,
        pickupLocation: booking?.pickup_location,
        dropoffLocation: booking?.dropoff_location,
        pickupDate: new Date(booking.pickup_date)?.toLocaleDateString(),
        pickupTime: new Date(booking.pickup_date)?.toLocaleTimeString(),
        passengerCount: booking?.passenger_count,
        status: booking?.status,
        totalCost: booking?.total_cost,
        notes: booking?.notes,
        createdAt: new Date(booking.created_at)?.toLocaleDateString()
      })) || [];

      if (format === 'csv') {
        return this.convertToCSV(reportData);
      }

      return reportData;
    } catch (error) {
      console.error('Error generating detailed report:', error);
      throw error;
    }
  }

  // Convert data to CSV format
  convertToCSV(data) {
    if (!data || data?.length === 0) return '';

    const headers = Object.keys(data?.[0]);
    const csvHeaders = headers?.join(',');
    
    const csvRows = data?.map(row => {
      return headers?.map(header => {
        const value = row?.[header];
        if (typeof value === 'string' && (value?.includes(',') || value?.includes('"'))) {
          return `"${value?.replace(/"/g, '""')}"`;
        }
        return value || '';
      })?.join(',');
    });

    return [csvHeaders, ...csvRows]?.join('\n');
  }

  // Download report as file
  downloadReport(data, filename, format = 'csv') {
    let content, mimeType;
    
    if (format === 'csv') {
      content = typeof data === 'string' ? data : this.convertToCSV(data);
      mimeType = 'text/csv';
    } else {
      content = JSON.stringify(data, null, 2);
      mimeType = 'application/json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = window.URL?.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${filename}.${format}`;
    document.body?.appendChild(link);
    link?.click();
    document.body?.removeChild(link);
    
    window.URL?.revokeObjectURL(url);
  }

  // Get usage analytics over time
  async getUsageAnalytics(companyId, months = 6) {
    try {
      const startDate = new Date();
      startDate?.setMonth(startDate?.getMonth() - months);

      const userIds = await this._getCompanyUserIds(companyId);
      if (userIds?.length === 0) return [];

      const { data: bookings, error } = await supabase?.from('bookings')?.select(`
          created_at,
          total_cost,
          status
        `)?.in('user_id', userIds)?.gte('created_at', startDate?.toISOString());

      if (error) throw error;

      const monthlyData = {};
      bookings?.forEach(booking => {
        const date = new Date(booking.created_at);
        const monthKey = `${date?.getFullYear()}-${String(date?.getMonth() + 1)?.padStart(2, '0')}`;
        
        if (!monthlyData?.[monthKey]) {
          monthlyData[monthKey] = {
            month: monthKey,
            bookingCount: 0,
            totalCost: 0,
            completedCount: 0
          };
        }
        
        monthlyData[monthKey].bookingCount += 1;
        monthlyData[monthKey].totalCost += parseFloat(booking?.total_cost) || 0;
        
        if (booking?.status === 'completed') {
          monthlyData[monthKey].completedCount += 1;
        }
      });

      return Object.values(monthlyData)?.sort((a, b) => a?.month?.localeCompare(b?.month));
    } catch (error) {
      console.error('Error fetching usage analytics:', error);
      throw error;
    }
  }

  // Get cost analysis by department
  async getCostByDepartment(companyId, dateRange = 30) {
    try {
      const startDate = new Date();
      startDate?.setDate(startDate?.getDate() - dateRange);

      const userIds = await this._getCompanyUserIds(companyId);
      if (userIds?.length === 0) return [];

      const { data: bookings, error } = await supabase?.from('bookings')?.select(`
          total_cost,
          user_profiles!bookings_user_id_fkey(company_id, department, full_name)
        `)?.in('user_id', userIds)?.gte('created_at', startDate?.toISOString());

      if (error) throw error;

      const departmentCosts = {};
      bookings?.forEach(booking => {
        const department = booking?.user_profiles?.department || 'Unknown';
        const cost = parseFloat(booking?.total_cost) || 0;
        
        if (!departmentCosts?.[department]) {
          departmentCosts[department] = {
            department,
            totalCost: 0,
            bookingCount: 0
          };
        }
        
        departmentCosts[department].totalCost += cost;
        departmentCosts[department].bookingCount += 1;
      });

      return Object.values(departmentCosts)?.map(dept => ({
        ...dept,
        averageCost: dept?.bookingCount > 0 ? (dept?.totalCost / dept?.bookingCount)?.toFixed(2) : 0
      }));
    } catch (error) {
      console.error('Error fetching department costs:', error);
      throw error;
    }
  }
}

export default new ReportService();