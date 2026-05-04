import React, { useState, useEffect, useCallback } from 'react';
import { otpService } from '../services/otpService';
import { auth } from '../lib/firebase';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { ShieldCheck, Loader2, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface VerifyOtpProps {
  userId: string;
  email: string;
  onVerified: () => void;
  onLogout: () => void;
}

export default function VerifyOtp({ userId, email, onVerified, onLogout }: VerifyOtpProps) {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState(30);
  const [isSending, setIsSending] = useState(false);

  const handleSendOtp = useCallback(async () => {
    if (isSending) return;
    if (!email) {
      console.error("VerifyOtp: Cannot send OTP because email is missing", { userId, email });
      setError("Email address is missing. Please contact support.");
      return;
    }
    setIsSending(true);
    setError('');
    try {
      console.log("RESEND OTP");
      const refreshAuth = async (retries = 2): Promise<void> => {
        try {
          const user = auth.currentUser;
          if (user) {
            await user.reload();
            await user.getIdToken(true);
          }
        } catch (refreshErr: any) {
          if (retries > 0 && (refreshErr.code === 'auth/network-request-failed' || refreshErr.message?.includes('network-request-failed'))) {
            await new Promise(r => setTimeout(r, 1000));
            return refreshAuth(retries - 1);
          }
          throw refreshErr;
        }
      };

      await refreshAuth();
      
      const newOtp = otpService.generateOTP();
      await otpService.saveOTP(email, newOtp);
      await otpService.sendOTP(email, newOtp);
      setTimeLeft(30);
      setSuccess('A new OTP has been sent!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Failed to send OTP:', err);
      setError('Failed to send OTP. Please try again.');
    } finally {
      setIsSending(false);
    }
  }, [email, userId, isSending]);

  useEffect(() => {
    handleSendOtp();
  }, [handleSendOtp]);

  useEffect(() => {
    if (timeLeft <= 0) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      setError('Please enter a 6-digit OTP.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const result = await otpService.verifyOTP(email, otp);
      if (result.success) {
        // Update user profile in Firestore to mark as verified
        try {
          const { doc, setDoc } = await import('firebase/firestore');
          const { db } = await import('../lib/firebase');
          await setDoc(doc(db, 'users', userId), { 
            isOtpVerified: true,
            verifiedAt: new Date().toISOString()
          }, { merge: true });
          console.log("User profile marked as OTP verified");
        } catch (err) {
          console.error("Failed to update user profile after OTP verification:", err);
        }

        setSuccess(result.message);
        setTimeout(() => {
          onVerified();
        }, 1500);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      console.error('Verification error:', err);
      setError(err.message || 'An error occurred during verification.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-stone-50">
      <AnimatePresence mode="wait">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md"
        >
          <Card className="border-none shadow-2xl rounded-3xl overflow-hidden bg-white">
            <div className="h-2 bg-orange-600 w-full" />
            <CardHeader className="text-center pb-2">
              <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                <ShieldCheck className="text-orange-600 h-8 w-8" />
              </div>
              <CardTitle className="text-2xl font-black text-stone-900">Verify Your Identity</CardTitle>
              <CardDescription className="text-stone-500 mt-2">
                We've sent a 6-digit verification code to <br />
                <span className="font-bold text-stone-900">{email}</span>
              </CardDescription>
            </CardHeader>

            <CardContent>
              {success ? (
                <div className="py-8 text-center">
                  <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-orange-600 font-black text-2xl mb-2"
                  >
                    {success}
                  </motion.div>
                  <p className="text-stone-500">Unlocking your dashboard...</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Input
                      type="text"
                      placeholder="Enter 6-digit OTP"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      className="text-center text-3xl font-black tracking-[0.5em] h-16 bg-stone-50 border-stone-200 rounded-2xl focus:ring-orange-600 focus:border-orange-600"
                      disabled={loading}
                    />
                    {error && (
                      <p className="text-red-600 text-xs font-bold text-center mt-2">{error}</p>
                    )}
                  </div>

                  <div className="text-center space-y-4">
                    <div className="flex items-center justify-center gap-2 text-sm font-medium">
                      {timeLeft > 0 ? (
                        <span className="text-stone-400">
                          Resend code in <span className="text-orange-600 font-bold">{timeLeft}s</span>
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={handleSendOtp}
                          disabled={isSending}
                          className="text-orange-600 hover:text-orange-700 font-bold h-auto p-0"
                        >
                          {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Send className="h-4 w-4 mr-2" />
                          )}
                          Resend OTP
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-col gap-3">
                      <Button
                        type="submit"
                        className="w-full h-14 bg-stone-900 text-white rounded-2xl font-bold text-lg hover:bg-stone-800 transition-all disabled:opacity-50"
                        disabled={loading || otp.length !== 6}
                      >
                        {loading ? (
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Verifying...
                          </div>
                        ) : (
                          'Verify OTP'
                        )}
                      </Button>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={onLogout}
                        className="w-full text-stone-400 hover:text-stone-600 font-medium h-10"
                      >
                        Cancel & Sign Out
                      </Button>
                    </div>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
