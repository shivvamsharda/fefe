import React, { useState, useEffect } from 'react';
import { Upload } from 'lucide-react';
import Layout from '@/components/layout/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useWallet } from '@/context/WalletContext';
import { initRaydiumSDK, createSimpleToken } from '@/utils/raydium';
import { toast } from 'sonner';

const LaunchToken = () => {
  const { connected, openWalletModal, provider } = useWallet();
  const [raydium, setRaydium] = useState<any>(null);
  const [formData, setFormData] = useState({
    tokenName: '',
    tokenSymbol: '',
    description: '',
    totalSupply: '',
    solTarget: '',
    sellPercentage: ''
  });
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [errors, setErrors] = useState<{[key: string]: string}>({});

  // Initialize Raydium SDK when wallet is connected
  useEffect(() => {
    const initializeRaydium = async () => {
      if (connected && provider) {
        try {
          console.log('Initializing Raydium SDK...');
          const { raydium: raydiumInstance } = await initRaydiumSDK(provider);
          setRaydium(raydiumInstance);
          console.log('Raydium initialized');
        } catch (error) {
          console.error('Error initializing Raydium:', error);
        }
      } else {
        // Reset raydium instance when wallet is disconnected
        setRaydium(null);
      }
    };

    initializeRaydium();
  }, [connected, provider]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
    }
  };

  const validateField = (name: string, value: string) => {
    let error = '';
    
    switch (name) {
      case 'tokenName':
        if (!value.trim()) {
          error = 'Token name is required';
        } else if (value.trim().length < 3) {
          error = 'Token name must be at least 3 characters';
        }
        break;
      case 'tokenSymbol':
        if (!value.trim()) {
          error = 'Token symbol is required';
        } else if (value.length < 3 || value.length > 6) {
          error = 'Token symbol must be 3-6 characters';
        } else if (!/^[A-Z]+$/.test(value)) {
          error = 'Token symbol must be uppercase letters only';
        }
        break;
      case 'totalSupply':
        const supply = Number(value);
        if (!value) {
          error = 'Total supply is required';
        } else if (supply < 10000000) {
          error = 'Total supply must be at least 10,000,000';
        }
        break;
      case 'solTarget':
        const target = Number(value);
        if (!value) {
          error = 'SOL target is required';
        } else if (target < 30) {
          error = 'SOL target must be at least 30';
        }
        break;
      case 'sellPercentage':
        const percentage = Number(value);
        if (!value) {
          error = 'Sell percentage is required';
        } else if (percentage < 20 || percentage > 80) {
          error = 'Sell percentage must be between 20 and 80';
        }
        break;
    }
    
    return error;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    let processedValue = value;
    
    // Auto-uppercase token symbol
    if (name === 'tokenSymbol') {
      processedValue = value.toUpperCase();
    }
    
    setFormData(prev => ({ ...prev, [name]: processedValue }));
    
    // Validate field on change
    const error = validateField(name, processedValue);
    setErrors(prev => ({ ...prev, [name]: error }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields before submission
    const newErrors: {[key: string]: string} = {};
    Object.keys(formData).forEach(key => {
      const error = validateField(key, formData[key as keyof typeof formData]);
      if (error) {
        newErrors[key] = error;
      }
    });
    
    setErrors(newErrors);
    
    // If validation errors exist, stop here
    if (Object.keys(newErrors).length > 0) {
      console.log('Form has validation errors:', newErrors);
      return;
    }

    // Check if raydium is initialized
    if (!raydium) {
      toast.error('Raydium SDK not initialized. Please try reconnecting your wallet.');
      return;
    }

    try {
      const tokenData = {
        tokenName: formData.tokenName,
        tokenSymbol: formData.tokenSymbol,
        description: formData.description,
        totalSupply: Number(formData.totalSupply),
        solTarget: Number(formData.solTarget),
        sellPercentage: Number(formData.sellPercentage),
        selectedImage: selectedImage ? {
          name: selectedImage.name,
          size: selectedImage.size,
          type: selectedImage.type
        } : null
      };

      console.log('Submitting token creation with data:', tokenData);
      
      const result = await createSimpleToken(raydium, tokenData);
      console.log('Token creation result:', result);

      if (result.success) {
        toast.success(`${result.message}. Mint address: ${result.mintAddress}`);
      } else {
        toast.error(`Token creation failed: ${result.error}`);
      }
    } catch (error) {
      console.error('Unexpected error during token creation:', error);
      toast.error('An unexpected error occurred during token creation');
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">Launch Your Token</h1>
          
          {!connected ? (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <p className="text-lg text-muted-foreground">
                    Please connect your wallet to launch tokens
                  </p>
                  <Button onClick={openWalletModal} className="mt-4">
                    Connect Wallet
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
          <Card>
            <CardHeader>
              <CardTitle>Token Details</CardTitle>
              <CardDescription>
                Create your own token on the Solana blockchain
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="tokenName">Token Name</Label>
                  <Input
                    id="tokenName"
                    name="tokenName"
                    type="text"
                    placeholder="Enter token name"
                    value={formData.tokenName}
                    onChange={handleInputChange}
                    className={errors.tokenName ? 'border-red-500' : ''}
                    required
                  />
                  {errors.tokenName && (
                    <p className="text-sm text-red-500">{errors.tokenName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tokenSymbol">Token Symbol</Label>
                  <Input
                    id="tokenSymbol"
                    name="tokenSymbol"
                    type="text"
                    placeholder="Enter token symbol (e.g., BTC)"
                    value={formData.tokenSymbol}
                    onChange={handleInputChange}
                    className={errors.tokenSymbol ? 'border-red-500' : ''}
                    required
                  />
                  {errors.tokenSymbol && (
                    <p className="text-sm text-red-500">{errors.tokenSymbol}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    name="description"
                    placeholder="Describe your token..."
                    value={formData.description}
                    onChange={handleInputChange}
                    rows={4}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tokenImage">Token Image</Label>
                  <div className="relative">
                    <Input
                      id="tokenImage"
                      name="tokenImage"
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                    />
                    {selectedImage && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        Selected: {selectedImage.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="totalSupply">Total Supply</Label>
                  <Input
                    id="totalSupply"
                    name="totalSupply"
                    type="number"
                    placeholder="10000000"
                    value={formData.totalSupply}
                    onChange={handleInputChange}
                    className={errors.totalSupply ? 'border-red-500' : ''}
                    required
                  />
                  {errors.totalSupply && (
                    <p className="text-sm text-red-500">{errors.totalSupply}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="solTarget">SOL Target</Label>
                  <Input
                    id="solTarget"
                    name="solTarget"
                    type="number"
                    placeholder="30"
                    value={formData.solTarget}
                    onChange={handleInputChange}
                    className={errors.solTarget ? 'border-red-500' : ''}
                    required
                  />
                  {errors.solTarget && (
                    <p className="text-sm text-red-500">{errors.solTarget}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellPercentage">Sell Percentage</Label>
                  <Input
                    id="sellPercentage"
                    name="sellPercentage"
                    type="number"
                    placeholder="50"
                    min="20"
                    max="80"
                    value={formData.sellPercentage}
                    onChange={handleInputChange}
                    className={errors.sellPercentage ? 'border-red-500' : ''}
                    required
                  />
                  {errors.sellPercentage && (
                    <p className="text-sm text-red-500">{errors.sellPercentage}</p>
                  )}
                </div>

                <Button type="submit" className="w-full">
                  Launch Token
                </Button>
              </form>
            </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default LaunchToken;