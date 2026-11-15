import React, { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { driverRegistrationService } from '../../../services/driverRegistrationService';
import { supabase } from '../../../lib/supabase';

const DocumentUpload = ({ formData, setFormData, errors }) => {
  const [uploading, setUploading] = useState({});
  const [uploadErrors, setUploadErrors] = useState({});

  const requiredDocuments = [
    { key: 'driverLicense', label: 'Driver\'s License', required: true },
    { key: 'insurance', label: 'Vehicle Insurance', required: false },
    { key: 'registration', label: 'Vehicle Registration', required: false },
    { key: 'clearance', label: 'Police/NBI Clearance', required: true },
    { key: 'medicalCert', label: 'Medical Certificate', required: true }
  ];

  const handleFileUpload = async (documentType, file) => {
    if (!file) return;

    // Validate file
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

    if (file?.size > maxSize) {
      setUploadErrors(prev => ({
        ...prev,
        [documentType]: 'File size must be less than 10MB'
      }));
      return;
    }

    if (!allowedTypes?.includes(file?.type)) {
      setUploadErrors(prev => ({
        ...prev,
        [documentType]: 'File must be JPEG, PNG, WebP, or PDF'
      }));
      return;
    }

    setUploading(prev => ({ ...prev, [documentType]: true }));
    setUploadErrors(prev => ({ ...prev, [documentType]: null }));

    try {
      // Get the authenticated user's real ID
      const { data: { user } } = await supabase?.auth?.getUser();
      const userId = user?.id || `guest_${Date.now()}`;
      
      const uploadResult = await driverRegistrationService?.uploadDocument(file, userId, documentType);
      
      // Update form data with uploaded document info
      const currentDocs = formData?.documentsUploaded || [];
      const updatedDocs = [
        ...currentDocs?.filter(doc => doc?.documentType !== documentType),
        {
          documentType: documentType,
          fileName: uploadResult?.fileName,
          filePath: uploadResult?.path,
          uploadedAt: new Date()?.toISOString()
        }
      ];

      setFormData(prev => ({
        ...prev,
        documentsUploaded: updatedDocs
      }));

    } catch (error) {
      setUploadErrors(prev => ({
        ...prev,
        [documentType]: error?.message || 'Upload failed'
      }));
    } finally {
      setUploading(prev => ({ ...prev, [documentType]: false }));
    }
  };

  const isDocumentUploaded = (documentType) => {
    return formData?.documentsUploaded?.some(doc => doc?.documentType === documentType);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Document Upload</h3>
        <p className="text-sm text-gray-600 mb-6">
          Please upload clear, readable copies of the required documents. Accepted formats: JPEG, PNG, WebP, PDF (max 5MB each).
        </p>

        <div className="grid grid-cols-1 gap-6">
          {requiredDocuments?.map((doc) => (
            <div key={doc?.key} className="border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="h-5 w-5 text-gray-400" />
                  <span className="font-medium text-gray-900">
                    {doc?.label}
                    {doc?.required && <span className="text-red-500 ml-1">*</span>}
                  </span>
                </div>
                {isDocumentUploaded(doc?.key) && (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                )}
              </div>

              <div className="mt-2">
                <label htmlFor={`file-${doc?.key}`} className={`relative cursor-pointer bg-white rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500 ${uploading?.[doc?.key] ? 'pointer-events-none opacity-50' : ''}`}>
                  <div className="flex items-center justify-center px-6 py-3 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400">
                    <div className="space-y-1 text-center">
                      {uploading?.[doc?.key] ? (
                        <div className="flex items-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          <span className="text-sm text-gray-600">Uploading...</span>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-8 w-8 text-gray-400" />
                          <div className="flex text-sm text-gray-600">
                            <span className="font-medium text-blue-600 hover:text-blue-500">
                              {isDocumentUploaded(doc?.key) ? 'Replace file' : 'Upload a file'}
                            </span>
                            <span className="pl-1">or drag and drop</span>
                          </div>
                          <p className="text-xs text-gray-500">PNG, JPG, PDF up to 5MB</p>
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
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {uploadErrors?.[doc?.key]}
                  </div>
                )}

                {isDocumentUploaded(doc?.key) && (
                  <div className="mt-2 text-sm text-green-600">
                    <CheckCircle className="inline h-4 w-4 mr-1" />
                    Document uploaded successfully
                  </div>
                )}

                {errors?.[doc?.key] && (
                  <p className="mt-2 text-sm text-red-600">{errors?.[doc?.key]}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DocumentUpload;