import React from "react";
import { BrowserRouter, Routes as RouterRoutes, Route } from "react-router-dom";
import ErrorBoundary from './components/ErrorBoundary';
import ScrollToTop from './components/ScrollToTop';

import AdminDashboard from './pages/admin-dashboard';
import SupportCenter from './pages/support-center';
import SmartBookingPortal from './pages/smart-booking-portal';
import LiveTracking from './pages/live-tracking';
import DriverAssignmentSystem from './pages/driver-assignment-system';
import FleetPartnerRegistrationForm from './pages/fleet-partner-registration-form';
import AuthLogin from './pages/auth/Login';
import AuthSignup from './pages/auth/Signup';
import AdminLogin from './pages/auth/AdminLogin';
import DriverLogin from './pages/auth/DriverLogin';
import DriverRegistrationForm from './pages/driver-registration-form';
import DriverDocumentUpload from './pages/driver-document-upload';
import DriverProfile from './pages/driver-profile';
import DriverApplicationStatus from './pages/driver-application-status';
import CustomerAccount from './pages/customer-account';
import CorporateDashboard from './pages/corporate-dashboard';
import PartnerFleetManagement from './pages/partner-fleet-management';
import Homepage from './pages/homepage';
import FleetShowcase from './pages/fleet-showcase';
import RouteNetwork from './pages/route-network';
import NotFound from './pages/NotFound';

import GuestBookingPortal from './pages/guest-booking-portal';
import BookingLookupPortal from './pages/booking-lookup-portal';
import BookingLookup from './pages/booking-lookup';
import EmailTemplatePreview from './pages/email-template-preview';
import NotificationSettings from './pages/notification-settings';
import OpsDashboard from './pages/ops-dashboard';
import AdminHowTo from './pages/admin-how-to';
import HowItWorks from './pages/how-it-works';
import BookingConfirmedPage from './pages/booking-confirmed';
import StaffDashboard from './pages/staff-dashboard';
import CmsPage from './pages/cms-page';
import FleetLiveMap from './pages/fleet-live-map';
import CorporateBillingLedger from './pages/corporate-billing-ledger';
import PartnerPayableLedger from './pages/partner-payable-ledger';
import CorporateReports from './pages/corporate-reports';

export default function Routes() {
  return (
    <BrowserRouter>
      <ErrorBoundary>
        <ScrollToTop />
        <RouterRoutes>
          {/* Authentication Routes */}
          <Route path="/auth/login" element={<AuthLogin />} />
          <Route path="/auth/signup" element={<AuthSignup />} />
          <Route path="/auth/driver-login" element={<DriverLogin />} />
          <Route path="/admin/auth/login" element={<AdminLogin />} />
          
          {/* Main Application Routes */}
          <Route path="/" element={<Homepage />} />
          <Route path="/admin-dashboard" element={<AdminDashboard />} />
          <Route path="/staff-dashboard" element={<StaffDashboard />} />
          <Route path="/support-center" element={<SupportCenter />} />
          <Route path="/smart-booking-portal" element={<SmartBookingPortal />} />
          <Route path="/booking-confirmed" element={<BookingConfirmedPage />} />
          <Route path="/live-tracking" element={<LiveTracking />} />
          <Route path="/driver-assignment-system" element={<DriverAssignmentSystem />} />
          <Route path="/fleet-partner-registration-form" element={<FleetPartnerRegistrationForm />} />
          
          <Route path="/driver-registration-form" element={<DriverRegistrationForm />} />
          <Route path="/driver-document-upload" element={<DriverDocumentUpload />} />
          <Route path="/driver-profile" element={<DriverProfile />} />
          <Route path="/driver-application-status" element={<DriverApplicationStatus />} />
          <Route path="/customer-account" element={<CustomerAccount />} />
          <Route path="/corporate-dashboard" element={<CorporateDashboard />} />
          <Route path="/corporate-billing-ledger" element={<CorporateBillingLedger />} />
          <Route path="/partner-payable-ledger" element={<PartnerPayableLedger />} />
          <Route path="/corporate-reports" element={<CorporateReports />} />
          <Route path="/partner-fleet-management" element={<PartnerFleetManagement />} />
          <Route path="/fleet-showcase" element={<FleetShowcase />} />
          <Route path="/route-network" element={<RouteNetwork />} />
          
          {/* New guest booking routes */}
          <Route path="/guest-booking-portal" element={<GuestBookingPortal />} />
          <Route path="/booking-lookup-portal" element={<BookingLookupPortal />} />
          <Route path="/booking-lookup" element={<BookingLookup />} />
          <Route path="/email-template-preview" element={<EmailTemplatePreview />} />
          <Route path="/notification-settings" element={<NotificationSettings />} />
          <Route path="/ops-dashboard" element={<OpsDashboard />} />
          <Route path="/fleet-live-map" element={<FleetLiveMap />} />

          {/* Help & Guide Routes */}
          <Route path="/admin-how-to" element={<AdminHowTo />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          
          {/* CMS Public Pages */}
          <Route path="/pages/:slug" element={<CmsPage />} />
          
          <Route path="*" element={<NotFound />} />
        </RouterRoutes>
      </ErrorBoundary>
    </BrowserRouter>
  );
}