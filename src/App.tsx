
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Header } from './components/layout/Header';
import { Sidebar } from './components/layout/Sidebar';
import UnitHeader from './components/UnitHeader';
import { DiagnosticView } from './views/DiagnosticView';
import LessonView from './views/LessonView';
import LearnView from './views/LearnView';
import { ProfileView } from './views/ProfileView';
import ArchetypeTest from './views/ArchetypeTest';
import DemographicsView from './views/DemographicsView';
import Leaderboard from './views/Leaderboard';
import { ChatView } from './views/ChatView';
import { WealthView } from './views/WealthView';
import AuthView from './views/AuthView';
import { AdminView } from './views/AdminView';
import CheckoutView from './components/CheckoutView';
import QuickFinny from './components/QuickFinny';
import DailyRewardModal from './components/DailyRewardModal';
import BottomNav from './components/BottomNav';
import TutorialOverlay from './components/TutorialOverlay';
import FinnyConsultationModal from './components/FinnyConsultationModal';
import { UNITS, SYMPTOM_DICTIONARY } from './constants';
import { AppState, Difficulty, Lesson, UserStats, ArchetypeStats, Template, NetWorthData, Demographics, ViewType, SmartNotification, ActiveSymptom, Symptom, LessonStatus, LearnSection } from './types';
import { generateLessonQuestions } from './services/geminiService';
import { onAuthStateChanged, signOut, saveUserData, bulkSaveTransactions, getUser } from './services/supabaseService';
import { supabase } from './lib/supabase';
import { runFinancialHealthCheck, calculateSymptomProgress } from './services/healthService';
import { syncPlaidTransactions } from './services/plaidService';
import { diagnoseUserVitals } from './services/diagnosticEngine';
import FinnyLoader from './components/FinnyLoader';
import { triggerNotification } from './services/notificationService';
import { AlertCircle } from 'lucide-react';

/**
 * Main Application Shell
 * Orchestrates navigation, authentication, and global health monitoring.
 */
