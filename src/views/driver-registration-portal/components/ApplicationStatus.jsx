import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle, Building2 } from 'lucide-react';

export default function ApplicationStatus({ application }) {
  if (!application) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No Application Found</h3>
        <p className="mt-1 text-sm text-gray-500">
          You haven't submitted a driver application yet.
        </p>
      </div>
    );
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-8 w-8 text-green-600" />;
      case 'rejected':
        return <XCircle className="h-8 w-8 text-red-600" />;
      case 'pending':
      default:
        return <Clock className="h-8 w-8 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'rejected':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'pending':
      default:
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'approved':
        return {
          title: 'Application Approved!',
          message: 'Congratulations! Your driver application has been approved. You can now start accepting ride requests.'
        };
      case 'rejected':
        return {
          title: 'Application Not Approved',
          message: 'Your application was not approved at this time. Please contact support for more information or to reapply.'
        };
      case 'pending':
      default:
        return {
          title: 'Application Under Review',
          message: 'Your application is being reviewed. We\'ll notify you once a decision has been made.'
        };
    }
  };

  const statusInfo = getStatusMessage(application?.applicationStatus);

  return (
    <div className="space-y-6">
      {/* Status Header */}
      <div className={`rounded-lg border-2 p-6 ${getStatusColor(application?.applicationStatus)}`}>
        <div className="flex items-center">
          {getStatusIcon(application?.applicationStatus)}
          <div className="ml-4">
            <h2 className="text-xl font-semibold">{statusInfo?.title}</h2>
            <p className="mt-1">{statusInfo?.message}</p>
          </div>
        </div>
      </div>
      {/* Application Details */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Application Details</h3>
        </div>

        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Personal Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Full Name:</span>
                <span className="ml-2 text-gray-900">{application?.fullName}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">Phone:</span>
                <span className="ml-2 text-gray-900">{application?.phone}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">License Number:</span>
                <span className="ml-2 text-gray-900">{application?.licenseNumber}</span>
              </div>
              <div>
                <span className="font-medium text-gray-600">License Expiry:</span>
                <span className="ml-2 text-gray-900">
                  {new Date(application.licenseExpiry)?.toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>

          {/* Fleet Information */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Fleet Assignment</h4>
            <div className="flex items-center p-3 bg-gray-50 rounded-md">
              <Building2 className="h-5 w-5 text-gray-400 mr-3" />
              <div>
                <p className="font-medium text-gray-900">
                  {application?.partner ? application?.partner?.name : 'GoShuttle Main Fleet'}
                </p>
                <p className="text-sm text-gray-600">
                  {application?.partner ? application?.partner?.companyName : 'GoShuttle Pro'}
                </p>
              </div>
            </div>
          </div>

          {/* Vehicle Information */}
          {application?.vehicleOwned && application?.vehicleDetails && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Vehicle Information</h4>
              <div className="p-3 bg-gray-50 rounded-md">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-600">Make & Model:</span>
                    <span className="ml-2 text-gray-900">
                      {application?.vehicleDetails?.make} {application?.vehicleDetails?.model}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">Year:</span>
                    <span className="ml-2 text-gray-900">{application?.vehicleDetails?.year}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-600">License Plate:</span>
                    <span className="ml-2 text-gray-900">{application?.vehicleDetails?.licensePlate}</span>
                  </div>
                  {application?.vehicleDetails?.color && (
                    <div>
                      <span className="font-medium text-gray-600">Color:</span>
                      <span className="ml-2 text-gray-900">{application?.vehicleDetails?.color}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Application Timeline</h4>
            <div className="space-y-3">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Application Submitted</p>
                  <p className="text-sm text-gray-500">
                    {new Date(application.createdAt)?.toLocaleDateString()} at{' '}
                    {new Date(application.createdAt)?.toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <div className="flex-shrink-0">
                  {application?.backgroundCheckStatus === 'completed' ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : application?.backgroundCheckStatus === 'in_progress' ? (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  ) : (
                    <div className="h-5 w-5 border-2 border-gray-300 rounded-full"></div>
                  )}
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-900">Background Check</p>
                  <p className="text-sm text-gray-500 capitalize">
                    {application?.backgroundCheckStatus?.replace('_', ' ')}
                  </p>
                </div>
              </div>

              {application?.approvedAt && (
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    {application?.applicationStatus === 'approved' ? (
                      <CheckCircle className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">
                      Application {application?.applicationStatus === 'approved' ? 'Approved' : 'Rejected'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(application.approvedAt)?.toLocaleDateString()} at{' '}
                      {new Date(application.approvedAt)?.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Documents */}
          {application?.documentsUploaded && application?.documentsUploaded?.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Uploaded Documents</h4>
              <div className="space-y-2">
                {application?.documentsUploaded?.map((doc, index) => (
                  <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm text-gray-600">{doc?.name || `Document ${index + 1}`}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Next Steps */}
      {application?.applicationStatus === 'approved' && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <h4 className="text-sm font-medium text-green-900">Next Steps</h4>
          </div>
          <div className="mt-2 text-sm text-green-800">
            <ul className="list-disc list-inside space-y-1">
              <li>Complete your driver profile setup</li>
              <li>Schedule vehicle inspection (if required)</li>
              <li>Attend orientation session</li>
              <li>Download the driver app and start accepting rides</li>
            </ul>
          </div>
        </div>
      )}
      {application?.applicationStatus === 'pending' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-blue-600 mr-2" />
            <h4 className="text-sm font-medium text-blue-900">What's Next?</h4>
          </div>
          <div className="mt-2 text-sm text-blue-800">
            <p>
              We're currently reviewing your application and conducting background checks. This process typically takes 3-5 business days. We'll send you an email 
              notification once a decision has been made.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}