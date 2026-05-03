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
  const [timer, setTimer] = useState(180); // 3 minutes
  const [isExpired, setIsExpired] = useState(false);
  const [upiId, setUpiId] = useState('');
  const [cardData, setCardData] = useState({ number: '', expiry: '', cvc: '' });

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timer > 0 && !isExpired) {
      interval = setInterval(() => {
        setTimer((prev) => {
          if (prev <= 1) {
            setIsExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timer, isExpired]);

  const regenerateQR = () => {
    setTimer(180);
    setIsExpired(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handlePay = () => {
    if (method === 'upi' && !upiId) return;
    if (method === 'card' && (!cardData.number || !cardData.expiry || !cardData.cvc)) return;
    
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      onComplete();
    }, 2500);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-stone-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="w-full max-w-4xl bg-white rounded-[3rem] shadow-2xl flex flex-col md:flex-row overflow-hidden h-[90vh] md:h-[700px]"
      >
        {/* Left Sidebar - Summary */}
        <div className="w-full md:w-[320px] bg-[#94A3A5] p-8 text-white relative flex flex-col">
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-white/10 transition-colors w-fit mb-8"
          >
            <ArrowLeft size={24} />
          </button>

          <div className="space-y-8 flex-1">
            <div className="flex items-center gap-3 px-4 py-2 bg-white/10 rounded-full w-fit">
              <ShieldCheck size={16} className="text-white" />
              <span className="text-[10px] font-black uppercase tracking-widest">Secure Checkout</span>
            </div>

            <div className="space-y-2">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <CreditCard size={24} />
              </div>
              <h2 className="text-2xl font-black tracking-tight mt-4 uppercase">C Vidya ChickMart</h2>
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

          <div className="mt-8">
            <div className="flex items-center gap-2 text-white/40 text-[10px] font-bold uppercase tracking-widest">
              <ShieldCheck size={14} />
              PCI DSS COMPLIANT
            </div>
          </div>
        </div>

        {/* Right - Payment Methods */}
        <div className="flex-1 bg-[#EEF2F3] p-6 md:p-10 overflow-y-auto">
          <div className="max-w-md mx-auto space-y-6">
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
            <AnimatePresence mode="wait">
              {method === 'qr' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-stone-200 border border-white flex flex-col items-center gap-6 relative overflow-hidden"
                >
                  <div className="text-center">
                    <h4 className="text-xl font-bold text-stone-900 mb-2">C Vidya ChickMart</h4>
                  </div>
                  <div className="w-full aspect-square max-w-[240px] bg-white rounded-3xl border border-stone-100 flex items-center justify-center relative group overflow-hidden">
                    {!isExpired ? (
                      <img 
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=8987766981@ybl&pn=C%20Vidya%20ChickMart&cu=INR&am=${price}`}
                        alt="Payment QR Code"
                        className="w-4/5 h-4/5 object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-4 p-4 text-center">
                        <div className="w-16 h-16 bg-stone-100 rounded-full flex items-center justify-center text-stone-300">
                          <QrCode size={32} />
                        </div>
                        <p className="text-stone-400 font-bold text-xs uppercase tracking-wider">QR Code Expired</p>
                        <Button 
                          onClick={regenerateQR}
                          variant="outline"
                          className="rounded-xl border-stone-200 text-stone-900 h-10 px-6 font-bold text-xs"
                        >
                          Regenerate QR
                        </Button>
                      </div>
                    )}
                  </div>

                  <p className="text-stone-500 text-xs font-semibold">Scan and pay with any UPI app</p>

                  {!isExpired && (
                    <div className="px-5 py-2 bg-orange-50 border border-orange-100 rounded-full flex items-center gap-3">
                      <motion.div 
                        animate={{ rotate: 360 }}
                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                        className="w-3.5 h-3.5 border-2 border-orange-200 border-t-orange-600 rounded-full"
                      />
                      <span className="text-[10px] font-bold text-orange-900">Expires in {formatTime(timer)} mins</span>
                    </div>
                  )}
                  
                  {isExpired && (
                     <div className="px-5 py-2 bg-stone-100 rounded-full">
                       <span className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Session Timed Out</span>
                     </div>
                  )}
                </motion.div>
              )}

              {method === 'upi' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-stone-200 border border-stone-100"
                >
                  <h4 className="text-xl font-bold text-stone-900 mb-6">Pay using UPI ID</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-4">Enter Virtual Private Address (VPA)</label>
                       <input 
                        type="text" 
                        placeholder="yourname@upi"
                        className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-6 font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                       />
                    </div>
                    <div className="p-4 bg-green-50 rounded-2xl border border-green-100">
                      <p className="text-[10px] text-green-700 font-medium">Please ensure you have your mobile device ready to approve the transaction in your UPI app.</p>
                    </div>
                  </div>
                </motion.div>
              )}

              {method === 'card' && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-stone-200 border border-stone-100"
                >
                  <h4 className="text-xl font-bold text-stone-900 mb-6">Credit / Debit Card</h4>
                  <div className="space-y-4">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-4">Card Number</label>
                       <input 
                        type="text" 
                        placeholder="0000 0000 0000 0000"
                        className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-6 font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        value={cardData.number}
                        onChange={(e) => setCardData({...cardData, number: e.target.value})}
                       />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-4">Expiry Date</label>
                        <input 
                          type="text" 
                          placeholder="MM/YY"
                          className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-6 font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          value={cardData.expiry}
                          onChange={(e) => setCardData({...cardData, expiry: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest ml-4">CVV / CVC</label>
                        <input 
                          type="password" 
                          placeholder="***"
                          maxLength={3}
                          className="w-full h-14 bg-stone-50 border border-stone-200 rounded-2xl px-6 font-bold text-stone-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                          value={cardData.cvc}
                          onChange={(e) => setCardData({...cardData, cvc: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="flex items-center gap-2 justify-center text-[10px] text-stone-400 font-bold uppercase tracking-widest">
                       <ShieldCheck size={12} />
                       128-bit SSL SECURE ENCRYPTION
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Options */}
            <div className="grid grid-cols-1 gap-3">
               <button 
                  onClick={() => setMethod('upi')}
                  className={`w-full p-6 rounded-[1.5rem] bg-white shadow-sm border transition-all flex items-center justify-between hover:scale-[1.02] active:scale-98 ${method === 'upi' ? 'border-green-500 ring-4 ring-green-50/50' : 'border-stone-100 hover:border-stone-200 shadow-stone-200/50'}`}
               >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${method === 'upi' ? 'bg-green-500 text-white' : 'bg-green-50 text-green-600'}`}>
                      <Smartphone size={20} />
                    </div>
                    <span className="font-bold text-stone-900">Pay by UPI ID</span>
                  </div>
                  <ArrowLeft className={`rotate-180 transition-colors ${method === 'upi' ? 'text-green-500' : 'text-stone-300'}`} size={18} />
               </button>

               <button 
                  onClick={() => setMethod('card')}
                  className={`w-full p-6 rounded-[1.5rem] bg-white shadow-sm border transition-all flex items-center justify-between hover:scale-[1.02] active:scale-98 ${method === 'card' ? 'border-blue-500 ring-4 ring-blue-50/50' : 'border-stone-100 hover:border-stone-200 shadow-stone-200/50'}`}
               >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${method === 'card' ? 'bg-blue-500 text-white' : 'bg-blue-50 text-blue-600'}`}>
                      <CreditCard size={20} />
                    </div>
                    <span className="font-bold text-stone-900">Card</span>
                  </div>
                  <ArrowLeft className={`rotate-180 transition-colors ${method === 'card' ? 'text-blue-500' : 'text-stone-300'}`} size={18} />
               </button>
            </div>

            <div className="pt-4">
              <Button 
                 onClick={handlePay}
                 disabled={isProcessing || (method === 'qr' && isExpired)}
                 className={`w-full h-16 md:h-20 rounded-[1.5rem] text-white text-lg font-black uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all
                  ${(isProcessing || (method === 'qr' && isExpired)) ? 'bg-stone-300 cursor-not-allowed shadow-none' : 'bg-[#94A3A5] hover:bg-[#869597] shadow-stone-200'}
                 `}
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
      </motion.div>

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
