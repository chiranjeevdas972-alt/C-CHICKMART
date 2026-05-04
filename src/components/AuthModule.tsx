import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import emailjs from '@emailjs/browser';
import { auth, handleFirestoreError, OperationType, db } from '../lib/firebase';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile, 
  GoogleAuthProvider, 
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { HenIcon } from './LandingPage'; 
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  User as UserIcon, 
  Zap, 
  CheckCircle2, 
  BarChart3, 
  Smartphone,
  Loader2,
  Eye,
  EyeOff,
  Phone,
  ShieldCheck,
  RefreshCcw,
  LogOut
} from 'lucide-react';

interface AuthModuleProps {
  onClose: () => void;
}

export default function AuthModule({ onClose }: AuthModuleProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // OTP States
  const [inputOtp, setInputOtp] = useState('');
  const [resendTimer, setResendTimer] = useState(60);
  const [lastSentTime, setLastSentTime] = useState(0);

  useEffect(() => {
    let interval: any;
    if (showOtpScreen && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [showOtpScreen, resendTimer]);

  const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleSendOTP = async (targetEmail: string) => {
    const now = Date.now();
    if (now - lastSentTime < 60000) {
      alert("Please wait 60 seconds before retry");
      return false;
    }

    try {
      const otp = generateOTP();
      
      // Store in Firestore otp_verification/{email}
      const otpPath = `otp_verification/${targetEmail}`;
      try {
        await setDoc(doc(db, 'otp_verification', targetEmail), {
          otp: otp,
          createdAt: serverTimestamp(),
          verified: false
        });
        console.log('OTP saved to Firestore successfully');
      } catch (fsErr: any) {
        console.error('Firestore Error:', fsErr);
        // Using alert as requested by user in snippets
        alert("Failed to send OTP (Firestore Permission)");
        return false;
      }

      const serviceId = "service_4qmtlo8";
      const templateId = "template_w9uy2cu";
      const publicKey = "v6JcNvS762oti3009";

      await emailjs.send(
        serviceId,
        templateId,
        {
          to_email: targetEmail,
          otp: otp
        },
        publicKey
      );
      
      setLastSentTime(now);
      alert("OTP sent successfully to your email");
      return true;
    } catch (err: any) {
      console.error('OTP Error:', err);
      alert("Failed to send OTP");
      return false;
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');
    
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        onClose();
      } else {
        if (password !== confirmPassword) {
          setError('Passwords do not match');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Password should be at least 6 characters');
          setLoading(false);
          return;
        }

        // Signup flow: Send OTP
        const sent = await handleSendOTP(email);
        if (sent) {
          setShowOtpScreen(true);
          setResendTimer(60);
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('Email already in use');
      } else if (err.code === 'auth/quota-exceeded') {
        setError('Signup limit reached for this hour.');
      } else {
        setError(err.message || 'An error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (email: string, inputOTP: string) => {
    setLoading(true);
    setError('');
    try {
      const ref = doc(db, "otp_verification", email);
      const snap = await getDoc(ref);

      if (!snap.exists()) {
        alert("OTP not found");
        return false;
      }

      const data = snap.data();
      const now = Date.now();
      const createdAt = (data.createdAt as Timestamp).toMillis();

      if (now - createdAt > 60000) {
        alert("OTP expired");
        return false;
      }

      if (data.otp === inputOTP) {
        // Mark as verified in Firestore
        await updateDoc(ref, {
          verified: true
        });

        // Create Firebase Account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { 
          displayName: name
        });

        // Update profile in Firestore
        const userRef = doc(db, 'users', userCredential.user.uid);
        const isOwner = userCredential.user.email === 'cvidyalibrary32@gmail.com';
        
        await setDoc(userRef, {
          uid: userCredential.user.uid,
          email: userCredential.user.email,
          displayName: name,
          phone: phone,
          isOtpVerified: true,
          role: isOwner ? 'admin' : 'user',
          createdAt: new Date().toISOString(),
          subscriptionType: isOwner ? 'pro' : 'trial',
          trialStartDate: new Date().toISOString()
        }, { merge: true });
        
        alert("Welcome to ChickMart 🎉");
        window.location.href = "/dashboard.html";
        return true;
      } else {
        alert("Invalid OTP");
        return false;
      }
    } catch (error: any) {
      console.error(error);
      alert("Verification failed");
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    
    setLoading(true);
    setError('');
    const sent = await handleSendOTP(email);
    if (sent) {
      setResendTimer(60);
      setSuccessMessage('New verification code sent!');
    } else {
      setError('Failed to resend code.');
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Please enter your email address to reset your password');
      return;
    }
    setLoading(true);
    setError('');
    setSuccessMessage('');
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset link sent to your email! Please check your inbox.');
    } catch (err: any) {
      console.error('Password reset error:', err);
      if (err.code === 'auth/user-not-found') {
        setError('No user found with this email address');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    setLoading(true);
    try {
      await signInWithPopup(auth, provider);
      onClose();
    } catch (err: any) {
      if (err.code !== 'auth/popup-closed-by-user') {
        console.error('Google login error:', err);
        setError('Google login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex bg-white"
    >
      {/* Left Side: Inspiration Content */}
      <div className="hidden lg:flex lg:w-3/5 bg-stone-900 relative overflow-hidden p-16 flex-col justify-between">
        {/* Decorative elements */}
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-orange-600/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-orange-600/10 blur-[120px] rounded-full" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-900/20">
              <HenIcon size={24} />
            </div>
            <span className="font-bold text-xl tracking-tight text-white">ChickMart</span>
          </div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="max-w-xl"
          >
            <div className="flex items-center gap-2 mb-6">
              <div className="flex -space-x-2">
                {[1,2,3,4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-stone-900 bg-stone-800 flex items-center justify-center">
                    <UserIcon size={14} className="text-stone-400" />
                  </div>
                ))}
              </div>
              <span className="text-stone-400 text-sm font-bold tracking-tight">
                Trusted by 500+ Poultry Farms
              </span>
            </div>

            <h1 className="text-7xl font-black text-white leading-[0.9] mb-8 tracking-tighter">
              Manage Your Farm <br />
              <span className="text-orange-500">Like a Pro.</span>
            </h1>
            
            <p className="text-xl text-stone-400 mb-12 leading-relaxed">
              The all-in-one full-stack solution for small and medium poultry farms. Track batches, sales, and inventory with precision.
            </p>

            <div className="grid grid-cols-1 gap-6 mb-12">
              {[
                { 
                  icon: <BarChart3 className="text-orange-500" size={24} />, 
                  title: "Real-time Monitoring", 
                  desc: "Track every batch with precision from chick to market." 
                },
                { 
                  icon: <Zap className="text-orange-500" size={24} />, 
                  title: "Smart Insights", 
                  desc: "Get AI-driven tips to optimize your Feed Conversion Ratio." 
                },
                { 
                  icon: <Smartphone className="text-orange-500" size={24} />, 
                  title: "Always Accessible", 
                  desc: "Manage your farm from anywhere, even in offline mode." 
                }
              ].map((item, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 + i * 0.1 }}
                  className="flex gap-5"
                >
                  <div className="shrink-0 w-12 h-12 bg-stone-800 rounded-2xl flex items-center justify-center">
                    {item.icon}
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg mb-1">{item.title}</h3>
                    <p className="text-stone-500 text-sm">{item.desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 flex items-center gap-2 text-stone-500 text-sm font-medium">
          <CheckCircle2 size={16} className="text-orange-500" />
          <span>GST Ready Invoicing • Hindi Support • WhatsApp Alerts</span>
        </div>
      </div>

      {/* Right Side: Auth Forms */}
      <div className="flex-1 flex flex-col p-8 md:p-12 lg:p-16 overflow-y-auto">
        <div className="max-w-md w-full mx-auto flex-1 flex flex-col justify-center">
          <div className="flex justify-between items-center mb-12 lg:hidden">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center text-white">
                <HenIcon size={18} />
              </div>
              <span className="font-bold text-lg tracking-tight">ChickMart</span>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <ArrowLeft size={20} />
            </Button>
          </div>

          <div className="hidden lg:block absolute top-12 right-12">
            <Button variant="ghost" onClick={onClose} className="rounded-xl gap-2 font-bold hover:bg-stone-50">
              <ArrowLeft size={18} />
              Back to site
            </Button>
          </div>

          <motion.div
            key={showOtpScreen ? 'otp' : (isLogin ? 'login' : 'signup')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {showOtpScreen ? (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600 mb-6">
                  <ShieldCheck size={32} />
                </div>
                <h2 className="text-3xl font-black tracking-tighter mb-2 text-center">Verify Your Identity</h2>
                <p className="text-stone-500 mb-8 text-center font-medium">
                  We've sent a 6-digit verification code to <br />
                  <span className="text-stone-900 font-bold">{email}</span>
                </p>

                {error && (
                  <div className="w-full mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold animate-pulse text-center">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="w-full mb-6 p-4 rounded-2xl bg-green-50 border border-green-100 text-green-600 text-sm font-bold text-center">
                    {successMessage}
                  </div>
                )}

                <div className="w-full space-y-6">
                  <div className="relative">
                    <Input 
                      placeholder="Enter 6-digit OTP"
                      className="h-16 text-center text-2xl font-black tracking-[0.5em] rounded-2xl border-stone-200 focus:ring-4 focus:ring-orange-50 transition-all"
                      value={inputOtp}
                      onChange={(e) => setInputOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      maxLength={6}
                    />
                  </div>

                  <p className="text-center text-sm font-bold text-stone-400">
                    Resend code in <span className="text-orange-600">{resendTimer}s</span>
                  </p>

                  <Button 
                    onClick={() => verifyOTP(email, inputOtp)}
                    disabled={loading || inputOtp.length !== 6}
                    className="w-full h-14 rounded-2xl bg-orange-600 text-white font-black text-lg hover:bg-orange-700 shadow-xl shadow-orange-100 transition-all active:scale-[0.98] disabled:bg-stone-300 disabled:shadow-none"
                  >
                    {loading ? <Loader2 className="animate-spin text-white" /> : 'Verify OTP'}
                  </Button>

                  <div className="flex flex-col gap-3">
                    <button 
                      onClick={() => handleSendOTP(email)}
                      disabled={loading || resendTimer > 0}
                      className="flex items-center justify-center gap-2 text-sm font-bold text-stone-500 hover:text-orange-600 disabled:opacity-30 disabled:hover:text-stone-500"
                    >
                      <RefreshCcw size={16} className={loading ? 'animate-spin' : ''} />
                      Resend Code
                    </button>
                    <button 
                      onClick={() => {
                        setShowOtpScreen(false);
                        setInputOtp('');
                      }}
                      className="flex items-center justify-center gap-2 text-sm font-bold text-stone-400 hover:text-stone-600"
                    >
                      <ArrowLeft size={16} />
                      Back to Registration
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <h2 className="text-4xl font-black tracking-tighter mb-2">
                  {isLogin ? 'Welcome Back' : 'Get Started'}
                </h2>
                <p className="text-stone-500 mb-10 font-medium">
                  {isLogin 
                    ? 'Sign in to access your farm dashboard.' 
                    : 'Create an account to start managing your farm like a pro.'}
                </p>

                {error && (
                  <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-sm font-bold animate-pulse">
                    {error}
                  </div>
                )}

                {successMessage && (
                  <div className="mb-6 p-4 rounded-2xl bg-green-50 border border-green-100 text-green-600 text-sm font-bold">
                    {successMessage}
                  </div>
                )}

                <form onSubmit={handleEmailAuth} className="space-y-4">
                  {!isLogin && (
                    <>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Full Name</label>
                        <div className="relative">
                          <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                          <Input 
                            required
                            placeholder="e.g. Rahul Sharma"
                            className="h-14 pl-12 rounded-2xl border-stone-200 focus:ring-4 focus:ring-orange-50 transition-all font-medium"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Mobile Number</label>
                        <div className="relative">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                          <Input 
                            required
                            type="tel"
                            placeholder="e.g. +91 99054 22245"
                            className="h-14 pl-12 rounded-2xl border-stone-200 focus:ring-4 focus:ring-orange-50 transition-all font-medium"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                          />
                        </div>
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                      <Input 
                        required
                        type="email"
                        placeholder="email@example.com"
                        className="h-14 pl-12 rounded-2xl border-stone-200 focus:ring-4 focus:ring-orange-50 transition-all font-medium"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400">Password</label>
                      {isLogin && (
                        <button 
                          type="button" 
                          onClick={handleForgotPassword}
                          disabled={loading}
                          className="text-[10px] font-black uppercase tracking-widest text-orange-600 hover:text-orange-700 disabled:opacity-50"
                        >
                          Forgot?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                      <Input 
                        required
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        className="h-14 pl-12 pr-12 rounded-2xl border-stone-200 focus:ring-4 focus:ring-orange-50 transition-all font-medium"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                      <button 
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {!isLogin && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-stone-400 ml-1">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-stone-300" size={18} />
                        <Input 
                          required
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className="h-14 pl-12 pr-12 rounded-2xl border-stone-200 focus:ring-4 focus:ring-orange-50 transition-all font-medium"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-stone-300 hover:text-stone-500 transition-colors"
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}

                  <Button 
                    type="submit"
                    disabled={loading}
                    className="w-full h-14 rounded-2xl bg-orange-600 text-white font-black text-lg hover:bg-orange-700 shadow-xl shadow-orange-100 mt-4 transition-all active:scale-[0.98]"
                  >
                    {loading ? <Loader2 className="animate-spin text-white" /> : (isLogin ? 'Sign In' : 'Create Account')}
                  </Button>
                </form>

                <div className="relative my-10">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-100" />
                  </div>
                  <div className="relative flex justify-center text-[10px] font-black uppercase tracking-widest">
                    <span className="bg-white px-4 text-stone-400">Or continue with</span>
                  </div>
                </div>

                <Button 
                  type="button"
                  variant="outline"
                  disabled={loading}
                  onClick={handleGoogleLogin}
                  className="w-full h-14 rounded-2xl border-stone-200 font-bold hover:bg-stone-50 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
                >
                  <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                  Sign in with Google
                </Button>

                <p className="text-center mt-12 text-stone-500 font-medium">
                  {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
                  <button 
                    onClick={() => {
                      setIsLogin(!isLogin);
                      setError('');
                      setSuccessMessage('');
                      setShowOtpScreen(false);
                    }}
                    className="text-orange-600 font-black hover:underline"
                  >
                    {isLogin ? 'Register here' : 'Sign in here'}
                  </button>
                </p>
              </>
            )}
          </motion.div>
        </div>
        
        <div className="mt-12 text-center text-[10px] font-bold text-stone-400 uppercase tracking-widest">
          Secured by ChickMart Tech • © 2025
        </div>
      </div>
    </motion.div>
  );
}
