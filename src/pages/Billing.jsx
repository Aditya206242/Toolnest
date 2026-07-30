import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  CreditCard, Calendar, ShieldAlert, FileText, CheckCircle, 
  AlertCircle, RefreshCw, X, ExternalLink, Printer 
} from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';

export default function Billing() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { refreshUser, user } = useAuth();

  // Search parameters for sandbox mock checkout redirection
  const mockProvider = searchParams.get('mock_provider');
  const mockStatus = searchParams.get('mock_status');
  const planName = searchParams.get('plan_name');
  const amount = searchParams.get('amount');
  const txnId = searchParams.get('txn_id');
  const coupon = searchParams.get('coupon');
  
  // Real Stripe redirection verification
  const stripeSessionId = searchParams.get('session_id');

  const [subData, setSubData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutProcessing, setCheckoutProcessing] = useState(!!mockProvider || !!stripeSessionId);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [updatingPlan, setUpdatingPlan] = useState(false);

  // Fetch billing data
  const fetchBillingStatus = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/subscription/status');
      setSubData(res.data.data);
    } catch (err) {
      setError('Failed to fetch billing status from backend.');
    } finally {
      setLoading(false);
    }
  };

  // Handle Mock Sandbox success callback
  useEffect(() => {
    const handleMockCheckout = async () => {
      try {
        await api.post('/subscription/mock-checkout-success', {
          planName,
          provider: mockProvider,
          amount,
          txnId,
          coupon
        });
        
        // Refresh JWT client state role to premium
        await refreshUser();
        
        setSuccess(`Checkout successful! You are now subscribed to ToolNest Premium (${planName}).`);
        setSearchParams({}); // Clean URL params
        fetchBillingStatus();
      } catch (err) {
        setError('Sandbox verification failed.');
      } finally {
        setCheckoutProcessing(false);
      }
    };

    if (mockProvider && mockStatus === 'succeeded') {
      handleMockCheckout();
    }
  }, [mockProvider, mockStatus]);

  // Handle Stripe webhook / session verification callback
  useEffect(() => {
    const handleStripeVerification = async () => {
      try {
        // Stripe webhook usually processes in background. 
        // We poll billing status locally to verify if active state updated.
        await refreshUser();
        setSuccess('Transaction received. Verifying subscription status...');
        setSearchParams({});
        fetchBillingStatus();
      } catch (err) {
        setError('Failed to verify transaction.');
      } finally {
        setCheckoutProcessing(false);
      }
    };

    if (stripeSessionId) {
      handleStripeVerification();
    }
  }, [stripeSessionId]);

  useEffect(() => {
    if (!checkoutProcessing) {
      fetchBillingStatus();
    }
  }, [checkoutProcessing]);

  // Cancel subscription handler
  const handleCancelSubscription = async () => {
    if (!window.confirm('Are you sure you want to cancel your Premium subscription? You will lose access to unlimited conversions and AI tools immediately.')) {
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await api.post('/subscription/cancel');
      setSuccess(res.data.message || 'Subscription cancelled.');
      await refreshUser();
      fetchBillingStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel subscription.');
      setLoading(false);
    }
  };

  // Change Plan handler (Upgrade / Downgrade)
  const handleChangePlan = async (newPlan) => {
    setUpdatingPlan(true);
    setError('');
    try {
      const res = await api.post('/subscription/change-plan', { newPlanName: newPlan });
      setSuccess(res.data.message || 'Plan updated.');
      fetchBillingStatus();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to change plan.');
    } finally {
      setUpdatingPlan(false);
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (checkoutProcessing) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-bold animate-pulse">Verifying Payment Transaction...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO title="Subscription & Billing Settings" robots="noindex, nofollow" />

      {/* Header */}
      <header className="mb-10 pb-6 border-b border-slate-200 dark:border-slate-800/80">
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <CreditCard className="h-8 w-8 text-violet-500" /> Subscription & Billing
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
          Manage your subscription plans, billing cycle, and invoice payment receipts.
        </p>
      </header>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-2xl px-4 py-3.5 mb-6">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-2xl px-4 py-3.5 mb-6">
          <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {loading || !subData ? (
        <div className="flex flex-col items-center justify-center p-20">
          <div className="h-8 w-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
          <span className="text-xs text-slate-400 font-bold mt-2">Loading billing profiles...</span>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Active Subscription Panel */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
              Active plan
            </h2>

            {subData.subscription ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                
                {/* Plan status columns */}
                <div className="md:col-span-8 space-y-3">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-black text-slate-850 dark:text-slate-100 capitalize">
                      ToolNest Premium ({subData.subscription.plan_name})
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase border border-emerald-500/15">
                      {subData.subscription.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 font-semibold">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>Start Date: {formatDate(subData.subscription.current_period_start)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      <span>Renewal / End Date: {formatDate(subData.subscription.current_period_end)}</span>
                    </div>
                  </div>
                </div>

                {/* Subscription Action Triggers (Upgrade / Cancel) */}
                <div className="md:col-span-4 flex flex-col gap-2.5">
                  {subData.subscription.plan_name === 'monthly' ? (
                    <button
                      onClick={() => handleChangePlan('yearly')}
                      disabled={updatingPlan}
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition"
                    >
                      {updatingPlan ? 'Upgrading...' : 'Upgrade to Yearly (-16%)'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleChangePlan('monthly')}
                      disabled={updatingPlan}
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow transition"
                    >
                      {updatingPlan ? 'Downgrading...' : 'Switch to Monthly'}
                    </button>
                  )}

                  <button
                    onClick={handleCancelSubscription}
                    className="w-full py-2.5 border border-dashed border-red-500/20 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-bold rounded-xl transition"
                  >
                    Cancel Subscription
                  </button>
                </div>

              </div>
            ) : (
              <div className="text-center py-8">
                <div className="inline-flex p-4 rounded-full bg-slate-50 dark:bg-slate-950 text-slate-400 mb-4 border border-slate-100 dark:border-slate-800">
                  <ShieldAlert className="h-8 w-8 text-violet-500/40" />
                </div>
                <h3 className="text-base font-bold text-slate-800 dark:text-slate-150">You are on the Standard Free tier</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1.5 mb-6">
                  Upgrade to Premium to execute infinite local utilities, enjoy an ads-free browser experience, and unlock AI upscaling features.
                </p>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow transition"
                >
                  View Premium Plans
                </Link>
              </div>
            )}
          </div>

          {/* Invoices Payment History */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
              Invoice History
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-3 pl-4">Transaction ID</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Method</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Date</th>
                    <th className="p-3 pr-4 text-right">Invoice</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {subData.payments && subData.payments.map((pay) => (
                    <tr key={pay.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                      <td className="p-3 pl-4 font-mono text-[10px] font-bold text-slate-800 dark:text-slate-150">
                        {pay.transaction_id}
                      </td>
                      <td className="p-3 font-bold text-slate-800 dark:text-slate-100">
                        ₹{pay.amount} <span className="text-[9px] font-normal text-slate-400">{pay.currency}</span>
                      </td>
                      <td className="p-3 capitalize font-semibold text-slate-500">
                        {pay.provider}
                      </td>
                      <td className="p-3">
                        <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                          pay.status === 'succeeded'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-red-500/10 text-red-500'
                        }`}>
                          {pay.status}
                        </span>
                      </td>
                      <td className="p-3 text-slate-400 font-medium whitespace-nowrap">
                        {new Date(pay.created_at).toLocaleDateString()}
                      </td>
                      <td className="p-3 pr-4 text-right">
                        {pay.invoice_url ? (
                          <a
                            href={`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/subscription/invoice/${pay.transaction_id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[10px] font-bold text-violet-500 hover:underline"
                          >
                            <Printer className="h-3 w-3" /> Receipt <ExternalLink className="h-2.5 w-2.5" />
                          </a>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {subData.payments && subData.payments.length === 0 && (
                    <tr>
                      <td colSpan="6" className="p-8 text-center text-slate-400 italic">
                        No transactions recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
