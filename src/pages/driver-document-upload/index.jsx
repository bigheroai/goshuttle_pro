import React, { useState, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, ArrowLeft, Shield } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { driverRegistrationService } from '../../services/driverRegistrationService';
import { sendDriverEmail } from '../../services/driverEmailService';

const DriverDocumentUpload = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const applicationIdFromState = location?.state?.applicationId;
  const emailFromState = location?.state?.email;

  const [applicationId, setApplicationId] = useState(applicationIdFromState || null);
  const [resolving, setResolving] = useState(!applicationIdFromState && !!emailFromState);
  const [uploading, setUploading] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});
  const [uploadedDocs, setUploadedDocs] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [authError, setAuthError] = useState(false);

  const requiredDocuments = [
    { key: 'driverLicense', label: "Driver\'s License", required: true },
    { key: 'clearance', label: 'Police/NBI Clearance', required: true },
    { key: 'medicalCert', label: 'Medical Certificate', required: true },
    { key: 'insurance', label: 'Vehicle Insurance', required: false },
    { key: 'registration', label: 'Vehicle Registration', required: false },
  ];

  useEffect(() => {
    const init = async () => {
      // If we already have an applicationId, just check auth
      if (applicationIdFromState) {
        const { data: { user } } = await supabase?.auth?.getUser();
        if (!user) {
          // Allow unauthenticated upload if applicationId is provided (driver came from status page)
          // We'll use a special upload path that doesn't require auth
        }
        setResolving(false);
        return;
      }

      // Try to resolve applicationId from email (passed from status page)
      if (emailFromState) {
        try {
          const { data } = await supabase
            ?.from('driver_applications')
            ?.select('id')
            ?.ilike('email', emailFromState?.trim())
            ?.order('created_at', { ascending: false })
            ?.limit(1)
            ?.single();
          if (data?.id) {
            setApplicationId(data?.id);
          }
        } catch (_) {}
        setResolving(false);
        return;
      }

      // Try authenticated user
      const { data: { user } } = await supabase?.auth?.getUser();
      if (user) {
        try {
          const { data } = await supabase
            ?.from('driver_applications')
            ?.select('id')
            ?.eq('user_id', user?.id)
            ?.order('created_at', { ascending: false })
            ?.limit(1)
            ?.single();
          if (data?.id) {
            setApplicationId(data?.id);
          }
        } catch (_) {}
        setResolving(false);
      } else {
        setAuthError(true);
        setResolving(false);
      }
    };

    init();
  }, []);

  const handleFileUpload = async (documentType, file) => {
    if (!file) return;

    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (file?.size > maxSize) {
      setUploadErrors(prev => ({ ...prev, [documentType]: 'File size must be less than 10MB' }));
      return;
    }

    if (!allowedTypes?.includes(file?.type)) {
      setUploadErrors(prev => ({ ...prev, [documentType]: 'File must be JPEG, PNG, WebP, or PDF' }));
      return;
    }

    setUploading(prev => ({ ...prev, [documentType]: true }));
    setUploadErrors(prev => ({ ...prev, [documentType]: null }));

    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      // Use user id if authenticated, otherwise use applicationId as folder name
      const uploadUserId = user?.id || applicationId || 'anonymous';

      const uploadResult = await driverRegistrationService?.uploadDocument(file, uploadUserId, documentType);

      const updatedDocs = [
        ...uploadedDocs?.filter(doc => doc?.documentType !== documentType),
        {
          documentType,
          fileName: uploadResult?.fileName,
          filePath: uploadResult?.path,
          uploadedAt: new Date()?.toISOString()
        }
      ];
      setUploadedDocs(updatedDocs);
    } catch (error) {
      setUploadErrors(prev => ({
        ...prev,
        [documentType]: error?.message || 'Upload failed. Please try again.'
      }));
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const isDocumentUploaded = (documentType) => {
    return uploadedDocs?.some(doc => doc?.documentType === documentType);
  };

  const requiredUploaded = requiredDocuments
    ?.filter(d => d?.required)
    ?.every(d => isDocumentUploaded(d?.key));

  const handleSaveDocuments = async () => {
    if (!requiredUploaded) return;
    setIsSaving(true);
    try {
      if (applicationId) {
        // Update the application with uploaded documents
        const { error } = await supabase
          ?.from('driver_applications')
          ?.update({ documents_uploaded: uploadedDocs, application_status: 'under_review' })
          ?.eq('id', applicationId);
        if (error) throw error;

        // Fetch application email to send notification
        const { data: appData } = await supabase
          ?.from('driver_applications')
          ?.select('email, full_name')
          ?.eq('id', applicationId)
          ?.single();

        if (appData?.email) {
          sendDriverEmail('driver_pending_approval', appData?.email, {
            full_name: appData?.full_name,
            feedback: 'Your documents have been received and are now under review.',
          })?.catch(() => {});
        }
      }
      setSaveSuccess(true);
    } catch (error) {
      setUploadErrors(prev => ({ ...prev, save: error?.message || 'Failed to save documents.' }));
    } finally {
      setIsSaving(false);
    }
  };

  if (resolving) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading your application...</p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">Login Required</h2>
            <p className="text-gray-600 mb-6">You need to be logged in to upload documents.</p>
            <button
              onClick={() => navigate('/driver-application-status')}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 mb-3"
            >
              Check Application Status
            </button>
            <button
              onClick={() => navigate('/driver-login')}
              className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Go to Driver Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (saveSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Documents Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Your documents have been uploaded successfully. Your application is now under review.
            </p>
            <div className="space-y-2 text-sm text-gray-600 text-left bg-gray-50 rounded-lg p-4 mb-6">
              <p>• Background check will be initiated within 24 hours</p>
              <p>• Application review typically takes 3–5 business days</p>
              <p>• We'll contact you with next steps via email</p>
            </div>
            <button
              onClick={() => navigate('/driver-application-status', { state: { applicationId } })}
              className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              View Application Status
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/driver-application-status', { state: { applicationId, email: emailFromState } })}
            className="flex items-center text-sm text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Application Status
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Upload Your Documents</h1>
          <p className="mt-1 text-gray-600">
            Upload clear, readable copies of the required documents to complete your driver application.
          </p>
        </div>

        {/* Security note */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-start space-x-3">
          <Shield className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            Your documents are securely stored and only accessible to GoShuttle administrators for verification purposes.
          </p>
        </div>

        {/* Document Upload Cards */}
        <div className="bg-white shadow-lg rounded-lg p-6 space-y-6">
          {requiredDocuments?.map((doc) => (
            <div key={doc?.key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {doc?.label}
                    {doc?.required && <span className="text-red-500 ml-1">*</span>}
                    {!doc?.required && <span className="text-gray-400 text-xs ml-2">(Optional)</span>}
                  </span>
                </div>
                {isDocumentUploaded(doc?.key) && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>

              <label
                htmlFor={`file-${doc?.key}`}
                className={`relative cursor-pointer block ${uploading?.[doc?.key] ? 'pointer-events-none opacity-50' : ''}`}
              >
                <div className="flex items-center justify-center px-6 py-4 border-2 border-gray-300 border-dashed rounded-md hover:border-blue-400 transition-colors">
                  <div className="space-y-1 text-center">
                    {uploading?.[doc?.key] ? (
                      <div className="flex items-center space-x-2 justify-center">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-600">Uploading...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="mx-auto h-8 w-8 text-gray-400" />
                        <div className="flex text-sm text-gray-600 justify-center">
                          <span className="font-medium text-blue-600 hover:text-blue-500">
                            {isDocumentUploaded(doc?.key) ? 'Replace file' : 'Upload a file'}
                          </span>
                          <span className="pl-1">or drag and drop</span>
                        </div>
                        <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
                <input
                  id={`file-${doc?.key}`}
                  type="file"
                  className="sr-only"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(e) => handleFileUpload(doc?.key, e?.target?.files?.[0])}
                  disabled={uploading?.[doc?.key]}
                />
              </label>

              {uploadErrors?.[doc?.key] && (
                <div className="mt-2 flex items-center text-sm text-red-600">
                  <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                  {uploadErrors?.[doc?.key]}
                </div>
              )}

              {isDocumentUploaded(doc?.key) && (
                <div className="mt-2 text-sm text-green-600 flex items-center">
                  <CheckCircle className="inline h-4 w-4 mr-1" />
                  Document uploaded successfully
                </div>
              )}
            </div>
          ))}

          {/* Save error */}
          {uploadErrors?.save && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center">
              <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-800">{uploadErrors?.save}</p>
            </div>
          )}

          {/* Progress summary */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm text-gray-600">
                Required documents: {requiredDocuments?.filter(d => d?.required && isDocumentUploaded(d?.key))?.length} / {requiredDocuments?.filter(d => d?.required)?.length} uploaded
              </span>
              {requiredUploaded && (
                <span className="text-sm text-green-600 font-medium flex items-center">
                  <CheckCircle className="h-4 w-4 mr-1" />
                  All required docs uploaded
                </span>
              )}
            </div>

            <button
              onClick={handleSaveDocuments}
              disabled={!requiredUploaded || isSaving}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Complete Application
                </>
              )}
            </button>
            {!requiredUploaded && (
              <p className="text-xs text-gray-500 text-center mt-2">
                Upload all required documents (*) to continue
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DriverDocumentUpload;
