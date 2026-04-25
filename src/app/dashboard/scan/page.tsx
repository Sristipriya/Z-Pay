"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { X, Camera, AlertCircle, Loader2, ArrowLeft, Store, Send } from "lucide-react";
import { parseUPIQRCode } from "@/lib/upi-service";

export default function ScanPage() {
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [detectedType, setDetectedType] = useState<'expo' | 'upi' | null>(null);
  const [detectedData, setDetectedData] = useState<any>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const router = useRouter();

  useEffect(() => {
    const scanner = new Html5Qrcode("reader");
    scannerRef.current = scanner;
    setLoading(false);

    return () => {
      if (scanner.isScanning) {
        scanner.stop().catch(console.error);
      }
    };
  }, []);

  const startScanner = async () => {
    if (!scannerRef.current) return;
    setError(null);
    setScanning(true);
    setDetectedType(null);
    setDetectedData(null);

    try {
      await scannerRef.current.start(
        { facingMode: "environment" },
        { fps: 15, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Camera access denied. Please check permissions.");
      setScanning(false);
    }
  };

  const handleScanSuccess = async (decodedText: string) => {
    if (scannerRef.current) {
      await scannerRef.current.stop();
    }
    setScanning(false);

    if (decodedText.toLowerCase().startsWith('upi://') || 
        (decodedText.includes('@') && !decodedText.includes('@expo'))) {
      const parsed = parseUPIQRCode(decodedText);
      if (parsed.isValid) {
        setDetectedType('upi');
        setDetectedData(parsed);
        return;
      }
    }

    try {
      const data = JSON.parse(decodedText);
      if (data.type === "payment" && data.expo) {
        setDetectedType('expo');
        setDetectedData(data);
        return;
      }
    } catch (e) {
      if (decodedText.includes("@expo") || decodedText.startsWith("G")) {
        setDetectedType('expo');
        setDetectedData({ expo: decodedText, amount: null, note: null });
        return;
      }
    }

    setError("Unrecognized QR Code Format. Scan an EXPO or UPI QR.");
  };

  const handleProceedExpo = () => {
    if (!detectedData) return;
    const params = new URLSearchParams();
    const username = detectedData.expo?.replace("@expo", "@expo") || detectedData;
    params.set("to", username);
    if (detectedData.amount) params.set("amount", detectedData.amount);
    if (detectedData.note) params.set("note", detectedData.note);
    router.push(`/dashboard/send?${params.toString()}`);
  };

  const handleProceedUPI = () => {
    if (!detectedData) return;
    const params = new URLSearchParams();
    params.set("merchant", detectedData.merchantName);
    params.set("upi", detectedData.merchantUpiId);
    if (detectedData.amount) params.set("amount", detectedData.amount.toString());
    router.push(`/dashboard/merchant?${params.toString()}`);
  };

  const handleStop = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      await scannerRef.current.stop();
      setScanning(false);
    }
  };

  const resetScan = () => {
    setDetectedType(null);
    setDetectedData(null);
    setError(null);
  };

  return (
    <div className="max-w-xl mx-auto space-y-12 pb-20">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight mb-4 uppercase leading-none">
          SCAN & PAY
        </h1>
        <p className="text-zinc-500 font-medium text-lg">Instant settlement via visual routing</p>
      </div>

      <AnimatePresence mode="wait">
        {detectedType ? (
          <motion.div
            key="detected"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="glass-card p-8 rounded-[2rem] space-y-6"
          >
            <div className="text-center space-y-4">
              <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center ${
                detectedType === 'upi' ? 'bg-green-500/20' : 'bg-[#C694F9]/20'
              }`}>
                {detectedType === 'upi' ? (
                  <Store className="w-10 h-10 text-green-500" />
                ) : (
                  <Send className="w-10 h-10 text-[#C694F9]" />
                )}
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  {detectedType === 'upi' ? 'UPI MERCHANT DETECTED' : 'EXPO USER DETECTED'}
                </p>
                <h2 className="text-2xl font-black">
                  {detectedType === 'upi' ? detectedData?.merchantName : (detectedData?.expo || detectedData)}
                </h2>
                {detectedType === 'upi' && (
                  <p className="text-zinc-500 text-sm">{detectedData?.merchantUpiId}</p>
                )}
              </div>
              {detectedType === 'upi' && detectedData?.amount && (
                <div className="p-4 bg-green-500/10 rounded-xl border border-green-500/20">
                  <p className="text-xs text-zinc-500 uppercase tracking-widest mb-1">Amount</p>
                  <p className="text-3xl font-black text-green-500">₹{detectedData.amount.toLocaleString('en-IN')}</p>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Button
                onClick={detectedType === 'upi' ? handleProceedUPI : handleProceedExpo}
                className={`w-full h-16 font-black text-lg rounded-2xl ${
                  detectedType === 'upi' 
                    ? 'bg-green-500 hover:bg-green-600 text-black' 
                    : 'bg-[#C694F9] hover:bg-[#C694F9]/90 text-black'
                }`}
              >
                {detectedType === 'upi' ? 'PAY MERCHANT' : 'SEND TO USER'}
              </Button>
              <Button
                variant="outline"
                onClick={resetScan}
                className="w-full h-12 border-white/10 rounded-xl font-bold"
              >
                Scan Again
              </Button>
            </div>

            {detectedType === 'upi' && (
              <p className="text-[10px] text-zinc-600 text-center uppercase tracking-widest">
                Merchant will receive INR via partner settlement
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="scanner"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative group aspect-square"
          >
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-600/20 via-purple-600/20 to-blue-600/20 rounded-[3rem] blur-2xl opacity-50" />
            
            <div className="relative h-full glass-card p-0 rounded-[2.5rem] overflow-hidden bg-black">
              <div id="reader" className="w-full h-full object-cover" />
              
              <AnimatePresence>
                {!scanning && !loading && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 flex flex-col items-center justify-center gap-8 bg-black/60 backdrop-blur-md z-20"
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse" />
                      <div className="relative w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-600/40">
                        <Camera className="w-10 h-10 text-white" />
                      </div>
                    </div>
                    <div className="text-center px-8">
                      <h3 className="text-xl font-black tracking-tight mb-2 uppercase">Scan Any QR</h3>
                      <p className="text-zinc-400 text-sm font-bold uppercase tracking-widest leading-relaxed">
                        EXPO IDs or UPI merchant QRs
                      </p>
                    </div>
                    <Button 
                      onClick={startScanner} 
                      className="bg-white text-black hover:bg-zinc-200 font-black px-10 h-16 rounded-2xl text-lg shadow-2xl active:scale-95 transition-all"
                    >
                      ACTIVATE SCANNER
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>

              {loading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black z-30">
                  <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
                </div>
              )}

              {scanning && (
                <>
                  <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none z-10">
                    <div className="w-full h-full border-2 border-blue-500/50 rounded-2xl relative">
                      <motion.div 
                        animate={{ top: ["10%", "90%", "10%"] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                        className="absolute left-0 right-0 h-0.5 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,1)]"
                      />
                    </div>
                  </div>
                  <Button 
                    onClick={handleStop}
                    className="absolute bottom-10 left-1/2 -translate-x-1/2 h-14 w-14 p-0 rounded-full bg-red-500/20 text-red-500 hover:bg-red-500/40 border border-red-500/20 backdrop-blur-md z-20 transition-all active:scale-90"
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-4 text-red-500 text-sm font-black uppercase tracking-tight"
        >
          <AlertCircle className="w-6 h-6 flex-shrink-0" />
          {error}
        </motion.div>
      )}

      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Button 
            variant="outline" 
            className="h-14 border-white/10 hover:bg-white/5 rounded-xl text-zinc-400 font-bold gap-2 transition-all"
            onClick={() => router.push("/dashboard/send")}
          >
            <Send className="w-4 h-4" /> Send to User
          </Button>
          <Button 
            variant="outline" 
            className="h-14 border-white/10 hover:bg-white/5 rounded-xl text-zinc-400 font-bold gap-2 transition-all"
            onClick={() => router.push("/dashboard/merchant")}
          >
            <Store className="w-4 h-4" /> Pay Merchant
          </Button>
        </div>
        <p className="text-[10px] text-zinc-600 text-center font-black uppercase tracking-[0.2em]">
          Supports EXPO Universal IDs & Indian UPI QRs
        </p>
      </div>
    </div>
  );
}
