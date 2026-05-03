import emailjs from "@emailjs/browser";
import { db } from '../lib/firebase';
import { 
  doc, 
  setDoc, 
  getDoc, 
  deleteDoc, 
  updateDoc,
  increment
} from 'firebase/firestore';

const SERVICE_ID = "service_4qmtlo8";
const TEMPLATE_ID = "template_w9uy2cu";
const PUBLIC_KEY = "v6JcNvS762oti3009";

// Initialize EmailJS
if (typeof window !== 'undefined') {
  emailjs.init(PUBLIC_KEY);
}

export const sendOTPEmail = async (email: string, otp: string, userName = "User") => {
  try {
    console.log("START EMAIL SEND");

    const response = await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      {
        to_email: email,
        passcode: otp,
        user_name: userName,
      },
      PUBLIC_KEY
    );

    console.log("EMAIL SUCCESS", response);

    return {
      success: true,
      response,
    };

  } catch (error) {
    console.error("EMAIL FAILED", error);

    return {
      success: false,
      error,
    };
  }
};

export const otpService = {
  generateOTP(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  async sendOTP(email: string, otp: string, userName = "User") {
    if (!email) {
      console.error("sendOTP: Email address is missing.");
      throw new Error("Email address is required to send OTP.");
    }
    return await sendOTPEmail(email, otp, userName);
  },

  async saveOTP(userId: string, email: string, otp: string) {
    if (!userId) {
      throw new Error('User ID is required to save OTP');
    }
    try {
      console.log("OTP SAVED");
      
      const otpData = {
        otp,
        email,
        verified: false,
        createdAt: Date.now(),
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiry
        attempts: 0
      };

      await setDoc(doc(db, 'emailOtps', userId), otpData);
    } catch (error) {
      console.error("Firestore Error saving OTP:", error);
      throw error;
    }
  },

  async verifyOTP(userId: string, enteredOtp: string): Promise<{ success: boolean; message: string }> {
    if (!userId) {
      return { success: false, message: 'User session expired. Please log in again.' };
    }
    try {
      const otpDocRef = doc(db, 'emailOtps', userId);
      const otpDoc = await getDoc(otpDocRef);

      if (!otpDoc.exists()) {
        return { success: false, message: 'OTP not found. Please request a new one.' };
      }

      const data = otpDoc.data();
      
      if (data.verified) {
        return { success: false, message: 'This OTP has already been verified.' };
      }

      if (data.attempts >= 5) {
        return { success: false, message: 'Too many failed attempts. Please request a new OTP.' };
      }

      const now = Date.now();
      if (now > data.expiresAt) {
        console.log("OTP EXPIRED");
        return { success: false, message: 'OTP has expired.' };
      }

      if (data.otp !== enteredOtp) {
        // Increment attempts
        await updateDoc(otpDocRef, {
          attempts: increment(1)
        });
        return { success: false, message: 'Invalid OTP.' };
      }

      // Success
      await updateDoc(otpDocRef, {
        verified: true
      });
      
      console.log("OTP VERIFIED");
      return { success: true, message: 'Welcome to ChickMart' };
    } catch (error: any) {
      console.error('Verify OTP Error:', error);
      return { 
        success: false, 
        message: 'Verification failed: ' + (error.message || 'Unknown error') 
      };
    }
  }
};
