import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Check, Star, AlertCircle, Sparkles, Tag, CreditCard } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../context/AuthContext';
import SEO from '../components/SEO';

export default function Pricing() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  
  const [billingCycle, setBillingCycle] = useState('monthly'); // 'monthly', 'yearly'
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const plans = {
    monthly: { name: 'monthly', price: 199, rawPrice: 199, label: '/ month', desc: 'Unlock continuous local PDF and Image utility pipelines.' },
    yearly: { name: 'yearly', price: 1999, rawPrice: 1999, label: '/ year', desc: 'Best value for designers, developers, and power teams.' }
  };

  const activePlan = plans[billingCycle];
  let finalPrice = activePlan.price;

  if (appliedCoupon) {
    finalPrice = activePlan.price - (activePlan.price * appliedCoupon.discount) / 100;
  }

  const handleValidateCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode) return;
    setCouponLoading(true);
    setCouponError('');
    setAppliedCoupon(null);

    try {
      const res = await api.post('/subscription/coupon/validate', { code: couponCode });
      setAppliedCoupon(res.data.data);
    } catch (err) {
      setCouponError(err.response?.data?.message || 'Invalid discount coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
  };

  const handleCheckout = async (provider) => {
    if (!isAuthenticated) {
      navigate('/login?from=/pricing');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await api.post('/subscription/checkout', {
        planName: activePlan.name,
        provider,
        couponCode: appliedCoupon ? appliedCoupon.code : undefined
      });

      const { url } = res.data.data;
      if (url) {
        // Redirect directly to checkout session page (Stripe checkout url or mock sandbox flow)
        window.location.href = url;
      } else {
        setError('Checkout configuration error. Please try again.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Payment initiation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <SEO 
        title="Pricing Plans - ToolNest Premium"
        description="Unlock unlimited operations, ads-free execution, API integrations, and advanced neural AI background cleaners on ToolNest."
        canonicalUrl={`${window.location.origin}/pricing`}
      />

      {/* Hero Header */}
      <header className="text-center max-w-2xl mx-auto mb-16">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-600/10 text-violet-600 dark:text-violet-400 text-xs font-black uppercase tracking-wider mb-4 border border-violet-500/20">
          <Sparkles className="h-3.5 w-3.5" /> Platform Monetization
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100">
          Elevate Your Workspace
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed mt-3">
          Scale and support private client-side utilities. Free tier is generous, but Premium takes processing limits off.
        </p>
      </header>

      {/* Main Billing Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start max-w-5xl mx-auto">
        
        {/* Left Side: Pricing Tier Selector */}
        <main className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 shadow-sm space-y-6">
          
          {/* Toggle Switch */}
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-2 rounded-2xl border border-slate-200/60 dark:border-slate-850">
            <span className="text-xs font-bold text-slate-655 dark:text-slate-400 pl-2">Select Billing Interval:</span>
            <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1 rounded-xl">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`text-xs font-bold px-4 py-2 rounded-lg transition ${
                  billingCycle === 'monthly'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`text-xs font-bold px-4 py-2 rounded-lg transition relative ${
                  billingCycle === 'yearly'
                    ? 'bg-violet-600 text-white shadow'
                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                Yearly
                <span className="absolute -top-3.5 -right-3.5 bg-red-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full scale-90">
                  -16%
                </span>
              </button>
            </div>
          </div>

          {/* Pricing Details */}
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-slate-900 dark:text-slate-100">
                ₹{finalPrice.toLocaleString()}
              </span>
              <span className="text-slate-400 text-xs font-bold uppercase tracking-wider pl-1">
                {activePlan.label}
              </span>
              {appliedCoupon && (
                <span className="text-slate-400 text-xs line-through ml-2">
                  ₹{activePlan.price}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {activePlan.desc}
            </p>
          </div>

          {/* Checkout Provider Selector */}
          <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800/80">
            {error && (
              <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 text-red-500 text-xs p-3.5 rounded-xl">
                <AlertCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Checkout Provider
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                onClick={() => handleCheckout('stripe')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-violet-600/5 hover:border-violet-500 dark:bg-slate-950 dark:hover:border-violet-500 text-xs font-bold transition text-slate-800 dark:text-slate-200"
              >
                <CreditCard className="h-4.5 w-4.5 text-violet-500" /> Pay via Stripe
              </button>

              <button
                onClick={() => handleCheckout('razorpay')}
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-violet-600/5 hover:border-violet-500 dark:bg-slate-950 dark:hover:border-violet-500 text-xs font-bold transition text-slate-800 dark:text-slate-200"
              >
                <CreditCard className="h-4.5 w-4.5 text-sky-500" /> Pay via Razorpay
              </button>
            </div>
            
            <p className="text-[10px] text-slate-400 text-center italic">
              * Payments processed securely. Cancel subscription anytime from your Account billing settings.
            </p>
          </div>
        </main>

        {/* Right Side: Features List & Coupon Verification */}
        <aside className="lg:col-span-5 space-y-6">
          
          {/* Coupon Code Verification Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-3.5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-1">
              <Tag className="h-3.5 w-3.5 text-violet-500" /> Discount Coupon
            </h3>

            {appliedCoupon ? (
              <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2.5 rounded-xl">
                <div>
                  <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    {appliedCoupon.code} Applied
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {appliedCoupon.description}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveCoupon}
                  className="p-1 rounded-lg text-slate-400 hover:bg-red-500/10 hover:text-red-500 transition"
                >
                  Remove
                </button>
              </div>
            ) : (
              <form onSubmit={handleValidateCoupon} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter coupon (e.g. SAVE20)"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value)}
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-violet-500 outline-none transition"
                />
                <button
                  type="submit"
                  disabled={couponLoading || !couponCode}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition"
                >
                  Verify
                </button>
              </form>
            )}

            {couponError && (
              <span className="text-[10px] text-red-500 block">{couponError}</span>
            )}
            
            <div className="text-[9px] text-slate-400 block pt-1 leading-relaxed">
              💡 Tip: Try typing <span className="font-extrabold text-violet-500">SAVE20</span> or <span className="font-extrabold text-violet-500">WELCOME50</span> to trigger discount tests!
            </div>
          </div>

          {/* Premium Features Checklist */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
              Premium Checklist Features
            </h3>
            <ul className="space-y-4">
              {[
                { title: 'Unlimited Client-Side Operations', desc: 'No daily limits for any conversion utilities.' },
                { title: 'AI Background Remover Access', desc: 'Cut background outlines instantly with neural nets.' },
                { title: 'AI Neural Image Upscaling', desc: 'Upscale resolution up to 4K locally.' },
                { title: 'Priority Execution Timelines', desc: 'Higher local worker memory limits.' },
                { title: '100% Ad-Free interface', desc: 'Zero banners or utility distractions.' },
                { title: 'API Access Credentials', desc: 'Deploy scripts integrating ToolNest endpoints.' }
              ].map((feat, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="p-0.5 rounded-full bg-violet-600/10 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-800 dark:text-slate-100">{feat.title}</span>
                    <span className="block text-[10px] text-slate-450 mt-0.5">{feat.desc}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </aside>

      </div>
    </div>
  );
}
