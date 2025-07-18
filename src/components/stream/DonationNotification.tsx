
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { DollarSign, Heart, Star } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface DonationNotificationProps {
  donation: {
    username: string;
    amount: number;
    tokenType: 'SOL' | 'WENLIVE';
    message?: string;
    avatar?: string;
  } | null;
}

const DonationNotification = ({ donation }: DonationNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  useEffect(() => {
    if (donation) {
      setIsVisible(true);
      
      // Play donation sound
      if (audioRef.current) {
        audioRef.current.volume = 0.7; // Set volume programmatically
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(console.error);
      }
      
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 6000); // Show for 6 seconds
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [donation]);
  
  if (!donation) return null;
  
  // Choose icon and colors based on amount
  let Icon = Heart;
  let bgColor = "bg-gradient-to-r from-pink-500 to-purple-500";
  let borderColor = "border-pink-500";
  
  if (donation.amount >= 5) {
    Icon = Star;
    bgColor = "bg-gradient-to-r from-amber-400 to-orange-500";
    borderColor = "border-amber-400";
  }
  
  if (donation.amount >= 10) {
    Icon = DollarSign;
    bgColor = "bg-gradient-to-r from-solana to-blue-500";
    borderColor = "border-solana";
  }
  
  return (
    <>
      {/* Enhanced donation sound effect */}
      <audio ref={audioRef} preload="auto">
        <source src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTOZ2/LNeSsFJIXL8dyPOggaY7vx6KdTEhBNqeT2vGsqBjeS4PjKcC0DMZPL7dubQgwRYrLm359IBhZMm+X0wmwjAz2Z3ve/YCcIKnnF+t+STwcOY73w5JJNDgZRqOLytW8eFgdPpOPkuW0fAjuX3/XScSkCLn7K8dONPgcTXa7t/5A/BwdOpePetGceBDSR2PfOdSoELnzI8deRQgsWV6zr+5FAChFGoNrdt3AkBzKT1fHQfCwBK4TL7taJOAkXYrHr54ZMEANJnOH5wmokCjKW1fHScTAAKHnH8d2SQAsSYbPr65FMEAFNoeL9vmwnBjaW2vzSbywDMn/J8NeKPQcSYLLs46dWFQNLqOT/u2MiBTyc2/HBaSoBKHfL9OCSQAkTXa7s+5I8BglOpePZt3IjAzKV2ffOcSoDLnjH8tqKOQkTW6zt8ZA/CgZPoN7vvW0mBjaR2vbObCcGL3zI8deQPwgSY7Hq55BKDQBKluT7tWwqCzOY3fHBaioCKnrM8tiLOwcWZ7Tt4pBPEAFKoNrotHImBjOW2PfHby8CKnzK8deTRwgQYbLs55BHDQFLo+T1sG4pBjKU1vbJdCsEK33H8duLOQcUY7Pt5ZNREQBKn+LxuW0mBzSW2fTBbSoIKnvM8tiLOwcWZ7Tt4pBPEAFKoNrotHImBjOW2PfHby8CKnzK8deTRwgQYbLs55BHDQFLo+T1sG4pBjKU1vbJdCsEK33H8duLOQcUY7Pt5ZNREQBKn+LxuW0mBzSW2fTBbSoIKnvM8tiL" type="audio/wav" />
      </audio>
      
      <AnimatePresence>
        {isVisible && (
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none px-4"
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
          >
            <div className={`${bgColor} rounded-xl shadow-2xl p-6 text-white max-w-md w-full border-2 ${borderColor} relative overflow-hidden`}>
              <div className="flex items-center gap-4 mb-3">
                <div className="relative">
                  <Avatar className="h-16 w-16 border-2 border-white">
                    {donation.avatar ? (
                      <AvatarImage src={donation.avatar} />
                    ) : (
                      <AvatarFallback className="bg-black/50 text-xl">
                        {donation.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <div className="absolute -top-2 -right-2 bg-white/90 rounded-full p-2">
                    <Icon className="h-6 w-6 text-solana" />
                  </div>
                </div>
                
                <div className="flex-1">
                  <div className="font-bold text-lg">{donation.username}</div>
                  <div className="text-2xl font-extrabold flex items-center gap-1">
                    <DollarSign className="h-6 w-6" />
                    {donation.amount} {donation.tokenType}
                  </div>
                  <div className="text-sm opacity-90">donated!</div>
                </div>
              </div>
              
              {donation.message && (
                <div className="bg-black/20 rounded-lg p-3 mt-3">
                  <div className="text-sm font-medium">"{donation.message}"</div>
                </div>
              )}
              
              {/* Animated confetti effect */}
              <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-xl">
                {[...Array(20)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-white/60 rounded-full"
                    initial={{
                      x: Math.random() * 100 + '%',
                      y: '-10px',
                      opacity: 1
                    }}
                    animate={{
                      y: '110%',
                      opacity: 0,
                      rotate: 360
                    }}
                    transition={{
                      duration: 3,
                      delay: Math.random() * 2,
                      ease: "easeOut"
                    }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default DonationNotification;
