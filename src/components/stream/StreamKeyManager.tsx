
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Monitor, Copy, RefreshCw, Plus, Loader2, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StreamKeyManagerProps {
  streamData: any;
  isGeneratingKeys: boolean;
  onGenerateNewKeys: () => void;
  onCopyToClipboard: (text: string, label: string) => void;
  streamStatus: string;
  streamAge?: string;
}

const StreamKeyManager: React.FC<StreamKeyManagerProps> = ({
  streamData,
  isGeneratingKeys,
  onGenerateNewKeys,
  onCopyToClipboard,
  streamStatus,
  streamAge
}) => {
  const navigate = useNavigate();
  const isStreamEnded = streamStatus === 'ended';

  return (
    <Card className={`${isStreamEnded ? 'bg-red-500/10 border-red-500/30' : 'bg-green-500/10 border-green-500/30'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            OBS Configuration
            {isStreamEnded && <AlertTriangle className="h-4 w-4 text-red-400 ml-2" />}
          </CardTitle>
          <div className="flex items-center gap-2">
            {streamAge && (
              <span className="text-white/50 text-xs">Created {streamAge}</span>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/create/stream')}
              className="text-green-400 hover:bg-green-500/20"
            >
              <Plus className="h-4 w-4 mr-1" />
              New Stream
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isStreamEnded && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-3 mb-4">
            <p className="text-red-400 text-sm font-medium mb-1">Stream Ended</p>
            <p className="text-white/70 text-sm">
              This stream has permanently ended. Stream keys are no longer valid.
            </p>
          </div>
        )}

        <div>
          <label className="text-sm font-medium text-white mb-2 block">RTMP URL</label>
          <div className="flex items-center gap-2">
            <Input
              value={streamData.rtmp_url}
              readOnly
              className={`font-mono text-sm ${isStreamEnded ? 'opacity-50' : ''}`}
              disabled={isStreamEnded}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCopyToClipboard(streamData.rtmp_url, 'RTMP URL')}
              disabled={isStreamEnded}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-white mb-2 block">Stream Key</label>
          <div className="flex items-center gap-2">
            <Input
              value={streamData.stream_key}
              readOnly
              className={`font-mono text-sm ${isStreamEnded ? 'opacity-50' : ''}`}
              type="password"
              disabled={isStreamEnded}
            />
            <Button
              size="sm"
              variant="outline"
              onClick={() => onCopyToClipboard(streamData.stream_key, 'Stream Key')}
              disabled={isStreamEnded}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={onGenerateNewKeys}
            variant="outline"
            disabled={isGeneratingKeys || streamStatus === 'active' || isStreamEnded}
            className={`text-primary border-primary/50 hover:bg-primary/10 flex-1 ${
              isStreamEnded ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isGeneratingKeys ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Fresh Keys...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {isStreamEnded ? 'Keys Unavailable' : 'Generate Fresh Keys'}
              </>
            )}
          </Button>
        </div>

        {!isStreamEnded && (
          <>
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
              <h4 className="font-semibold text-blue-400 mb-2">Quick Setup:</h4>
              <ol className="text-sm text-white/80 space-y-1 list-decimal list-inside">
                <li>Copy the RTMP URL and Stream Key above</li>
                <li>Open OBS Studio → Settings → Stream</li>
                <li>Set Service to "Custom..." and paste the URL/Key</li>
                <li>Click "Start Streaming" in OBS</li>
                <li>Your stream will appear in the preview →</li>
              </ol>
            </div>

            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
              <p className="text-yellow-400 text-sm font-medium mb-1">💡 Pro Tip:</p>
              <p className="text-white/70 text-sm">
                Use "Generate Fresh Keys" to create new RTMP credentials while keeping your stream settings. 
                This is useful if you suspect your keys have been compromised or want a clean start.
              </p>
            </div>
          </>
        )}

        {isStreamEnded && (
          <div className="bg-gray-500/10 border border-gray-500/30 rounded-lg p-3">
            <p className="text-gray-400 text-sm font-medium mb-1">ℹ️ Notice:</p>
            <p className="text-white/70 text-sm">
              Once a stream ends, it cannot be restarted. Create a new stream to broadcast again with fresh RTMP credentials.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StreamKeyManager;
