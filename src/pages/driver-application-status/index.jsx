import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  CheckCircle, Clock, XCircle, AlertCircle, Upload, FileText,
  ArrowLeft, ChevronRight, RefreshCw, User, Shield, MessageSquare, Mail, Search
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';

const STATUS_STEPS = [
  { key: 'submitted', label: 'Application Submitted', description: 'Your basic info has been received' },
  { key: 'docs_required', label: 'Documents Required', description: 'Upload your required documents' },
  { key: 'under_review', label: 'Under Review', description: 'Admin is reviewing your application' },
  { key: 'approved', label: 'Approved', description: 'Welcome to the GoShuttle team!' },
];

const DOC_LABELS = {
  driverLicense: "Driver\'s License",
  clearance: 'Police/NBI Clearance',
  medicalCert: 'Medical Certificate',
  insurance: 'Vehicle Insurance',
  registration: 'Vehicle Registration',
};

const getStepIndex = (status) => {
  if (status === 'approved') return 3;
  if (status === 'under_review') return 2;
  if (status === 'pending') return 1;
  return 0;
};

const StatusBadge = ({ status }) => {
  const map = {
    pending: { label: 'Pending Review', cls: 'bg-amber-100 text-amber-800 border border-amber-200' },
    under_review: { label: 'Under Review', cls: 'bg-blue-100 text-blue-800 border border-blue-200' },
    approved: { label: 'Approved', cls: 'bg-emerald-100 text-emerald-800 border border-emerald-200' },
    rejected: { label: 'Rejected', cls: 'bg-red-100 text-red-800 border border-red-200' },
    docs_required: { label: 'Docs Required', cls: 'bg-orange-100 text-orange-800 border border-orange-200' },
  };
  const s = map?.[status] || { label: status, cls: 'bg-gray-100 text-gray-700 border border-gray-200' };
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${s?.cls}`}>
      {s?.label}
    </span>
  );
};

const DocStatusBadge = ({ status }) => {
  if (!status) return null;
  const map = {
    approved: { label: 'Approved', cls: 'text-emerald-700 bg-emerald-50 border border-emerald-200' },
    rejected: { label: 'Rejected', cls: 'text-red-700 bg-red-50 border border-red-200' },
    pending: { label: 'Pending', cls: 'text-amber-700 bg-amber-50 border border-amber-200' },
    under_review: { label: 'Under Review', cls: 'text-blue-700 bg-blue-50 border border-blue-200' },
  };
  const s = map?.[status] || { label: status, cls: 'text-gray-600 bg-gray-50 border border-gray-200' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${s?.cls}`}>
      {s?.label}
    </span>
  );
};

