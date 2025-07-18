
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import SpaceV2Room from '../components/spaceV2/SpaceV2Room';
import { getSpaceV2 } from '@/services/spacesV2Service';
import { useWallet } from '@/context/WalletContext';
import Layout from '../components/layout/Layout';

const SpaceV2RoomPage = () => {
  const { roomName } = useParams<{ roomName: string }>();
  const { hasWalletCapability, effectiveWalletAddress } = useWallet();
  const [mode, setMode] = useState<'host' | 'participant' | 'viewer'>('participant');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const determineSpaceMode = async () => {
      if (!roomName) {
        setIsLoading(false);
        return;
      }

      try {
        const space = await getSpaceV2(roomName);
        if (space) {
          if (hasWalletCapability && effectiveWalletAddress && space.host_wallet === effectiveWalletAddress) {
            setMode('host');
          } else {
            setMode('participant');
          }
        }
      } catch (error) {
        console.error('Error determining space mode:', error);
        setMode('participant');
      } finally {
        setIsLoading(false);
      }
    };

    determineSpaceMode();
  }, [roomName, hasWalletCapability, effectiveWalletAddress]);

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">
              Loading space...
            </h2>
          </div>
        </div>
      </Layout>
    );
  }

  return <SpaceV2Room mode={mode} />;
};

export default SpaceV2RoomPage;
