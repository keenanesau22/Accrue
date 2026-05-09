
import React, { useState } from 'react';
import { UserStats } from '../types';
import { ShieldCheck, Mail, Lock, User, ArrowRight, Loader2, Crown, Check, X, Eye, EyeOff, AlertCircle, ScanFace, Zap } from 'lucide-react';
import CheckoutView from '../components/CheckoutView';
import { auth, signIn, signUp, saveUserData, resetPassword, getUser } from '../services/supabaseService';
import { supabase } from '../lib/supabase';

type AuthMode = 'signin' | 'signup_details' | 'signup_verify' | 'signup_password' | 'signup_plan' | 'signup_checkout' | 'forgot_email';

interface AuthViewProps {
  onAuthComplete: (user: UserStats) => void;
  existingUser: UserStats | null;
}

const AuthView: React.FC<AuthViewProps> = ({ onAuthComplete, existingUser }) => {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'lite' | 'pro'>('pro');
  const [error, setError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });

  const ADMIN_EMAIL = 'admin@accrue.finance';
  const ADMIN_PASS = 'pass';

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    if (error) setError(null);
  };

  /**
   * Helper to create the standard admin profile structure
   */
  const createAdminProfile = (id: string): UserStats => ({
    username: 'admin',
    email: ADMIN_EMAIL,
    id: id,
    bio: 'Root Administrator & Wealth Strategist.',
    profilePicture: '🦁',
    streak: 1,
    gems: 999,
    level: 99,
    isPremium: true,
    isAdmin: true,
    role: 'admin',
    isVerified: true,
    dailyAiQuestionsCount: 0,
    lastAiQuestionDate: new Date().toISOString(),
    completedLessonIds: [],
    purchasedTemplateIds: [],
    unlockedToolIds: [],
    lastActiveDate: new Date().toISOString(),
    totalCorrectAnswers: 0,
    perfectLessons: 0,
    archetypeId: 'strategist',
    archetypeScores: { riskTolerance: 80, timeHorizon: 90, spendingDiscipline: 90, marketSavvy: 95, debtSentiment: 40, assetGrowth: 85 },
    hasCompletedTutorial: true,
    notifications: []
  });

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    // 10-second timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Connection Timeout - Please Check API Keys")), 10000)
    );

    const isMagicAdmin = (formData.email && formData.email.toLowerCase() === ADMIN_EMAIL && formData.password === ADMIN_PASS) || 
                         (formData.email === 'admin' && formData.password === 'pass');

    const effectiveEmail = formData.email === 'admin' ? ADMIN_EMAIL : formData.email;
    const effectivePassword = formData.password === 'pass' ? ADMIN_PASS : formData.password;

    try {
      const signInPromise = (async () => {
        if (isMagicAdmin) {
          // Try signing in first
          try {
            await signIn(effectiveEmail, effectivePassword);
          } catch (signInErr: any) {
            // If user doesn't exist, create it on the fly for this specific admin credential
            const userCred = await signUp(effectiveEmail, effectivePassword);
            const adminProfile = createAdminProfile(userCred.user.id);
            
            // Ensure profile is created in 'profiles' table
            await supabase
              .from('profiles')
              .upsert([{ id: userCred.user.id, profile: adminProfile, netWorth: { accounts: [], lastSynced: new Date().toISOString() } }]);

            await saveUserData(userCred.user.id, { 
              profile: adminProfile,
              netWorth: { accounts: [], lastSynced: new Date().toISOString() }
            });
          }
        } else {
          await signIn(effectiveEmail, effectivePassword);
        }

        // Fetch user after sign-in
        const user = await getUser();
        if (!user) throw new Error("Failed to get user after sign-in");

        // Fetch profile to check role
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) throw profileError;

        onAuthComplete({ ...profileData.profile, id: user.id });
      })();

      await Promise.race([signInPromise, timeoutPromise]);

    } catch (err: any) {
      setError(err.message || "Invalid email or password.");
      setIsLoading(false);
    }
  };

  const handleStartSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    handleFinalize();
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await resetPassword(formData.email);
      setError("Reset link sent to your email!");
      setMode('signin');
    } catch (err: any) {
      setError(err.message || "Failed to send reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = () => {
    if (selectedPlan === 'pro') {
      setMode('signup_checkout');
    } else {
      handleFinalize();
    }
  };

  const handleFinalize = async () => {
    setIsLoading(true);
    try {
      const userCredential = await signUp(formData.email, formData.password);
      const user = userCredential.user;

      const isAdminEmail = formData.email.toLowerCase() === ADMIN_EMAIL;

      const newUser: UserStats = isAdminEmail ? createAdminProfile(user.id) : {
        username: formData.username || formData.email.split('@')[0],
        email: formData.email,
        id: user.id,
        bio: 'New explorer on the path to wealth.',
        profilePicture: null,
        streak: 1,
        gems: 550,
        level: 1,
        isPremium: true,
        isAdmin: false, 
        role: 'user',
        isVerified: true,
        dailyAiQuestionsCount: 0,
        lastAiQuestionDate: new Date().toISOString(),
        completedLessonIds: [],
        purchasedTemplateIds: [],
        unlockedToolIds: [],
        lastActiveDate: new Date().toISOString(),
        totalCorrectAnswers: 0,
        perfectLessons: 0,
        archetypeId: null,
        archetypeScores: { riskTolerance: 50, timeHorizon: 50, spendingDiscipline: 50, marketSavvy: 50, debtSentiment: 50, assetGrowth: 50 },
        hasCompletedTutorial: false,
        notifications: []
      };

      // Ensure profile is created in 'profiles' table
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: user.id, profile: newUser, netWorth: { accounts: [], lastSynced: new Date().toISOString() } }]);
      
      if (profileError) throw profileError;

      await saveUserData(user.id, { 
        profile: newUser,
        netWorth: { accounts: [], lastSynced: new Date().toISOString() }
      });
      
      onAuthComplete(newUser);
    } catch (err: any) {
      setError(err.message || "Failed to create account.");
    } finally {
      setIsLoading(false);
    }
  };

  const isSignInFlow = mode === 'signin' || mode === 'forgot_email';
  const isSignUpFlow = mode.startsWith('signup_');

  return (
    <div className="min-h-screen bg-[#fcfcfc] flex items-center justify-center p-4 md:p-10">
      <div className={`w-full ${['signup_plan', 'signup_checkout'].includes(mode) ? 'max-w-5xl' : 'max-w-md'} space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500`}>
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-emerald-500 rounded-[2.2rem] shadow-xl shadow-emerald-100 text-white text-4xl font-fredoka font-bold relative group">A</div>
          <h1 className="text-3xl font-fredoka font-bold text-gray-800">Accrue</h1>
        </div>

        <div className="bg-white p-6 md:p-10 rounded-[3.5rem] border-2 border-gray-100 shadow-2xl relative overflow-hidden">
          
          {/* Tabs */}
          {!['signup_plan', 'signup_checkout'].includes(mode) && (
            <div className="flex bg-gray-100 p-1.5 rounded-[1.8rem] mb-10">
              <button
                onClick={() => { setMode('signin'); setError(null); }}
                className={`flex-1 py-3 rounded-[1.4rem] text-sm font-bold transition-all ${isSignInFlow ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Sign In
              </button>
              <button
                onClick={() => { setMode('signup_details'); setError(null); }}
                className={`flex-1 py-3 rounded-[1.4rem] text-sm font-bold transition-all ${isSignUpFlow ? 'bg-white text-emerald-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                Create Account
              </button>
            </div>
          )}

          {error && (
            <div className={`mb-6 p-4 border rounded-2xl flex items-center gap-3 animate-in shake ${error.includes('sent') || error.includes('successful') ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-rose-50 border-rose-100 text-rose-600'}`}>
              <AlertCircle size={18} />
              <p className="text-xs font-bold">{error}</p>
            </div>
          )}

          {mode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-6">
              <h2 className="text-2xl font-fredoka font-bold text-gray-800 text-center">Welcome Back</h2>
              <div className="space-y-4">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500" size={20} />
                  <input required id="login_email" name="email" type="text" placeholder="Email or Username" value={formData.email} onChange={handleInputChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-12 py-4 font-bold text-black focus:outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500" size={20} />
                  <input required id="login_password" type={showPassword ? "text" : "password"} name="password" placeholder="Password" value={formData.password} onChange={handleInputChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-12 py-4 font-bold pr-12 text-black focus:outline-none focus:border-emerald-500 transition-all" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-emerald-500">
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-[0_6px_0_#059669] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all flex items-center justify-center gap-2">
                {isLoading ? <Loader2 className="animate-spin" /> : <>SIGN IN <ArrowRight /></>}
              </button>
              <div className="text-center text-sm font-bold">
                <button type="button" onClick={() => setMode('forgot_email')} className="text-emerald-500 hover:underline">Forgot Password?</button>
              </div>
            </form>
          )}

          {mode === 'forgot_email' && (
            <form onSubmit={handleForgotPassword} className="space-y-6">
              <h2 className="text-2xl font-fredoka font-bold text-gray-800 text-center">Reset Password</h2>
              <p className="text-xs text-gray-500 text-center font-bold uppercase tracking-widest">Enter your account email</p>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500" size={20} />
                <input required id="reset_email" type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-12 py-4 font-bold text-black focus:outline-none focus:border-emerald-500 transition-all" />
              </div>
              <button type="submit" disabled={isLoading} className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-[0_6px_0_#059669] hover:-translate-y-1 active:translate-y-1 active:shadow-none transition-all">
                {isLoading ? <Loader2 className="animate-spin" /> : "SEND RESET LINK"}
              </button>
              <button type="button" onClick={() => setMode('signin')} className="w-full text-center text-sm font-bold text-emerald-500">Back to Sign In</button>
            </form>
          )}

          {mode === 'signup_details' && (
            <form onSubmit={handleStartSignup} className="space-y-6">
              <h2 className="text-2xl font-fredoka font-bold text-gray-800 text-center">Create Account</h2>
              <div className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500" size={20} />
                  <input required id="signup_username" name="username" placeholder="Full Name" value={formData.username} onChange={handleInputChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-12 py-4 font-bold text-black focus:outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500" size={20} />
                  <input required id="signup_email" type="email" name="email" placeholder="Email Address" value={formData.email} onChange={handleInputChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-12 py-4 font-bold text-black focus:outline-none focus:border-emerald-500 transition-all" />
                </div>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-500" size={20} />
                  <input required id="signup_password" type="password" name="password" placeholder="Create Password" value={formData.password} onChange={handleInputChange} className="w-full bg-gray-50 border-2 border-gray-100 rounded-2xl px-12 py-4 font-bold text-black focus:outline-none focus:border-emerald-500 transition-all" />
                </div>
              </div>
              <button type="submit" className="w-full bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-[0_6px_0_#059669] hover:-translate-y-1 active:translate-y-1 transition-all">
                 CONTINUE TO PLAN
              </button>
            </form>
          )}

          {mode === 'signup_plan' && (
            <div className="space-y-12">
              <div className="text-center space-y-3">
                <h2 className="text-4xl font-fredoka font-bold text-gray-900">Choose Your Path</h2>
                <p className="text-gray-500 font-medium max-w-lg mx-auto">Select the engine that will drive your financial mastery.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-stretch">
                <button onClick={() => setSelectedPlan('lite')} className={`relative p-8 rounded-[3rem] border-[3px] text-left transition-all ${selectedPlan === 'lite' ? 'bg-emerald-50 border-emerald-500 shadow-2xl scale-[1.02]' : 'bg-white border-gray-100 hover:border-emerald-200 hover:shadow-xl'}`}>
                  <div className="flex justify-between items-start mb-8">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${selectedPlan === 'lite' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}><Zap size={28} /></div>
                    {selectedPlan === 'lite' && <Check size={24} className="text-emerald-500" strokeWidth={4} />}
                  </div>
                  <h3 className="text-2xl font-fredoka font-bold text-gray-900 mb-1">Lite</h3>
                  <p className="text-emerald-600 font-black text-xs uppercase tracking-widest mb-6">Free Explorer</p>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3"><Check size={16} className="text-emerald-500 mt-1" /><span className="text-xs font-bold text-gray-700">Essential Lessons</span></div>
                    <div className="flex items-start gap-3"><Check size={16} className="text-emerald-500 mt-1" /><span className="text-xs font-bold text-gray-700">Unlimited AI Intelligence</span></div>
                  </div>
                </button>
                <button onClick={() => setSelectedPlan('pro')} className={`relative p-8 rounded-[3rem] border-[3px] text-left transition-all overflow-hidden ${selectedPlan === 'pro' ? 'bg-slate-900 border-yellow-500 shadow-2xl scale-[1.05] z-10' : 'bg-white border-gray-100 hover:border-slate-300 hover:shadow-xl'}`}>
                  <div className="absolute top-6 right-6 flex flex-col items-end">
                    <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter mb-2 ${selectedPlan === 'pro' ? 'bg-yellow-500 text-slate-900' : 'bg-gray-100 text-gray-400'}`}>RECOMMENDED</div>
                    {selectedPlan === 'pro' && <Check size={24} className="text-yellow-400" strokeWidth={4} />}
                  </div>
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 ${selectedPlan === 'pro' ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-slate-900 shadow-lg' : 'bg-gray-100 text-gray-400'}`}><Crown size={28} /></div>
                  <h3 className={`text-2xl font-fredoka font-bold mb-1 ${selectedPlan === 'pro' ? 'text-white' : 'text-gray-900'}`}>Pro</h3>
                  <p className={`font-black text-xs uppercase tracking-widest mb-6 ${selectedPlan === 'pro' ? 'text-yellow-400' : 'text-slate-500'}`}>$10 / Month</p>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3"><Check size={16} className="text-emerald-500 mt-1" /><span className={`text-xs font-bold ${selectedPlan === 'pro' ? 'text-white' : 'text-gray-700'}`}>Unlimited Intelligence</span></div>
                    <div className="flex items-start gap-3"><Check size={16} className="text-emerald-500 mt-1" /><span className={`text-xs font-bold ${selectedPlan === 'pro' ? 'text-white' : 'text-gray-700'}`}>Wealth Dashboard</span></div>
                  </div>
                </button>
              </div>
              <button onClick={handlePlanSelect} className="w-full bg-emerald-500 text-white font-black py-6 rounded-[1.8rem] shadow-[0_8px_0_#059669] hover:-translate-y-1 active:translate-y-1 transition-all flex items-center justify-center gap-3 text-xl">START ADVENTURE <ArrowRight /></button>
            </div>
          )}

          {mode === 'signup_checkout' && (
            <CheckoutView isLoading={isLoading} onComplete={handleFinalize} title="Secure Checkout" />
          )}

          <div className="mt-10 pt-10 border-t border-gray-50 flex items-center gap-4 text-gray-400 text-[10px] uppercase font-black tracking-widest">
            <ShieldCheck size={24} className="text-emerald-400 shrink-0" />
            <p>Accrue protects your data with Enterprise-grade security protocols.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthView;
