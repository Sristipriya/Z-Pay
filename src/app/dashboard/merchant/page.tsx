"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, Camera, AlertCircle, Loader2, Scan, ArrowLeft, Store, 
  IndianRupee, Clock, Lock, Shield, CheckCircle2, ExternalLink,
  RefreshCw, Wallet, Keyboard, Coffee, Train, ShoppingBag, 
  Utensils, Fuel, Building2, Info, ChevronRight, Globe, Zap,
  FileText, TrendingUp, CreditCard, Banknote
} from "lucide-react";
import { cn } from "@/lib/utils";
import { parseUPIQRCode, type ParsedUPIQR } from "@/lib/upi-service";
import { toast } from "sonner";

const DEMO_MERCHANTS = [
  { id: 1, name: "Mumbai Café", upiId: "mumbai.cafe@ybl", category: "Food & Drinks", icon: Coffee, amount: 450, location: "Mumbai, India" },
  { id: 2, name: "Delhi Metro", upiId: "delhimetro@paytm", category: "Transport", icon: Train, amount: 60, location: "Delhi, India" },
  { id: 3, name: "Bangalore Electronics", upiId: "blrelectro@okaxis", category: "Shopping", icon: ShoppingBag, amount: 2499, location: "Bangalore, India" },
  { id: 4, name: "Chennai Dosa House", upiId: "chennaidosa@upi", category: "Restaurant", icon: Utensils, amount: 320, location: "Chennai, India" },
  { id: 5, name: "HP Petrol Pump", upiId: "hp.fuel@icici", category: "Fuel", icon: Fuel, amount: 1500, location: "Hyderabad, India" },
  { id: 6, name: "Reliance Fresh", upiId: "reliancefresh@hdfc", category: "Groceries", icon: Building2, amount: 890, location: "Pune, India" },
];

const LRS_ANNUAL_LIMIT_USD = 250000;
const TRANSACTION_LIMIT_INR = 500000;

interface QuoteLock {
  id: string;
  inr_amount: number;
  xlm_amount: string;
  rate: string;
  expires_at: string;
  seconds_remaining: number;
}

interface PaymentResult {
  tx_hash: string;
  stellar_explorer_url: string;
  inr_amount: number;
  xlm_amount: string;
  merchant_name: string;
  merchant_upi_id: string;
  demo_mode?: boolean;
  settlement: {
    status: string;
    utr_number: string;
    message: string;
  };
}

interface FeeBreakdown {
  baseAmount: number;
  platformFee: number;
  networkFee: number;
  fxSpread: number;
  totalFees: number;
  effectiveRate: number;
}