const App: React.FC = () => {
  const [isBootstrapped, setIsBootstrapped] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasError, setHasError] = useState<string | null>(null);
  const [tutorialHighlight, setTutorialHighlight] = useState<string | null>(null);
  
  const [prefilledChat, setPrefilledChat] = useState<string | null>(null);
  
  const [state, setState] = useState<AppState>({
    user: null,
    accounts: [], 
    isLoggedIn: false,
    netWorth: {
      accounts: [],
      lastSynced: new Date().toISOString()
    },
    activeSymptoms: [
      { id: 'test-1', symptomId: 'liq-001', severity: 5, message: 'Test symptom 1', recommendedLesson: 'Optimizing Your Cash', timestamp: Date.now() },
      { id: 'test-2', symptomId: 'debt-001', severity: 8, message: 'Test symptom 2', recommendedLesson: 'Strategies for Debt Paydown', timestamp: Date.now() },
      { id: 'test-3', symptomId: 'risk-001', severity: 9, message: 'Test symptom 3', recommendedLesson: 'Building Your Safety Net', timestamp: Date.now() },
    ],
    currentView: 'dashboard',
    activeLesson: null,
    selectedUnitId: 'u1',
    selectedDifficulty: Difficulty.BEGINNER,
    selectedToolId: null,
    activeSymptomId: null,
    activeMode: 'learn',
    rules: []
  });

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [transactions] = useState<any[]>([]);

  const isAuthLoading = useRef(false);
  useEffect(() => {
    // Verify Environment Variables
    if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
      console.error("[Accrue] Supabase credentials missing from environment.");
      setHasError("Configuration error: Supabase credentials missing.");
      setIsBootstrapped(true);
      return;
    }

    // Initialization Timeout (3 seconds)
    const timeout = setTimeout(() => {
      if (!isBootstrapped) {
        console.warn("[Accrue] Initialization timed out. Forcing bootstrap.");
        setIsBootstrapped(true);
      }
    }, 3000);

    const { data: { subscription } } = onAuthStateChanged(async (user: any) => {
      if (isAuthLoading.current) return;
      isAuthLoading.current = true;
      try {
        if (user && user.id && !stateRef.current.user) {
          // Fetch user data from Supabase instead of Firebase
          const { data: profileData, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (profileError) {
            if (profileError.message.includes('JWT expired')) {
              console.error("[Accrue] JWT Expired in App bootstrap. Clearing storage.");
              localStorage.clear();
              await supabase.auth.signOut();
              window.location.reload();
              return;
            }
            throw profileError;
          }

          if (profileData) {
            const profile = profileData.profile as UserStats;
            const isSystemAdmin = profile.email === 'admin@accrue.finance';
            
            setState(prev => ({
              ...prev,
              user: { 
                ...profile, 
                id: user.id,
                isAdmin: isSystemAdmin, 
                isPremium: true,
                role: isSystemAdmin ? 'admin' : (profile.role || 'user')
              },
              netWorth: profileData.netWorth as NetWorthData || { accounts: [], lastSynced: new Date().toISOString() },
              isLoggedIn: true
            }));
            setIsLoggedIn(true);
          } else {
            // Redirect to complete profile if missing
            setState(prev => ({ ...prev, currentView: 'complete-profile', isLoggedIn: true }));
            setIsLoggedIn(true);
          }
          if (!isBootstrapped) setIsBootstrapped(true);
        } else if (!user) {
          setIsLoggedIn(false);
          setState(prev => ({ ...prev, user: null, isLoggedIn: false }));
          if (!isBootstrapped) setIsBootstrapped(true);
        }
      } catch (err: any) {
        console.error("[Accrue] Initialization Error:", err);
        setHasError(err.message || "An unexpected error occurred during initialization.");
        setIsBootstrapped(true);
      } finally {
        isAuthLoading.current = false;
      }
    });

    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  // Auto-transition symptoms based on account updates
  useEffect(() => {
    const updatedActiveSymptoms = state.activeSymptoms.filter(as => {
      const symptomDef = SYMPTOM_DICTIONARY.find(s => s.id === as.symptomId);
      if (!symptomDef) return true;
      const progress = calculateSymptomProgress(symptomDef, state.accounts);
      return progress < 100;
    });

    if (updatedActiveSymptoms.length !== state.activeSymptoms.length) {
      setState(prev => ({ ...prev, activeSymptoms: updatedActiveSymptoms }));
    }
  }, [state.accounts, state.activeSymptoms]);

  /**
   * REFACTORED CLINIC SYMPTOM MONITOR
   * Reactively forces UI interventions when a Critical (Severity 3) symptom is active.
   */
  useEffect(() => {
    // 1. Detect Critical Symptom (Remote or Local)
    const criticalRemote = state.activeSymptoms.find(s => s.severity === 3);
    const localSymptoms = runFinancialHealthCheck(state.netWorth.accounts, SYMPTOM_DICTIONARY);
    const criticalLocal = localSymptoms.find(s => s.severity === 3);

    const activeCriticalSymptom = criticalRemote 
      ? SYMPTOM_DICTIONARY.find(d => d.id === criticalRemote.symptomId)
      : criticalLocal;

    if (activeCriticalSymptom) {
      // Force Dashboard Highlight (Pulse on 'Learn' tab)
      setTutorialHighlight('dashboard');
    } else {
      // Clear highlight if no critical symptoms exist and we aren't in the tutorial
      setTutorialHighlight(prev => (prev === 'dashboard' && !state.user?.hasCompletedTutorial) ? null : prev);
    }
  }, [state.activeSymptoms, state.netWorth, state.user?.hasCompletedTutorial]);

  /**
   * Refined Synchronization Logic:
   * Centralizes the sync-to-diagnosis pipeline.
   */
  const handlePerformRegistrySync = useCallback(async (accessToken: string) => {
    const user = await getUser();
    if (!user) return;
    const uid = user.id;
    
    // 1. Fetch from Plaid
    const result = await syncPlaidTransactions(accessToken);
    
    // 2. Persist to Firestore
    if (result.added.length > 0) {
      await bulkSaveTransactions(uid, result.added);
    }
    
    // 3. Trigger Diagnosis Engine immediately
    await diagnoseUserVitals();
    
    console.log("[Clinic] Sync-to-Diagnosis Cycle Complete.");
  }, []);

  /**
   * Auto-clear highlight when treatment is started
   */
  useEffect(() => {
    if (state.activeLesson) {
      const critical = state.activeSymptoms.find(s => s.severity === 3);
      const definition = critical ? SYMPTOM_DICTIONARY.find(d => d.id === critical.symptomId) : null;
      
      if (definition && state.activeLesson.id === definition.prescribedLessonId) {
        setTutorialHighlight(prev => (prev === 'dashboard' ? null : prev));
      }
    }
  }, [state.activeLesson, state.activeSymptoms]);

  /**
   * Proactive Inactivity Monitor
   */
  useEffect(() => {
    if (!state.user) return;
    
    const lastActive = state.user.lastActiveDate ? new Date(state.user.lastActiveDate) : new Date();
    const daysInactive = (new Date().getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysInactive > 3) {
      triggerNotification(state.user.id, 'We miss you!', 'Your finances need attention. Come back to Accrue!', 'medium');
      // Update lastActiveDate to avoid spamming
      saveUserData(state.user.id, { profile: { ...state.user, lastActiveDate: new Date().toISOString() } });
    }
  }, [state.user]);

  const handleMarkNotificationsRead = async () => {
    const user = await getUser();
    if (!state.user || !user) return;
    const updatedUser = {
      ...state.user,
      notifications: state.user.notifications?.map(n => ({ ...n, isRead: true })) || []
    };
    saveUserData(user.id, { profile: updatedUser });
  };

  const handleAuthComplete = (user: UserStats) => {
    setIsLoggedIn(true);
  };

  const handleDemographicsComplete = async (demographics: Demographics) => {
    const user = await getUser();
    if (!state.user || !user) return;
    const updatedUser = { ...state.user, demographics };
    saveUserData(user.id, { profile: updatedUser });
    setState(prev => ({ ...prev, user: updatedUser, currentView: 'archetype-test' }));
  };

  const handleTutorialComplete = async () => {
    const user = await getUser();
    if (!state.user || !user) return;
    const updatedUser = { ...state.user, hasCompletedTutorial: true };
    saveUserData(user.id, { profile: updatedUser });
    setState(prev => ({ ...prev, currentView: 'dashboard' }));
    setTutorialHighlight(null);
  };

  const handleSignOut = async () => {
    await signOut();
    setIsLoggedIn(false);
  };

  const handleIncrementAiUsage = useCallback(async () => {
    const user = await getUser();
    if (!state.user || !user) return;
    const updatedUser = { 
      ...state.user, 
      dailyAiQuestionsCount: (state.user.dailyAiQuestionsCount || 0) + 1, 
      lastAiQuestionDate: new Date().toISOString() 
    };
    saveUserData(user.id, { profile: updatedUser });
  }, [state.user]);

  /**
   * handleFinishLesson - AWARD SYSTEM
   * Handles lesson completion logic, badges, gems, and TOOL UNLOCKS.
   */
  const handleFinishLesson = useCallback(async (mastered: boolean, score: number) => {
    const user = await getUser();
    if (!state.user || !user) return;
    
    const activeLesson = state.activeLesson;
    if (!activeLesson) return;

    const isFirstTimeMastery = mastered && !state.user.completedLessonIds.includes(activeLesson.id);
    const newCompleted = isFirstTimeMastery ? [...state.user.completedLessonIds, activeLesson.id] : state.user.completedLessonIds;
    
    // Unlocked Tool Logic
    let newUnlockedTools = [...(state.user.unlockedToolIds || [])];
    if (mastered && activeLesson.toolId && !newUnlockedTools.includes(activeLesson.toolId)) {
      newUnlockedTools.push(activeLesson.toolId);
      console.log(`[Accrue] Tool Unlocked: ${activeLesson.toolId}`);
    }

    const newLevel = Math.floor(newCompleted.length / 5) + 1;

    const updatedUser = {
      ...state.user,
      level: newLevel,
      completedLessonIds: newCompleted,
      unlockedToolIds: newUnlockedTools,
      lastActiveDate: new Date().toISOString(),
      totalCorrectAnswers: (state.user.totalCorrectAnswers || 0) + score,
      perfectLessons: (state.user.perfectLessons || 0) + (mastered ? 1 : 0)
    };
    
    saveUserData(user.id, { profile: updatedUser });
    setState(prev => ({ ...prev, activeLesson: null }));
  }, [state.user, state.activeLesson]);

  const handleArchetypeComplete = async (scores: ArchetypeStats, archetypeId: string) => {
    const user = await getUser();
    if (!state.user || !user) return;
    const updatedUser = { ...state.user, archetypeScores: scores, archetypeId };
    saveUserData(user.id, { profile: updatedUser });
    setState(prev => ({
      ...prev,
      user: updatedUser,
      currentView: updatedUser.hasCompletedTutorial ? 'profile' : 'tutorial'
    }));
  };

  const updateWealthData = async (newNetWorth: NetWorthData) => {
    const user = await getUser();
    if (!user) return;
    saveUserData(user.id, { netWorth: newNetWorth });
  };

  const setView = (view: ViewType, toolId?: string, symptomId?: string) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setState(prev => ({ ...prev, activeSymptomId: symptomId || null, currentView: view, activeLesson: null, selectedToolId: toolId || null }));
  };

  const startLessonById = (lessonId: string) => {
    const allLessons = UNITS.flatMap(u => u.lessons);
    const lesson = allLessons.find(l => l.id === lessonId);
    if (lesson) {
      setState(prev => ({ 
        ...prev, 
        activeLesson: { 
          ...lesson, 
          difficulty: lesson.difficulty as Difficulty,
          status: lesson.status as LessonStatus,
          learningMaterial: (typeof lesson.learningMaterial === 'string' ? [{ title: 'Material', content: lesson.learningMaterial, keyTakeaway: '' }] : lesson.learningMaterial) as LearnSection[]
        }, 
        currentView: 'lesson', 
        activeMode: 'learn'
      }));
    }
  };

  if (!isBootstrapped) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">
        {hasError ? (
          <div className="space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-rose-50 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={40} />
            </div>
            <h2 className="text-2xl font-fredoka font-bold text-slate-900">Initialization Failed</h2>
            <p className="text-slate-500 max-w-xs mx-auto text-sm">{hasError}</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-emerald-600 text-white font-black rounded-2xl shadow-lg hover:bg-emerald-700 transition-all uppercase text-xs tracking-widest"
            >
              Retry Connection
            </button>
          </div>
        ) : (
          <FinnyLoader message="Bootstrapping Registry..." size="lg" />
        )}
      </div>
    );
  }

  if (!isLoggedIn) {
    return <AuthView onAuthComplete={handleAuthComplete} existingUser={null} />;
  }

  if (false && state.user && !state.user.archetypeId && state.currentView !== 'archetype-test') {
     if (!state.user.demographics && state.currentView !== 'demographics') {
        return <DemographicsView onComplete={handleDemographicsComplete} onSkip={() => setView('archetype-test')} />;
     }
     return <ArchetypeTest onComplete={handleArchetypeComplete} onCancel={() => {}} onSkip={() => setView('dashboard')} isInitialOnboarding />;
  }

  if (state.user && state.currentView === 'tutorial') {
    return <TutorialOverlay onComplete={handleTutorialComplete} onStepChange={setTutorialHighlight} />;
  }

  const renderView = () => {
    if (state.activeLesson) {
      if (state.activeMode === 'learn') {
        return <LearnView lesson={state.activeLesson} onComplete={() => setState(prev => ({ ...prev, activeMode: 'play' }))} onClose={() => setState(prev => ({ ...prev, activeLesson: null }))} />;
      }
      return <LessonView lesson={state.activeLesson} onClose={() => setState(prev => ({ ...prev, activeLesson: null }))} onFinish={handleFinishLesson} generateQuestions={generateLessonQuestions} />;
    }

    switch (state.currentView) {
      case 'dashboard':
        return (
          <DiagnosticView 
            user={state.user}
            netWorth={state.netWorth}
            activeSymptoms={state.activeSymptoms}
            transactions={transactions}
            onStartLesson={(lesson, mode) => setState(prev => ({ ...prev, activeLesson: lesson, activeMode: mode }))}
            completedLessonIds={state.user?.completedLessonIds || []}
            setView={setView}
            setPrefilledChat={setPrefilledChat}
          />
        );
      case 'wealth':
        return <WealthView data={state.netWorth} onUpdate={updateWealthData} onSync={handlePerformRegistrySync} setPrefilledChat={setPrefilledChat} setView={setView} />;
      case 'chat':
        return state.user ? <ChatView user={state.user} netWorth={state.netWorth} activeSymptoms={state.activeSymptoms} activeSymptomId={state.activeSymptomId || null} key={state.activeSymptomId || 'default'} clearActiveSymptomId={() => setState(prev => ({ ...prev, activeSymptomId: null }))} onIncrementUsage={handleIncrementAiUsage} onStartLesson={startLessonById} prefilledChat={prefilledChat} setPrefilledChat={setPrefilledChat} rules={state.rules} onUpdateRules={(rules) => setState(prev => ({ ...prev, rules }))} setView={setView} /> : null;
      case 'profile':
      case 'profile-toolbox':
        const mockUser: UserStats = {
          id: 'dev-user',
          username: 'Admin',
          email: 'keenanesau22@gmail.com',
          bio: 'Developer',
          profilePicture: null,
          streak: 0,
          level: 1,
          isPremium: true,
          isAdmin: true,
          role: 'admin',
          isVerified: true,
          dailyAiQuestionsCount: 0,
          lastAiQuestionDate: null,
          completedLessonIds: [],
          unlockedToolIds: [],
          lastActiveDate: null,
          totalCorrectAnswers: 0,
          perfectLessons: 0,
          gems: 0,
          archetypeId: null,
          archetypeScores: { riskTolerance: 50, timeHorizon: 50, spendingDiscipline: 50, marketSavvy: 50, debtSentiment: 50, assetGrowth: 50 },
          hasCompletedTutorial: true,
          notifications: [],
          purchasedTemplateIds: []
        };
        return <ProfileView 
          user={state.user || mockUser} 
          netWorth={state.netWorth} 
          activeSymptoms={state.activeSymptoms}
          onStartTest={() => setView('archetype-test')} 
          onViewRankings={() => setView('leaderboard')} 
          onUpdateUsername={(name) => saveUserData(state.user?.id || 'dev-user', { profile: { ...state.user!, username: name } })} 
          onUpdateBio={(bio) => saveUserData(state.user?.id || 'dev-user', { profile: { ...state.user!, bio } })} 
          onUpdateProfilePicture={(pic) => saveUserData(state.user?.id || 'dev-user', { profile: { ...state.user!, profilePicture: pic } })} 
          onSignOut={handleSignOut} 
          onRetakeTutorial={() => setState(prev => ({ ...prev, currentView: 'tutorial' }))} 
          initialSubView={state.currentView === 'profile-toolbox' ? 'toolbox' : 'none'} 
          selectedToolId={state.selectedToolId}
          setView={setView} 
        />;
      case 'leaderboard':
        return state.user ? <Leaderboard user={state.user} onBack={() => setView('profile')} /> : null;
      case 'archetype-test':
        return <ArchetypeTest onComplete={handleArchetypeComplete} onCancel={() => setView('profile')} onSkip={() => setView('dashboard')} />;
      case 'complete-profile':
        return <div className="p-10 text-center">Please complete your profile.</div>;
      case 'admin':
        return <AdminView />;
      default:
        return (
          <DiagnosticView 
            user={state.user}
            netWorth={state.netWorth}
            activeSymptoms={state.activeSymptoms}
            transactions={transactions}
            onStartLesson={(lesson, mode) => setState(prev => ({ ...prev, activeLesson: lesson, activeMode: mode }))}
            completedLessonIds={state.user?.completedLessonIds || []}
            setView={setView}
            setPrefilledChat={setPrefilledChat}
          />
        );
    }
  };

  return (
      <div className="flex min-h-screen">
        <Sidebar currentView={state.currentView} setView={setView} isAdmin={state.user?.isAdmin || false} />
        <div className="flex-1 min-h-screen pb-20 bg-[#fcfcfc]">
          <header>
            <Header user={state.user || ({} as UserStats)} netWorth={state.netWorth} setView={setView} onMarkNotificationsRead={handleMarkNotificationsRead} />
          </header>
          
          <main>
            <AnimatePresence mode="wait">
              <motion.div
                key={state.currentView}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                {renderView()}
              </motion.div>
            </AnimatePresence>
          </main>

          <BottomNav user={state.user || ({} as UserStats)} currentView={state.currentView} setView={setView} activeSymptoms={state.activeSymptoms} />
          {state.currentView !== 'chat' && state.user && (
            <QuickFinny user={state.user} netWorth={state.netWorth} onIncrementUsage={handleIncrementAiUsage} />
          )}
        </div>
      </div>
  );
};

export default App;
