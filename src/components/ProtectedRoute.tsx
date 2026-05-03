import React from 'react';
import VerifyOtp from './VerifyOtp';
import { User as FirebaseUser } from 'firebase/auth';

interface ProtectedRouteProps {
  user: FirebaseUser;
  profile: any;
  otpVerified: boolean;
  onOtpVerified: () => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export default function ProtectedRoute({
  user,
  profile,
  otpVerified,
  onOtpVerified,
  onLogout,
  children
}: ProtectedRouteProps) {
  // If user exists but email is not verified, we already have a banner in App.tsx
  // But the OTP verification is mandatory for dashboard access as per requirements.
  
  const displayEmail = user.email || profile?.email || user.providerData[0]?.email || '';

  if (!otpVerified) {
    return (
      <VerifyOtp 
        userId={user.uid}
        email={displayEmail} 
        onVerified={onOtpVerified} 
        onLogout={onLogout} 
      />
    );
  }

  return <>{children}</>;
}