export default function MerchantPayPage() {
  const [step, setStep] = useState<'home' | 'scan' | 'manual' | 'amount' | 'confirm' | 'pin' | 'processing' | 'success'>('home');
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const router = useRouter();

  const [merchant, setMerchant] = useState<ParsedUPIQR | null>(null);
  const [inrAmount, setInrAmount] = useState("");
  const [quote, setQuote] = useState<QuoteLock | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [pin, setPin] = useState(['', '', '', '']);
  const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
  const [balance, setBalance] = useState<string>("0");
  const [feeBreakdown, setFeeBreakdown] = useState<FeeBreakdown | null>(null);
  const pinInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const [manualUpiId, setManualUpiId] = useState("");
  const [manualMerchantName, setManualMerchantName] = useState("");
  const [purposeCode, setPurposeCode] = useState("S0305");

  const PURPOSE_CODES = [
    { code: "S0305", label: "Travel - Business", description: "Business travel expenses" },
    { code: "S0306", label: "Travel - Personal", description: "Personal travel/tourism" },
    { code: "S0301", label: "Education", description: "Educational expenses abroad" },
    { code: "S0303", label: "Medical", description: "Medical treatment" },
    { code: "S1108", label: "Gifts", description: "Gift remittance" },
  ];

  useEffect(() => {
    fetch("/api/expo/balance")
      .then(res => res.json())
      .then(data => {
        const xlm = data.balances?.find((b: any) => b.asset === 'XLM');
        setBalance(xlm?.balance || "0");
      });
  }, []);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown(c => {
        if (c <= 1) {
          setQuote(null);
          toast.error("Quote expired. Please refresh.");
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const initScanner = async () => {
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode("merchant-reader");
    }
  };

  const startScanner = async () => {
    await initScanner();
    if (!scannerRef.current) return;
    setError(null);
    setScanning(true);
    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 250, height: 250 } },
        (decodedText) => handleScanSuccess(decodedText),
        () => {}
      );
    } catch (err: any) {
      setError(err.message || "Camera access denied");
      setScanning(false);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (scannerRef.current) await scannerRef.current.stop();
    setScanning(false);
    
    const parsed = parseUPIQRCode(decodedText);
    if (parsed.isValid) {
      setMerchant(parsed);
      if (parsed.amount) setInrAmount(parsed.amount.toString());
      setStep('amount');
    } else {
      setError("Invalid UPI QR Code. Please scan a valid merchant QR.");
    }
  };

  const handleStopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      await scannerRef.current.stop();
      setScanning(false);
    }
  };

  const handleDemoMerchant = (demoMerchant: typeof DEMO_MERCHANTS[0]) => {
    setMerchant({
      isValid: true,
      merchantUpiId: demoMerchant.upiId,
      merchantName: demoMerchant.name,
      merchantCategory: demoMerchant.category,
    });
    setInrAmount(demoMerchant.amount.toString());
    setStep('amount');
  };

  const handleManualEntry = () => {
    if (!manualUpiId.trim()) {
      setError("Please enter a valid UPI ID");
      return;
    }
    if (!manualMerchantName.trim()) {
      setError("Please enter the merchant name");
      return;
    }
    setError(null);
    setMerchant({
      isValid: true,
      merchantUpiId: manualUpiId.trim(),
      merchantName: manualMerchantName.trim(),
    });
    setStep('amount');
  };

  const calculateFees = (amount: number, xlmAmount: number): FeeBreakdown => {
    const platformFee = amount * 0.005;
    const networkFee = 0.00001 * 25;
    const fxSpread = amount * 0.002;
    const totalFees = platformFee + networkFee + fxSpread;
    const effectiveRate = xlmAmount / amount;
    
    return {
      baseAmount: amount,
      platformFee,
      networkFee,
      fxSpread,
      totalFees,
      effectiveRate,
    };
  };

  const generateQuote = async () => {
    if (!inrAmount || parseFloat(inrAmount) <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const amount = parseFloat(inrAmount);
    
    if (amount > TRANSACTION_LIMIT_INR) {
      setError(`Transaction limit exceeded. Maximum ₹${TRANSACTION_LIMIT_INR.toLocaleString('en-IN')} per transaction (RBI LRS compliance)`);
      return;
    }

    setQuoteLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/merchant/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inr_amount: amount }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setQuote(data);
        setCountdown(data.seconds_remaining);
        setFeeBreakdown(calculateFees(amount, parseFloat(data.xlm_amount)));
        setStep('confirm');
      }
    } catch {
      setError("Failed to lock quote");
    } finally {
      setQuoteLoading(false);
    }
  };

  const handlePinChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    if (value && index < 3) pinInputRefs.current[index + 1]?.focus();
    if (newPin.every(d => d !== '') && newPin.join('').length === 4) {
      processPayment(newPin.join(''));
    }
  };

  const handlePinKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      pinInputRefs.current[index - 1]?.focus();
    }
  };

  const processPayment = async (enteredPin: string) => {
    if (!quote || !merchant) return;
    setStep('processing');
    try {
      const res = await fetch("/api/merchant/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote_id: quote.id,
          merchant_name: merchant.merchantName,
          merchant_upi_id: merchant.merchantUpiId,
          pin: enteredPin,
          purpose_code: purposeCode,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setStep('pin');
        setPin(['', '', '', '']);
      } else {
        setPaymentResult(data);
        setStep('success');
        toast.success(`₹${data.inr_amount} paid to ${data.merchant_name}`);
      }
    } catch {
      setError("Payment failed");
      setStep('pin');
    }
  };

  if (step === 'success' && paymentResult) {
    return (
      <div className="max-w-xl mx-auto space-y-8 pb-20">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 rounded-[2.5rem] text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-500 to-emerald-500" />
          
          {paymentResult.demo_mode && (
            <div className="absolute top-4 right-4 px-3 py-1 bg-amber-500/20 rounded-full">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-500">Demo Mode</span>
            </div>
          )}
          
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring" }} className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-500" />
          </motion.div>
          <h2 className="text-3xl font-black uppercase mb-2">Payment Complete</h2>
          <p className="text-zinc-400 mb-6">Merchant has been credited in INR</p>
          
          <div className="space-y-4 mb-8">
            <div className="p-4 bg-white/5 rounded-2xl">
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">Merchant</p>
              <p className="text-xl font-black">{paymentResult.merchant_name}</p>
              <p className="text-xs text-zinc-500">{paymentResult.merchant_upi_id}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 bg-green-500/10 rounded-2xl border border-green-500/20">
                <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-1">Merchant Received</p>
                <p className="text-2xl font-black text-green-500">₹{parseFloat(paymentResult.inr_amount.toString()).toLocaleString('en-IN')}</p>
                <p className="text-[10px] text-green-500/60">INR (Indian Rupee)</p>
              </div>
              <div className="p-4 bg-[#C694F9]/10 rounded-2xl border border-[#C694F9]/20">
                <p className="text-zinc-400 text-[10px] uppercase tracking-widest mb-1">You Spent</p>
                <p className="text-2xl font-black text-[#C694F9]">{paymentResult.xlm_amount}</p>
                <p className="text-[10px] text-[#C694F9]/60">XLM (Stellar)</p>
              </div>
            </div>

            <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-blue-400 text-xs font-bold flex items-center gap-2">
                  <Globe className="w-4 h-4" /> Cross-Border Settlement
                </span>
                <span className="text-[10px] text-blue-500/60">via Stellar Network</span>
              </div>
              <div className="text-left text-xs text-blue-300/70 space-y-1">
                <p>• Your USDC/XLM → Converted to INR</p>
                <p>• Merchant receives INR via UPI instantly</p>
                <p>• Settlement time: ~3 seconds</p>
              </div>
            </div>

            <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <div className="flex items-center justify-between">
                <span className="text-amber-400 text-xs font-bold">UPI Settlement</span>
                <span className="text-[10px] font-bold text-green-500 uppercase">{paymentResult.settlement.status}</span>
              </div>
              <p className="text-amber-500/70 text-[10px] mt-1">{paymentResult.settlement.message}</p>
              <p className="text-amber-500/50 text-[10px] mt-1">UTR: {paymentResult.settlement.utr_number}</p>
            </div>

            <div className="p-3 bg-white/5 rounded-xl">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-500">RBI LRS Purpose Code</span>
                <span className="text-zinc-300 font-bold">{purposeCode} - Travel</span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <a href={paymentResult.stellar_explorer_url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 text-zinc-500 hover:text-[#C694F9] font-bold text-sm bg-white/5 py-4 rounded-xl border border-white/5 w-full">
              VIEW STELLAR TX <ExternalLink className="w-4 h-4" />
            </a>
            <Button onClick={() => router.push("/dashboard")} className="w-full h-14 bg-white text-black hover:bg-zinc-200 font-black rounded-2xl">
              RETURN TO DASHBOARD
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6 pb-20">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-3 uppercase leading-none">PAY MERCHANT</h1>
        <p className="text-zinc-500 font-medium">Pay Indian merchants with your crypto - they receive INR</p>
      </div>

      <div className="glass-card p-4 rounded-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#C694F9]/20 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-[#C694F9]" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-500">Your Balance</p>
              <p className="font-black">{parseFloat(balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-600 bg-zinc-800 px-2 py-1 rounded">Testnet</span>
          </div>
        </div>
      </div>

      <div className="p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs text-blue-300/80">
          <p className="font-bold text-blue-400 mb-1">How it works (MoneyGram-style)</p>
          <p>Your crypto (USDC/XLM) is converted to INR and sent to merchant via UPI. Settlement happens in ~3 seconds. RBI LRS compliant.</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'home' && (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="space-y-3">
              <h3 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" /> Demo Merchants (Try Now)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {DEMO_MERCHANTS.map((dm) => (
                  <motion.button
                    key={dm.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDemoMerchant(dm)}
                    className="glass-card p-4 rounded-2xl text-left hover:border-[#C694F9]/30 transition-all group"
                  >
                    <div className="w-10 h-10 bg-[#C694F9]/20 rounded-xl flex items-center justify-center mb-3 group-hover:bg-[#C694F9]/30 transition-colors">
                      <dm.icon className="w-5 h-5 text-[#C694F9]" />
                    </div>
                    <p className="font-bold text-sm truncate">{dm.name}</p>
                    <p className="text-[10px] text-zinc-500 truncate">{dm.category}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-lg font-black text-[#C694F9]">₹{dm.amount}</p>
                      <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-[#C694F9] transition-colors" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest">
                <span className="bg-black px-4 text-zinc-500">Or pay any merchant</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={() => { setStep('scan'); setLoading(true); setTimeout(() => { initScanner(); setLoading(false); }, 500); }} 
                className="h-16 bg-[#C694F9] hover:bg-[#C694F9]/90 text-black font-black rounded-2xl flex flex-col gap-1"
              >
                <Camera className="w-5 h-5" />
                <span className="text-xs">Scan QR</span>
              </Button>
              <Button 
                onClick={() => { setStep('manual'); setError(null); }} 
                variant="outline" 
                className="h-16 border-white/10 rounded-2xl font-bold flex flex-col gap-1"
              >
                <Keyboard className="w-5 h-5" />
                <span className="text-xs">Enter UPI ID</span>
              </Button>
            </div>

            <div className="glass-card p-4 rounded-2xl space-y-3">
              <h4 className="text-xs font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
                <Shield className="w-4 h-4 text-green-500" /> RBI LRS Compliance
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-zinc-500 mb-1">Annual Limit</p>
                  <p className="font-black">${LRS_ANNUAL_LIMIT_USD.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white/5 rounded-xl">
                  <p className="text-zinc-500 mb-1">Per Transaction</p>
                  <p className="font-black">₹{TRANSACTION_LIMIT_INR.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <p className="text-[10px] text-zinc-600">All transactions comply with RBI Liberalised Remittance Scheme (LRS) guidelines. TCS applicable on remittances exceeding ₹10 Lakh/FY.</p>
            </div>
          </motion.div>
        )}

        {step === 'scan' && (
          <motion.div key="scan" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
            <div className="relative aspect-square glass-card p-0 rounded-[2.5rem] overflow-hidden bg-black">
              <div id="merchant-reader" className="w-full h-full" />
              {!scanning && !loading && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-black/60 backdrop-blur-md z-20">
                  <div className="w-20 h-20 bg-[#C694F9] rounded-full flex items-center justify-center">
                    <Camera className="w-10 h-10 text-white" />
                  </div>
                  <div className="text-center px-8">
                    <h3 className="text-lg font-black uppercase mb-2">Scan UPI QR</h3>
                    <p className="text-zinc-400 text-sm">Point at any Indian merchant UPI QR code</p>
                  </div>
                  <Button onClick={startScanner} className="bg-white text-black hover:bg-zinc-200 font-black px-8 h-14 rounded-2xl">
                    START SCANNER
                  </Button>
                </div>
              )}
              {scanning && (
                <>
                  <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none z-10">
                    <div className="w-full h-full border-2 border-[#C694F9]/50 rounded-2xl relative">
                      <motion.div animate={{ top: ["10%", "90%", "10%"] }} transition={{ duration: 3, repeat: Infinity, ease: "linear" }} className="absolute left-0 right-0 h-0.5 bg-[#C694F9] shadow-[0_0_15px_#C694F9]" />
                    </div>
                  </div>
                  <Button onClick={handleStopScanner} className="absolute bottom-8 left-1/2 -translate-x-1/2 h-12 w-12 p-0 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/40 z-20">
                    <X className="w-5 h-5" />
                  </Button>
                </>
              )}
              {loading && <div className="absolute inset-0 flex items-center justify-center bg-black z-30"><Loader2 className="w-10 h-10 animate-spin text-[#C694F9]" /></div>}
            </div>

            <Button variant="outline" onClick={() => { handleStopScanner(); setStep('home'); }} className="w-full h-12 border-white/10 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </motion.div>
        )}

        {step === 'manual' && (
          <motion.div key="manual" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="glass-card p-6 rounded-2xl space-y-6">
              <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                <div className="w-12 h-12 bg-[#C694F9]/20 rounded-xl flex items-center justify-center">
                  <Keyboard className="w-6 h-6 text-[#C694F9]" />
                </div>
                <div>
                  <p className="font-black">Enter Merchant Details</p>
                  <p className="text-zinc-500 text-xs">Pay directly using UPI ID</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Merchant UPI ID</label>
                  <Input
                    type="text"
                    placeholder="merchant@upi"
                    className="bg-white/5 border-white/10 h-14 rounded-xl font-medium"
                    value={manualUpiId}
                    onChange={(e) => setManualUpiId(e.target.value)}
                    autoFocus
                  />
                  <p className="text-[10px] text-zinc-600">Example: shop@paytm, store@ybl, merchant@okaxis</p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Merchant Name</label>
                  <Input
                    type="text"
                    placeholder="Shop Name"
                    className="bg-white/5 border-white/10 h-14 rounded-xl font-medium"
                    value={manualMerchantName}
                    onChange={(e) => setManualMerchantName(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Button 
              onClick={handleManualEntry} 
              disabled={!manualUpiId.trim() || !manualMerchantName.trim()}
              className="w-full h-16 bg-[#C694F9] hover:bg-[#C694F9]/90 text-black font-black text-xl rounded-2xl"
            >
              CONTINUE
            </Button>

            <Button 
              variant="outline" 
              onClick={() => { setStep('home'); setManualUpiId(''); setManualMerchantName(''); setError(null); }} 
              className="w-full h-12 border-white/10 rounded-xl"
            >
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </motion.div>
        )}

        {step === 'amount' && merchant && (
          <motion.div key="amount" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="glass-card p-6 rounded-2xl">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-[#C694F9]/20 rounded-2xl flex items-center justify-center">
                  <Store className="w-7 h-7 text-[#C694F9]" />
                </div>
                <div>
                  <p className="font-black text-lg">{merchant.merchantName}</p>
                  <p className="text-zinc-500 text-sm">{merchant.merchantUpiId}</p>
                  {merchant.merchantCategory && (
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#C694F9] bg-[#C694F9]/10 px-2 py-0.5 rounded mt-1 inline-block">{merchant.merchantCategory}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Amount in INR (Merchant receives)</label>
              <div className="relative">
                <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-zinc-600" />
                <Input
                  type="number"
                  placeholder="0"
                  className="bg-white/5 border-white/10 pl-14 h-20 text-4xl font-black rounded-2xl focus:border-[#C694F9]/50"
                  value={inrAmount}
                  onChange={(e) => setInrAmount(e.target.value)}
                  autoFocus
                />
              </div>
              <p className="text-[10px] text-zinc-600 ml-1">Max ₹{TRANSACTION_LIMIT_INR.toLocaleString('en-IN')} per transaction (RBI LRS)</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-500 ml-1">Purpose Code (RBI Compliance)</label>
              <div className="grid grid-cols-2 gap-2">
                {PURPOSE_CODES.slice(0, 4).map((pc) => (
                  <button
                    key={pc.code}
                    onClick={() => setPurposeCode(pc.code)}
                    className={cn(
                      "p-3 rounded-xl text-left transition-all text-xs",
                      purposeCode === pc.code 
                        ? "bg-[#C694F9]/20 border-2 border-[#C694F9]/50" 
                        : "bg-white/5 border border-white/10 hover:border-white/20"
                    )}
                  >
                    <p className="font-bold">{pc.label}</p>
                    <p className="text-[10px] text-zinc-500">{pc.code}</p>
                  </button>
                ))}
              </div>
            </div>

            <Button onClick={generateQuote} disabled={quoteLoading || !inrAmount || parseFloat(inrAmount) <= 0} className="w-full h-16 bg-[#C694F9] hover:bg-[#C694F9]/90 text-black font-black text-xl rounded-2xl">
              {quoteLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : "GET QUOTE"}
            </Button>
            <Button variant="outline" onClick={() => { setStep('home'); setMerchant(null); setInrAmount(''); }} className="w-full h-12 border-white/10 rounded-xl">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
          </motion.div>
        )}

        {step === 'confirm' && merchant && quote && (
          <motion.div key="confirm" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
            <div className="glass-card p-6 rounded-2xl space-y-4">
              <div className="flex items-center gap-4 pb-4 border-b border-white/5">
                <div className="w-12 h-12 bg-[#C694F9]/20 rounded-xl flex items-center justify-center">
                  <Store className="w-6 h-6 text-[#C694F9]" />
                </div>
                <div>
                  <p className="font-black">{merchant.merchantName}</p>
                  <p className="text-zinc-500 text-xs">{merchant.merchantUpiId}</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">Merchant receives (INR)</span>
                  <span className="text-2xl font-black text-green-500">₹{parseFloat(inrAmount).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500 text-sm">You spend (XLM)</span>
                  <span className="text-lg font-bold text-[#C694F9]">{quote.xlm_amount} XLM</span>
                </div>
                <div className="flex justify-between items-center text-xs text-zinc-600">
                  <span>Exchange rate</span>
                  <span>1 XLM = ₹{(1 / parseFloat(quote.rate)).toFixed(2)}</span>
                </div>
              </div>

              {feeBreakdown && (
                <div className="p-3 bg-white/5 rounded-xl space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">Fee Breakdown (Transparent)</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Platform Fee (0.5%)</span>
                    <span>₹{feeBreakdown.platformFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">Network Fee</span>
                    <span>₹{feeBreakdown.networkFee.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-500">FX Spread (0.2%)</span>
                    <span>₹{feeBreakdown.fxSpread.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-bold pt-2 border-t border-white/5">
                    <span className="text-zinc-400">Total Fees</span>
                    <span className="text-amber-500">₹{feeBreakdown.totalFees.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-amber-500" />
                  <span className="text-sm font-bold text-amber-500">Rate locked</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  <span className={cn("text-sm font-black tabular-nums", countdown <= 10 ? "text-red-500" : "text-amber-500")}>{countdown}s</span>
                  <button onClick={generateQuote} disabled={quoteLoading} className="p-1 hover:bg-white/5 rounded">
                    <RefreshCw className={cn("w-4 h-4 text-zinc-500", quoteLoading && "animate-spin")} />
                  </button>
                </div>
              </div>

              <div className="p-3 bg-green-500/10 rounded-xl border border-green-500/20 flex items-center gap-3">
                <Shield className="w-5 h-5 text-green-500" />
                <div className="text-xs">
                  <p className="font-bold text-green-400">RBI LRS Compliant</p>
                  <p className="text-green-500/70">Purpose: {PURPOSE_CODES.find(p => p.code === purposeCode)?.label}</p>
                </div>
              </div>
            </div>

            <Button onClick={() => { setStep('pin'); setPin(['', '', '', '']); setTimeout(() => pinInputRefs.current[0]?.focus(), 100); }} disabled={countdown === 0} className="w-full h-16 bg-[#C694F9] hover:bg-[#C694F9]/90 text-black font-black text-xl rounded-2xl">
              CONFIRM & PAY
            </Button>
          </motion.div>
        )}

        {step === 'pin' && (
          <motion.div key="pin" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="space-y-8">
            <div className="glass-card p-8 rounded-[2rem] text-center space-y-6">
              <div className="w-16 h-16 mx-auto bg-[#C694F9]/20 rounded-2xl flex items-center justify-center">
                <Shield className="w-8 h-8 text-[#C694F9]" />
              </div>
              <div>
                <h2 className="text-2xl font-black uppercase mb-2">Enter PIN</h2>
                <p className="text-zinc-500 text-sm">Enter your 4-digit EXPO PIN</p>
              </div>
              
              <div className="flex justify-center gap-3">
                {[0, 1, 2, 3].map((index) => (
                  <input
                    key={index}
                    ref={(el) => { pinInputRefs.current[index] = el; }}
                    type="password"
                    inputMode="numeric"
                    maxLength={1}
                    value={pin[index]}
                    onChange={(e) => handlePinChange(index, e.target.value)}
                    onKeyDown={(e) => handlePinKeyDown(index, e)}
                    className="w-14 h-14 text-center text-2xl font-black bg-white/5 border-2 border-white/10 rounded-xl focus:border-[#C694F9] focus:outline-none"
                  />
                ))}
              </div>
              
              <Button variant="outline" onClick={() => setStep('confirm')} className="w-full h-12 border-white/10 rounded-xl">
                Cancel
              </Button>
            </div>
          </motion.div>
        )}

        {step === 'processing' && (
          <motion.div key="processing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-12 rounded-[2rem] text-center space-y-6">
            <Loader2 className="w-16 h-16 animate-spin text-[#C694F9] mx-auto" />
            <div>
              <h2 className="text-2xl font-black uppercase mb-2">Processing</h2>
              <p className="text-zinc-500 text-sm">Executing cross-border payment...</p>
            </div>
            <div className="space-y-2 text-xs text-left">
              <div className="flex items-center gap-2 text-green-500">
                <CheckCircle2 className="w-4 h-4" /> Converting XLM to INR
              </div>
              <div className="flex items-center gap-2 text-amber-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Settling via UPI...
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bold">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          {error}
        </motion.div>
      )}
    </div>
  );
}