// Email lookup form shown when driver is not authenticated and has no applicationId
const EmailLookupForm = ({ onFound }) => {
  const [email, setEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e?.preventDefault();
    if (!email?.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setSearching(true);
    setError('');
    try {
      const { data, error: fetchError } = await supabase
        ?.rpc('lookup_driver_application_by_email', { lookup_email: email?.trim() });

      if (fetchError) {
        setError('No application found with that email address. Please check and try again.');
        return;
      }

      const record = Array.isArray(data) ? data?.[0] : null;
      if (!record) {
        setError('No application found with that email address. Please check and try again.');
        return;
      }
      onFound(record);
    } catch (err) {
      setError('No application found with that email address. Please check and try again.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="max-w-md mx-auto px-4 sm:px-6">
          {/* Icon + title */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
              <Search className="w-7 h-7 text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Check Application Status</h1>
            <p className="mt-2 text-sm text-gray-500">
              Enter the email address you used when signing up as a driver.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div>
                <label htmlFor="lookup-email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="lookup-email"
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e?.target?.value); setError(''); }}
                    placeholder="your.email@example.com"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                {error && (
                  <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={searching}
                className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {searching ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4" />
                    Find My Application
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 pt-5 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500 mb-3">Haven't applied yet?</p>
              <a
                href="/driver-registration-form"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                Apply to be a GoShuttle Driver →
              </a>
            </div>
          </div>

          {/* Info box */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-blue-800 mb-1">What you can do here</p>
                <ul className="text-xs text-blue-700 space-y-1">
                  <li>• Check your current application status</li>
                  <li>• Upload required documents</li>
                  <li>• View admin feedback on your application</li>
                  <li>• Track your verification progress</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default function DriverApplicationStatus() {
  const navigate = useNavigate();
  const location = useLocation();
  const [application, setApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [docUrls, setDocUrls] = useState({});
  const [showLookup, setShowLookup] = useState(false);

  // Support passing applicationId via state or query param
  const applicationIdFromState = location?.state?.applicationId;
  const searchParams = new URLSearchParams(location?.search);
  const applicationIdFromQuery = searchParams?.get('id');
  const applicationId = applicationIdFromState || applicationIdFromQuery;

  // Also support pre-loaded application passed via state (from email lookup)
  const applicationFromState = location?.state?.application;

  useEffect(() => {
    if (applicationFromState) {
      setApplication(applicationFromState);
      if (applicationFromState?.documents_uploaded?.length > 0) {
        loadDocUrls(applicationFromState?.documents_uploaded);
      }
      setLoading(false);
      return;
    }
    loadApplication();
  }, [applicationId]);

  const loadApplication = async () => {
    try {
      setLoading(true);
      setError('');

      let query = supabase?.from('driver_applications')?.select('*');

      if (applicationId) {
        query = query?.eq('id', applicationId);
      } else {
        // Try to find by authenticated user
        const { data: { user } } = await supabase?.auth?.getUser();
        if (user) {
          query = query?.eq('user_id', user?.id);
        } else {
          // No applicationId and not authenticated — show email lookup
          setShowLookup(true);
          setLoading(false);
          return;
        }
      }

      const { data, error: fetchError } = await query?.order('created_at', { ascending: false })?.limit(1)?.single();
      if (fetchError) throw fetchError;
      setApplication(data);

      // Load document signed URLs
      if (data?.documents_uploaded?.length > 0) {
        await loadDocUrls(data?.documents_uploaded);
      }
    } catch (err) {
      setError(err?.message || 'Could not load your application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDocUrls = async (docs) => {
    const urls = {};
    for (const doc of docs || []) {
      if (doc?.filePath || doc?.path) {
        try {
          const { data } = await supabase?.storage
            ?.from('driver-documents')
            ?.createSignedUrl(doc?.filePath || doc?.path, 3600);
          if (data?.signedUrl) {
            urls[doc?.documentType] = data?.signedUrl;
          }
        } catch (_) {}
      }
    }
    setDocUrls(urls);
  };

  const handleEmailLookupFound = (foundApplication) => {
    setApplication(foundApplication);
    setShowLookup(false);
    if (foundApplication?.documents_uploaded?.length > 0) {
      loadDocUrls(foundApplication?.documents_uploaded);
    }
  };

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3" />
            <p className="text-sm text-gray-500">Loading your application...</p>
          </div>
        </div>
      </>
    );
  }

  // Show email lookup form for unauthenticated drivers
  if (showLookup && !application) {
    return <EmailLookupForm onFound={handleEmailLookupFound} />;
  }

  if (error && !application) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16 px-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 max-w-md w-full text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Application Not Found</h2>
            <p className="text-sm text-gray-500 mb-6">{error}</p>
            <button
              onClick={() => navigate('/driver-registration-form')}
              className="w-full py-2.5 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Apply Now
            </button>
          </div>
        </div>
      </>
    );
  }

  const status = application?.application_status || 'pending';
  const stepIndex = getStepIndex(status);
  const docs = application?.documents_uploaded || [];
  const docReviewStatuses = application?.doc_review_statuses || {};
  const hasDocuments = docs?.length > 0;

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 pt-20 pb-12">
        <div className="max-w-2xl mx-auto px-4 sm:px-6">

          {/* Back */}
          <button
            onClick={() => {
              if (applicationIdFromState || applicationIdFromQuery) {
                navigate(-1);
              } else {
                setApplication(null);
                setShowLookup(true);
              }
            }}
            className="flex items-center text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back
          </button>

          {/* Header card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">{application?.full_name}</h1>
                  <p className="text-sm text-gray-500">{application?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={status} />
                <button
                  onClick={loadApplication}
                  className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Progress tracker */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-5">Application Progress</h2>
            <div className="relative">
              {/* Connector line */}
              <div className="absolute left-4 top-5 bottom-5 w-0.5 bg-gray-200" />
              <div
                className="absolute left-4 top-5 w-0.5 bg-blue-500 transition-all duration-500"
                style={{ height: `${(stepIndex / (STATUS_STEPS?.length - 1)) * 100}%` }}
              />
              <div className="space-y-6">
                {STATUS_STEPS?.map((step, idx) => {
                  const isCompleted = idx < stepIndex;
                  const isCurrent = idx === stepIndex;
                  const isRejected = status === 'rejected' && idx === stepIndex;
                  return (
                    <div key={step?.key} className="flex items-start gap-4 relative">
                      <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                        isRejected ? 'bg-red-100 border-red-400' :
                        isCompleted ? 'bg-blue-600 border-blue-600' : isCurrent ? 'bg-white border-blue-500' : 'bg-white border-gray-300'
                      }`}>
                        {isRejected ? (
                          <XCircle className="w-4 h-4 text-red-500" />
                        ) : isCompleted ? (
                          <CheckCircle className="w-4 h-4 text-white fill-current" />
                        ) : isCurrent ? (
                          <Clock className="w-4 h-4 text-blue-500" />
                        ) : (
                          <div className="w-2 h-2 rounded-full bg-gray-300" />
                        )}
                      </div>
                      <div className="pt-0.5">
                        <p className={`text-sm font-medium ${
                          isCompleted || isCurrent ? 'text-gray-900' : 'text-gray-400'
                        }`}>{step?.label}</p>
                        <p className={`text-xs mt-0.5 ${
                          isCompleted || isCurrent ? 'text-gray-500' : 'text-gray-300'
                        }`}>{step?.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Admin Feedback */}
          {(application?.admin_feedback || application?.rejection_reason || application?.kyc_notes) && (
            <div className={`rounded-xl border p-5 mb-5 ${
              status === 'rejected' ? 'bg-red-50 border-red-200' :
              status === 'approved' ? 'bg-emerald-50 border-emerald-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-start gap-3">
                <MessageSquare className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                  status === 'rejected' ? 'text-red-500' :
                  status === 'approved' ? 'text-emerald-600' : 'text-blue-600'
                }`} />
                <div>
                  <p className={`text-sm font-semibold mb-1 ${
                    status === 'rejected' ? 'text-red-800' :
                    status === 'approved' ? 'text-emerald-800' : 'text-blue-800'
                  }`}>Admin Feedback</p>
                  <p className={`text-sm ${
                    status === 'rejected' ? 'text-red-700' :
                    status === 'approved' ? 'text-emerald-700' : 'text-blue-700'
                  }`}>
                    {application?.admin_feedback || application?.rejection_reason || application?.kyc_notes}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Next Action */}
          {application?.next_action && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-5">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800 mb-1">Action Required</p>
                  <p className="text-sm text-amber-700">{application?.next_action}</p>
                </div>
              </div>
            </div>
          )}

          {/* Uploaded Documents */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Documents</h2>
              <button
                onClick={() => navigate('/driver-document-upload', { state: { applicationId: application?.id, email: application?.email } })}
                className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                {hasDocuments ? 'Update Docs' : 'Upload Docs'}
              </button>
            </div>

            {!hasDocuments ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg">
                <FileText className="mx-auto w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500 mb-3">No documents uploaded yet</p>
                <button
                  onClick={() => navigate('/driver-document-upload', { state: { applicationId: application?.id, email: application?.email } })}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  Upload Documents
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {docs?.map((doc, idx) => {
                  const docType = doc?.documentType || doc?.document_type;
                  const docStatus = docReviewStatuses?.[docType];
                  const docNote = application?.document_verification_notes?.[docType];
                  const signedUrl = docUrls?.[docType];
                  return (
                    <div key={idx} className="flex items-start justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <FileText className="w-4 h-4 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">
                            {DOC_LABELS?.[docType] || docType || doc?.fileName || `Document ${idx + 1}`}
                          </p>
                          {docNote && (
                            <p className="text-xs text-gray-500 mt-0.5">{docNote}</p>
                          )}
                          {signedUrl && (
                            <a
                              href={signedUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline mt-0.5 inline-block"
                            >
                              View document
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 ml-3">
                        <DocStatusBadge status={docStatus || 'pending'} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Next Steps */}
          {status === 'approved' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 mb-5">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-emerald-800 mb-2">You're approved! Next steps:</p>
                  <ul className="text-sm text-emerald-700 space-y-1">
                    <li className="flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5" /> Complete your driver profile</li>
                    <li className="flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5" /> Schedule your vehicle inspection</li>
                    <li className="flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5" /> Attend orientation session</li>
                    <li className="flex items-center gap-1.5"><ChevronRight className="w-3.5 h-3.5" /> Download the GoShuttle driver app</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {status === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-5">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-blue-800 mb-1">What happens next?</p>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• Upload your required documents to proceed</li>
                    <li>• Background check initiated within 24 hours</li>
                    <li>• Review typically takes 3–5 business days</li>
                    <li>• You'll receive email updates at each stage</li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {!hasDocuments && (
              <button
                onClick={() => navigate('/driver-document-upload', { state: { applicationId: application?.id, email: application?.email } })}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload Required Documents
              </button>
            )}
            <button
              onClick={() => navigate('/driver-profile')}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
            >
              Complete My Profile
            </button>
          </div>

          {/* Application ID */}
          <p className="text-center text-xs text-gray-400 mt-6">
            Application ID: <span className="font-mono">{application?.id?.slice(0, 8)}...</span>
          </p>
        </div>
      </div>
    </>
  );
}
