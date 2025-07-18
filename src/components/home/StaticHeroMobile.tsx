
import React from 'react';
import { Video, Users, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

const StaticHeroMobile = () => {
  const contractAddress = "GndWt4p2L3zekGScuUSFmbqKjfri1jRq5KfXr6oEpump";

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(contractAddress)
      .then(() => {
        toast.success('Contract address copied!');
      })
      .catch(err => {
        console.error("Failed to copy text: ", err);
        toast.error('Failed to copy address');
      });
  };

  return (
    <div className="w-full px-4 py-8 text-center">
      {/* Main Hero Title */}
      <div className="mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold mb-3 leading-tight">
          <span className="bg-gradient-to-r from-green-400 to-red-500 bg-clip-text text-transparent">
            Stream, Connect & Earn with WenLive.fun
          </span>
        </h1>
        <p className="text-sm sm:text-base text-foreground/80 leading-relaxed px-2 mb-4">
          Stream. Earn. Repeat. On-chain and unstoppable — welcome to WenLive.fun
        </p>

        {/* Contract Address */}
        <div className="flex justify-center mb-4">
          <div 
            className="bg-primary/20 hover:bg-primary/30 px-4 py-2 rounded-full text-sm font-semibold text-primary cursor-pointer transition-colors flex items-center gap-2 border border-primary/30"
            onClick={handleCopyAddress}
            title="Copy contract address"
          >
            <span className="truncate max-w-[200px] sm:max-w-none">
              CA: {contractAddress}
            </span>
            <Copy size={14} className="flex-shrink-0" />
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6 max-w-md mx-auto">
        <Link to="/watch" className="flex-1">
          <Button className="w-full text-sm py-3 bg-primary hover:bg-primary/90">
            Start Watching
          </Button>
        </Link>
        <Link to="/spaces" className="flex-1">
          <Button variant="outline" className="w-full text-sm py-3 flex items-center gap-2">
            <Users size={16} />
            Spaces (beta)
          </Button>
        </Link>
        <Link to="/create" className="flex-1">
          <Button variant="outline" className="w-full text-sm py-3">
            Become a Creator
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default StaticHeroMobile;
