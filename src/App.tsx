import React, { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import PaymentModule from './components/PaymentModule';
import { Loader2, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from './components/ui/button';

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [trialExpired, setTrialExpired] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { i18n, t } = useTranslation();

  const [selectedPlan, setSelectedPlan] = useState<{ name: string, price: number } | null>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'hi' : 'en';
    i18n.changeLanguage(newLang);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      // Online listener
      const handleStatusChange = () => setIsOnline(navigator.onLine);
      window.addEventListener('online', handleStatusChange);
      window.addEventListener('offline', handleStatusChange);
      
      if (firebaseUser) {
        // Use real-time snapshot for profile
        const userRef = doc(db, 'users', firebaseUser.uid);
        const unsubProfile = onSnapshot(userRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            // If we just paid, ensure the subscription is updated
            if (paymentDone && selectedPlan && data.subscriptionType !== selectedPlan.name.toLowerCase()) {
              await setDoc(userRef, { 
                ...data, 
                subscriptionType: selectedPlan.name.toLowerCase(),
                paymentDate: new Date().toISOString()
              }, { merge: true });
              setPaymentDone(false);
              setSelectedPlan(null);
            }
            setProfile(data);
          } else {
            const planToSet = (paymentDone && selectedPlan) ? selectedPlan.name.toLowerCase() : 'trial';
            const newProfile = {
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              role: 'admin',
              farmIds: [],
              shopIds: [],
              createdAt: new Date().toISOString(),
              subscriptionType: planToSet,
              trialStartDate: planToSet === 'trial' ? new Date().toISOString() : null,
              businessName: 'ChickMart',
              businessAddress: 'Digwadih, Dhanbad, Jharkhand, 828113',
              businessEmail: 'chiranjeev972@gmail.com',
              businessPhone: '6299327929'
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
            if (paymentDone) {
              setPaymentDone(false);
              setSelectedPlan(null);
            }
          }
          setLoading(false);
        }, (error) => {
          handleFirestoreError(error, OperationType.GET, `users/${firebaseUser.uid}`);
          setLoading(false);
        });
        return () => unsubProfile();
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [paymentDone, selectedPlan]);

  useEffect(() => {
    if (profile?.subscriptionType === 'trial' && profile?.trialStartDate) {
      const startDate = new Date(profile.trialStartDate);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays > 7) {
        setTrialExpired(true);
      }
    } else {
      setTrialExpired(false);
    }
  }, [profile]);

  const handlePlanSelect = (plan: { name: string, price: number }) => {
    setSelectedPlan(plan);
    setShowPayment(true);
  };

  const handlePaymentComplete = () => {
    setPaymentDone(true);
    setShowPayment(false);
    if (!user) {
      handleLogin();
    }
  };

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        // User closed the popup, no need to log as error
        return;
      }
      console.error('Login failed', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Logout failed', error);
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-stone-50 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-orange-600" />
        <p className="text-stone-400 font-bold uppercase tracking-widest text-[10px]">Loading ChickMart...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-900 flex flex-col">
      {showPayment && selectedPlan && (
        <PaymentModule 
          planName={selectedPlan.name}
          price={selectedPlan.price}
          onClose={() => setShowPayment(false)}
          onComplete={handlePaymentComplete}
          businessPhone={profile?.businessPhone || "8987766981"}
        />
      )}

      {!isOnline && (
        <div className="bg-amber-600 text-white text-[10px] font-bold uppercase tracking-widest py-1 px-4 flex justify-between items-center z-[100] shrink-0">
          <span>Offline Mode Active • Your data will sync when back online</span>
          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
        </div>
      )}
      
      <div className="fixed top-4 right-4 z-50">
        <Button variant="outline" size="sm" onClick={toggleLanguage} className="bg-white/80 backdrop-blur shadow-sm rounded-full gap-2">
          <Globe size={16} />
          {i18n.language === 'en' ? 'हिंदी' : 'English'}
        </Button>
      </div>
      {!user ? (
        <LandingPage onLogin={handleLogin} onPlanSelect={handlePlanSelect} />
      ) : trialExpired ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <Globe className="text-orange-600 h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black mb-4">Trial Plan Expired</h2>
          <p className="text-stone-500 max-w-md mb-8">
            Your 7-day free trial has ended. Please upgrade to a Standard or Professional plan to continue managing your poultry business.
          </p>
          <div className="flex gap-4">
            <Button onClick={handleLogout} variant="outline" className="h-14 px-8 rounded-2xl font-bold">
              Logout
            </Button>
            <Button onClick={() => handlePlanSelect({ name: 'Standard', price: 499 })} className="h-14 px-10 rounded-2xl bg-orange-600 text-white font-bold shadow-lg shadow-orange-100">
              Upgrade Now
            </Button>
          </div>
        </div>
      ) : (
        <Dashboard user={user} profile={profile} onLogout={handleLogout} />
      )}
    </div>
  );
}

