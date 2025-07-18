
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft, Clipboard, Copy, RefreshCw, AlertOctagon, CheckCircle, PowerOff } from 'lucide-react';
import { Link } from 'react-router-dom';

const TestOBSStreamingStudio = () => {
  // State variables - all isolated for testing
  const [isLive, setIsLive] = useState(false);
  const [checkingStream, setCheckingStream] = useState(false);
  const [endingStream, setEndingStream] = useState(false);
  const [showPlayer, setShowPlayer] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [streamTerminated, setStreamTerminated] = useState(false);

  // Mock stream data for Cloudflare testing
  const mockStreamData = {
    id: 'cloudflare-test-stream-123',
    title: 'Cloudflare Test Stream',
    stream_key: 'cf-test-stream-key-abc123',
    playback_id: 'cf-test-playback-id-xyz789',
    status: 'idle'
  };

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  };

  // Cloudflare Stream RTMP URL - Replace with your actual Cloudflare endpoint
  const rtmpUrl = "rtmps://live.cloudflarestream.com/live/YOUR_STREAM_KEY";
  
  // Mock check and update stream status for Cloudflare testing
  const checkAndUpdateStreamStatus = async () => {
    if (streamTerminated) return;
    
    setCheckingStream(true);
    setUpdateSuccess(false);
    
    try {
      console.log(`[CLOUDFLARE TEST] Checking stream status for test stream`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock successful activation
      console.log("[CLOUDFLARE TEST] Stream status updated successfully to active");
      setIsLive(true);
      setUpdateSuccess(true);
      setShowPlayer(true);
      setFailedAttempts(0);
      
      toast.success("Cloudflare test stream activated!", { 
        description: "Your test stream is now simulated as live" 
      });
      
      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (error) {
      console.error("[CLOUDFLARE TEST] Error checking stream status:", error);
      setFailedAttempts(prev => prev + 1);
      toast.error("Cloudflare test stream connection failed");
    } finally {
      setCheckingStream(false);
    }
  };
  
  // Mock end stream function
  const handleEndStream = async () => {
    setEndingStream(true);
    try {
      console.log(`[CLOUDFLARE TEST] Ending test stream`);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setStreamTerminated(true);
      setIsLive(false);
      setShowPlayer(false);
      setFailedAttempts(0);
      
      toast.success("Cloudflare Test Stream Ended", {
        description: "Your test stream has been terminated."
      });
      
      setTimeout(() => {
        toast.info("Cloudflare test complete", {
          description: "Ready for your next experiment."
        });
      }, 2000);
    } catch (error) {
      console.error("[CLOUDFLARE TEST] Error ending stream:", error);
      toast.error("Error Ending Cloudflare Test Stream");
    } finally {
      setEndingStream(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      {/* Back button - DISABLED for testing */}
      <div className="py-4">
        <div className="flex items-center text-white/40 cursor-not-allowed">
          <ArrowLeft className="mr-2" size={16} />
          <span>Back to Stream Setup (Disabled in Test Mode)</span>
        </div>
      </div>

      {/* Test Banner */}
      <div className="mb-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold text-blue-500">CLOUDFLARE TEST MODE</h2>
        </div>
        <p className="text-blue-500/90 mt-1">
          Isolated test environment for Cloudflare Stream experiments. No production connections.
        </p>
      </div>

      {/* Main content */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Left sidebar - Stream Info */}
        <Card className="bg-black/40 border-white/10 md:col-span-1">
          <CardHeader>
            <CardTitle>Cloudflare Stream Test Setup</CardTitle>
            <CardDescription>Test configuration for Cloudflare Stream service</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-white/70">Stream Name</label>
              <p className="font-medium">{mockStreamData.title}</p>
            </div>
            
            {!streamTerminated && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm text-white/70">Cloudflare Stream Key</label>
                  <div className="flex">
                    <Input
                      value={mockStreamData.stream_key}
                      readOnly
                      type="password"
                      className="bg-black/40 border-white/10 rounded-r-none"
                    />
                    <Button 
                      variant="secondary" 
                      className="rounded-l-none"
                      onClick={() => copyToClipboard(mockStreamData.stream_key)}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm text-white/70">Cloudflare RTMP URL</label>
                  <div className="flex">
                    <Input
                      value={rtmpUrl}
                      readOnly
                      className="bg-black/40 border-white/10 rounded-r-none"
                    />
                    <Button 
                      variant="secondary" 
                      className="rounded-l-none"
                      onClick={() => copyToClipboard(rtmpUrl)}
                    >
                      <Copy size={16} />
                    </Button>
                  </div>
                </div>
                
                <div className={`p-3 rounded-md border ${isLive ? 'bg-green-950/30 border-green-500/20' : 'bg-black/60 border-blue-500/10'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <div className={`text-sm font-medium ${isLive ? 'text-green-400' : 'text-white/70'}`}>
                      {isLive ? (
                        <span className="flex items-center">
                          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                          Cloudflare Test Status: LIVE
                        </span>
                      ) : (
                        'Cloudflare Test Status: Offline'
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-white/50 mb-3">
                    {isLive 
                      ? 'Your Cloudflare test stream is simulated as active.' 
                      : 'Click "Test Go Live" to simulate Cloudflare stream activation.'}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={updateSuccess ? "default" : "default"}
                      className={`flex-1 ${
                        updateSuccess 
                          ? 'bg-green-600 hover:bg-green-700 text-white' 
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                      onClick={checkAndUpdateStreamStatus}
                      disabled={checkingStream || endingStream || updateSuccess || streamTerminated}
                    >
                      {updateSuccess ? (
                        <CheckCircle size={16} className="mr-1.5" />
                      ) : (
                        <RefreshCw size={16} className={`mr-1.5 ${checkingStream ? 'animate-spin' : ''}`} />
                      )}
                      {updateSuccess ? 'CF Test Active' : 'CF Test Go Live'}
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      className="flex-1 bg-red-700 hover:bg-red-800 text-white"
                      onClick={handleEndStream}
                      disabled={endingStream || checkingStream || streamTerminated}
                    >
                      <PowerOff size={16} className={`mr-1.5 ${endingStream ? 'animate-spin' : ''}`} />
                      End CF Test
                    </Button>
                  </div>
                </div>
                
                <div className="p-3 rounded-md bg-black/60 border border-blue-500/10">
                  <div className="text-white/70 text-sm mb-2">Cloudflare Integration Steps:</div>
                  <ol className="text-xs text-white/50 list-decimal ml-4 space-y-1">
                    <li>Get your Cloudflare Stream API token</li>
                    <li>Configure RTMP endpoint from Cloudflare dashboard</li>
                    <li>Replace the RTMP URL above with your actual endpoint</li>
                    <li>Test stream key generation</li>
                    <li>Implement Cloudflare player component</li>
                    <li>Add Cloudflare status checking API calls</li>
                  </ol>
                </div>
                
                <div className="p-3 rounded-md border border-orange-500/20 bg-orange-500/5">
                  <div className="text-orange-500 text-sm font-medium mb-1">Cloudflare Development Notes</div>
                  <p className="text-xs text-white/70 mb-2">
                    Replace these mock functions with real Cloudflare API calls:
                  </p>
                  <ul className="text-xs text-white/70 list-disc ml-4 space-y-1">
                    <li>Cloudflare Stream API for stream creation</li>
                    <li>Real-time status checking via Cloudflare webhooks</li>
                    <li>Cloudflare video player integration</li>
                    <li>Authentication with Cloudflare API tokens</li>
                    <li>Error handling for Cloudflare API responses</li>
                  </ul>
                </div>
              </div>
            )}

            {streamTerminated && (
              <div className="p-4 rounded-md bg-blue-950/30 border border-blue-500/30 text-center">
                <h3 className="text-lg font-medium mb-2">Cloudflare Test Completed</h3>
                <p className="text-white/70 mb-4">Test stream simulation has ended.</p>
                <Button 
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Reset Test Environment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Main broadcast area */}
        <div className="md:col-span-2 space-y-4">
          {/* Stream preview card */}
          <Card className="bg-black/40 border-white/10">
            <CardHeader>
              <CardTitle>Cloudflare Stream Preview</CardTitle>
              <CardDescription>
                {isLive 
                  ? "Cloudflare test stream is simulated as live" 
                  : streamTerminated
                    ? "Cloudflare test stream simulation has ended"
                    : "Cloudflare stream preview will appear here when simulated as live"}
              </CardDescription>
            </CardHeader>
            <CardContent className="relative">
              {!streamTerminated && (
                showPlayer && isLive ? (
                  <div className="relative">
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="absolute top-2 right-2 z-10 text-xs bg-black/50 hover:bg-black/70"
                      onClick={() => setShowPlayer(false)}
                    >
                      Hide CF Test Preview
                    </Button>
                    {/* Mock Cloudflare video player */}
                    <div className="aspect-video flex items-center justify-center bg-gradient-to-br from-blue-900/50 to-cyan-900/50 rounded-lg border border-blue-500/20">
                      <div className="text-center">
                        <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-4 mx-auto">
                          <div className="w-8 h-8 bg-blue-500 rounded-full animate-pulse"></div>
                        </div>
                        <h3 className="text-xl font-semibold mb-2">Cloudflare Test Player</h3>
                        <p className="text-white/70 text-sm">Replace this with Cloudflare Stream player component</p>
                        <div className="mt-4 text-xs text-white/50">
                          Simulated CF Stream ID: {mockStreamData.playback_id}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-video flex items-center justify-center bg-black rounded-lg">
                    {isLive ? (
                      <div className="text-center">
                        <div className="animate-pulse w-16 h-16 rounded-full bg-green-900/20 flex items-center justify-center mb-3">
                          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                        </div>
                        <h3 className="text-xl mb-3">Cloudflare Test Stream Active</h3>
                        <p className="text-white/70 mb-4">
                          CF test stream is simulated as live. Click below to show the mock preview.
                        </p>
                        <Button 
                          onClick={() => setShowPlayer(true)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Show CF Test Preview
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <AlertOctagon className="w-16 h-16 mx-auto mb-4 text-blue-500/50" />
                        <p className="text-white/70">
                          Cloudflare Test Stream is Offline
                        </p>
                        <p className="text-xs text-white/50 mt-2">
                          Click "CF Test Go Live" to simulate stream activation.
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}
              
              {streamTerminated && (
                <div className="aspect-video flex items-center justify-center bg-black rounded-lg">
                  <div className="text-center">
                    <AlertOctagon className="w-16 h-16 mx-auto mb-4 text-blue-500/50" />
                    <h3 className="text-xl font-medium mb-2">Cloudflare Test Completed</h3>
                    <p className="text-white/70 mb-4">
                      Cloudflare test stream simulation has ended.
                    </p>
                    <Button 
                      onClick={() => window.location.reload()}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Reset Test Environment
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
            {!isLive && !streamTerminated && (
              <CardFooter>
                <div className="text-sm text-white/70 p-3 bg-black/40 rounded-md border border-white/10 w-full">
                  <p>
                    This is an isolated test environment for Cloudflare Stream experiments:
                  </p>
                  <ol className="list-decimal ml-5 mt-2 space-y-1 text-xs">
                    <li>No production code connections</li>
                    <li>Mock Cloudflare API calls only</li>
                    <li>Safe environment for testing integrations</li>
                    <li>Replace mock functions with real Cloudflare APIs</li>
                    <li>Test thoroughly before implementing in production</li>
                  </ol>
                </div>
              </CardFooter>
            )}
          </Card>
          
          {!streamTerminated && (
            <Card className="bg-black/40 border-white/10">
              <CardHeader>
                <CardTitle>Cloudflare Stream Integration Guide</CardTitle>
                <CardDescription>Steps to integrate Cloudflare Stream service</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <p className="text-white/70">
                    Use this isolated test environment to experiment with Cloudflare Stream before implementing it in production.
                  </p>
                  
                  {/* Integration Steps */}
                  <div className="bg-black/60 p-4 rounded-lg border border-blue-500/20">
                    <h3 className="text-sm font-medium text-blue-500 mb-3">Cloudflare Integration Checklist</h3>
                    <div className="space-y-3 text-sm text-white/70">
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="text-white font-medium">API Authentication:</span> Set up Cloudflare API tokens and account access
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="text-white font-medium">Stream Creation:</span> Implement Cloudflare Stream API calls
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="text-white font-medium">RTMP Configuration:</span> Configure RTMP endpoints from Cloudflare dashboard
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="text-white font-medium">Player Integration:</span> Implement Cloudflare Stream player
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="text-white font-medium">Webhooks:</span> Set up Cloudflare webhooks for real-time status
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div>
                          <span className="text-white font-medium">Error Handling:</span> Implement proper error handling for CF APIs
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Code Structure */}
                  <div className="bg-black/60 p-4 rounded-lg border border-white/10">
                    <h3 className="text-sm font-medium text-white mb-3">Recommended Cloudflare Code Structure</h3>
                    <ul className="list-disc list-inside text-sm space-y-1 text-white/70">
                      <li>Create service file: <code className="text-blue-500">src/services/cloudflareStreamService.ts</code></li>
                      <li>Add CF API tokens to environment variables</li>
                      <li>Create player: <code className="text-blue-500">src/components/stream/CloudflarePlayer.tsx</code></li>
                      <li>Update stream creation flow for CF APIs</li>
                      <li>Add CF webhook handling</li>
                      <li>Test thoroughly in this isolated environment</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default TestOBSStreamingStudio;
