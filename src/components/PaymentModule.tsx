import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, X, ShieldCheck, CreditCard, Smartphone, CheckCircle2, QrCode, Loader2 } from 'lucide-react';
import { Button } from './ui/button';

interface PaymentModuleProps {
  planName: string;
  price: number;
  onClose: () => void;
  onComplete: () => void;
  businessPhone?: string;
}

export default function PaymentModule({ planName, price, onClose, onComplete, businessPhone = "8987766981" }: PaymentModuleProps) {
  const [method, setMethod] = useState<'upi' | 'card' | 'qr'>('qr');
  const [isProcessing, setIsProcessing] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes

  useEffect(() => {
    const interval = setInterval(() => {
      setTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onComplete();
    }, 2000);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-white flex flex-col md:flex-row overflow-hidden shadow-2xl"
    >
      {/* Left Sidebar - Summary */}
      <div className="w-full md:w-[350px] bg-stone-900 md:bg-[#94A3A5] p-8 text-white relative">
        <button 
          onClick={onClose}
          className="absolute top-6 left-6 p-2 rounded-full hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="mt-16 space-y-8">
          <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-full w-fit">
            <ShieldCheck size={16} className="text-white" />
            <span className="text-[10px] font-black uppercase tracking-widest">Secure Checkout</span>
          </div>

          <div className="space-y-2">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <CreditCard size={24} />
            </div>
            <h2 className="text-2xl font-black tracking-tight mt-4">C VIDYA MANAGEMENT</h2>
            <p className="text-white/60 text-xs flex items-center gap-2 italic">
              <span className="inline-block w-4 h-4 rounded-full border border-white/40 flex items-center justify-center text-[10px]">i</span>
              Serving customers since 1+ years
            </p>
          </div>

          <div className="p-6 bg-white/10 rounded-[2rem] border border-white/10 flex justify-between items-center group cursor-pointer hover:bg-white/20 transition-all">
            <div>
              <p className="text-[10px] font-bold text-white/60 uppercase tracking-widest mb-1">Total Amount</p>
              <p className="text-3xl font-black">₹{price}</p>
            </div>
            <ArrowLeft className="rotate-180 text-white/40 group-hover:text-white transition-colors" size={20} />
          </div>
        </div>

        <div className="absolute bottom-8 left-8 right-8 hidden md:block">
           <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
             <ShieldCheck size={14} />
             PCI DSS COMPLIANT
           </div>
        </div>
      </div>

      {/* Right - Payment Methods */}
      <div className="flex-1 bg-[#EEF2F3] p-8 md:p-12 overflow-y-auto">
        <div className="max-w-md mx-auto space-y-8">
          <div className="flex justify-between items-start">
            <div>
               <p className="text-stone-500 font-medium mb-1">Payment Options for</p>
               <h3 className="text-2xl font-black text-stone-900 tracking-tight">+91 {businessPhone}</h3>
            </div>
            <button 
              onClick={onClose}
              className="p-2 rounded-full bg-stone-200 text-stone-500 hover:bg-stone-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* QR Card */}
          <div className="bg-white rounded-[2.5rem] p-10 shadow-xl shadow-stone-200 border border-white flex flex-col items-center gap-6 relative overflow-hidden">
            <div className="w-full aspect-square bg-[#F8FAFB] rounded-3xl border border-stone-100 flex items-center justify-center relative group">
              <QrCode size={200} className="text-stone-800 opacity-80 group-hover:opacity-100 transition-opacity" />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-white/80 backdrop-blur-sm">
                <p className="text-stone-900 font-black text-sm uppercase tracking-widest">Scan QR Code</p>
              </div>
            </div>

            <p className="text-stone-500 text-sm font-medium">Scan and pay with any UPI app</p>

            <div className="px-6 py-2 bg-orange-50 border border-orange-100 rounded-full flex items-center gap-3">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-orange-200 border-t-orange-600 rounded-full"
              />
              <span className="text-xs font-bold text-orange-900">Expires in {formatTime(timer)} mins</span>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
             <button 
                onClick={() => setMethod('upi')}
                className={`w-full p-6 rounded-[1.5rem] bg-white shadow-sm border transition-all flex items-center justify-between hover:scale-[1.02] ${method === 'upi' ? 'border-green-500' : 'border-stone-100'}`}
             >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center text-green-600">
                    <Smartphone size={20} />
                  </div>
                  <span className="font-bold text-stone-900">Pay by UPI ID</span>
                </div>
                <ArrowLeft className="rotate-180 text-stone-300" size={18} />
             </button>

             <button 
                onClick={() => setMethod('card')}
                className={`w-full p-6 rounded-[1.5rem] bg-white shadow-sm border transition-all flex items-center justify-between hover:scale-[1.02] ${method === 'card' ? 'border-blue-500' : 'border-stone-100'}`}
             >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                    <CreditCard size={20} />
                  </div>
                  <span className="font-bold text-stone-900">Card</span>
                </div>
                <ArrowLeft className="rotate-180 text-stone-300" size={18} />
             </button>
          </div>

          <div className="pt-4">
            <Button 
               onClick={handlePay}
               disabled={isProcessing}
               className="w-full h-20 rounded-[1.5rem] bg-[#94A3A5] text-white text-xl font-black uppercase tracking-widest hover:bg-[#869597] shadow-xl shadow-stone-200 flex items-center justify-center gap-3 active:scale-95 transition-all"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="animate-spin" />
                  Processing...
                </>
              ) : (
                'I have paid'
              )}
            </Button>
          </div>

          <div className="flex items-center justify-between text-stone-400 font-bold text-[8px] uppercase tracking-widest px-4">
             <div className="flex items-center gap-2">
               <ShieldCheck size={12} />
               PCI DSS COMPLIANT
             </div>
             <span>Verified Merchant</span>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isProcessing && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-white/90 backdrop-blur-md flex flex-col items-center justify-center z-[200]"
          >
            <div className="w-24 h-24 relative">
               <motion.div 
                className="absolute inset-0 border-8 border-stone-100 rounded-full"
               />
               <motion.div 
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                className="absolute inset-0 border-8 border-t-orange-600 border-r-transparent border-b-transparent border-l-transparent rounded-full"
               />
            </div>
            <h2 className="text-2xl font-black text-stone-900 mt-8 tracking-tight">Verifying Payment</h2>
            <p className="text-stone-500 font-medium mt-2">Checking with UPI operator...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
