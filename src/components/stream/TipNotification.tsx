
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Star, PartyPopper } from 'lucide-react';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface TipNotificationProps {
  tip: {
    id: string;
    username: string;
    amount: number;
    message?: string;
    timestamp: Date;
    tokenType?: 'SOL' | 'WENLIVE';
  } | null;
}

const TipNotification = ({ tip }: TipNotificationProps) => {
  const [isVisible, setIsVisible] = useState(false);
  
  useEffect(() => {
    if (tip) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 5000); // Show for 5 seconds
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [tip]);
  
  if (!tip) return null;
  
  // Different animations and icons based on amount
  let Icon = Heart;
  let bgColor = "bg-gradient-to-r from-pink-500 to-purple-500";
  
  if (tip.amount >= 5) {
    Icon = Star;
    bgColor = "bg-gradient-to-r from-amber-400 to-orange-500";
  }
  
  if (tip.amount >= 10) {
    Icon = PartyPopper;
    bgColor = "bg-gradient-to-r from-solana to-blue-500";
  }
  
  // Use the actual token type from the tip data, default to SOL if not specified
  const tokenType = tip.tokenType || 'SOL';
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="fixed bottom-10 right-10 z-50 pointer-events-none"
          initial={{ opacity: 0, y: 50, scale: 0.3 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.5 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <div className={`${bgColor} rounded-lg shadow-lg p-4 text-white max-w-sm`}>
            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="h-12 w-12 border-2 border-white">
                  <AvatarFallback className="bg-black/50">
                    {tip.username.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -top-2 -right-2 bg-white/90 rounded-full p-1">
                  <Icon className="h-4 w-4 text-solana" />
                </div>
              </div>
              
              <div>
                <div className="font-bold text-sm">{tip.username}</div>
                <div className="text-xl font-extrabold">{tip.amount} {tokenType}</div>
              </div>
            </div>
            
            {tip.message && (
              <div className="mt-2 text-sm bg-black/20 rounded p-2">
                {tip.message}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default TipNotification;
