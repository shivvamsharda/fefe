import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced custom layout template with LiveKit Web SDK integration
const customLayoutTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://unpkg.com/livekit-client@2.13.3/dist/livekit-client.umd.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      background: #000000;
      color: #ffffff;
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      overflow: hidden;
      width: 100vw;
      height: 100vh;
    }
    
    .meeting-container {
      width: 100%;
      height: 100%;
      background: linear-gradient(135deg, #000000 0%, #0a0a0a 100%);
      display: flex;
      flex-direction: column;
      padding: 24px;
    }
    
    .meeting-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      padding: 16px 24px;
      background: rgba(16, 16, 16, 0.8);
      backdrop-filter: blur(24px);
      border: 1px solid rgba(51, 51, 51, 0.5);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 255, 163, 0.1);
    }
    
    .meeting-title {
      font-size: 24px;
      font-weight: 700;
      color: #ffffff;
    }
    
    .live-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: rgba(239, 68, 68, 0.9);
      color: white;
      font-size: 12px;
      font-weight: 700;
      padding: 8px 16px;
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(239, 68, 68, 0.3);
      animation: live-pulse 2s infinite;
    }
    
    .live-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: white;
      animation: pulse 1s infinite;
    }
    
    @keyframes live-pulse {
      0%, 100% {
        opacity: 1;
        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
      }
      50% {
        opacity: 0.8;
        box-shadow: 0 0 0 8px rgba(239, 68, 68, 0);
      }
    }
    
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    
    .participants-grid {
      flex: 1;
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      grid-auto-rows: minmax(240px, 1fr);
      gap: 24px;
      align-content: center;
      justify-content: center;
    }
    
    .participant-tile {
      position: relative;
      aspect-ratio: 16/9;
      overflow: hidden;
      background: rgba(16, 16, 16, 0.8);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(51, 51, 51, 0.5);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
      transition: all 0.3s ease;
    }
    
    .participant-tile:hover {
      transform: scale(1.02);
      box-shadow: 0 12px 40px rgba(0, 255, 163, 0.15);
      border-color: rgba(0, 255, 163, 0.3);
    }
    
    .participant-tile.speaking {
      border-color: rgba(0, 255, 163, 0.6);
      box-shadow: 0 0 20px rgba(0, 255, 163, 0.4);
      animation: speaking-glow 1s ease-in-out infinite alternate;
    }
    
    @keyframes speaking-glow {
      from { box-shadow: 0 0 20px rgba(0, 255, 163, 0.4); }
      to { box-shadow: 0 0 30px rgba(0, 255, 163, 0.8); }
    }
    
    .participant-video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      border-radius: 16px;
    }
    
    .participant-overlay {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 16px;
      background: linear-gradient(transparent, rgba(0, 0, 0, 0.8));
      border-radius: 0 0 16px 16px;
    }
    
    .participant-name {
      background: rgba(0, 0, 0, 0.95);
      backdrop-filter: blur(12px);
      color: #ffffff;
      padding: 8px 12px;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      border: 1px solid rgba(51, 51, 51, 0.3);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
      max-width: 100%;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .host-badge {
      position: absolute;
      top: 12px;
      left: 12px;
      background: rgba(0, 255, 163, 0.9);
      color: #000000;
      padding: 6px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 4px;
      backdrop-filter: blur(12px);
      box-shadow: 0 4px 16px rgba(0, 255, 163, 0.3);
    }
    
    .crown-icon {
      width: 12px;
      height: 12px;
      fill: currentColor;
    }
    
    .status-indicators {
      position: absolute;
      top: 12px;
      right: 12px;
      display: flex;
      gap: 8px;
    }
    
    .status-indicator {
      background: rgba(33, 33, 33, 0.9);
      color: #ffffff;
      padding: 6px;
      border-radius: 8px;
      backdrop-filter: blur(12px);
      border: 1px solid rgba(51, 51, 51, 0.3);
    }
    
    .status-indicator.muted {
      background: rgba(239, 68, 68, 0.9);
    }
    
    .status-indicator.good-connection {
      background: rgba(0, 255, 163, 0.2);
      color: #00ffa3;
    }
    
    .mic-icon, .connection-icon {
      width: 14px;
      height: 14px;
      fill: currentColor;
    }
    
    .empty-state {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      height: 100%;
      text-align: center;
      color: rgba(255, 255, 255, 0.6);
    }
    
    .empty-icon {
      width: 64px;
      height: 64px;
      margin-bottom: 24px;
      opacity: 0.6;
      fill: currentColor;
    }
    
    .empty-title {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #ffffff;
    }
    
    .empty-description {
      font-size: 16px;
      opacity: 0.7;
    }
  </style>
</head>
<body>
  <div class="meeting-container">
    <div class="meeting-header">
      <div class="meeting-title" id="room-title">Meeting Room</div>
      <div class="live-badge">
        <div class="live-dot"></div>
        LIVE
      </div>
    </div>
    
    <div class="participants-grid" id="participantsGrid">
      <div class="empty-state" id="emptyState">
        <svg class="empty-icon" viewBox="0 0 24 24">
          <path d="M16 4C18.2 4 20 5.8 20 8V16C20 18.2 18.2 20 16 20H8C5.8 20 4 18.2 4 16V8C4 5.8 5.8 4 8 4H16ZM16 6H8C6.9 6 6 6.9 6 8V16C6 17.1 6.9 18 8 18H16C17.1 18 18 17.1 18 16V8C18 6.9 17.1 6 16 6ZM12 7L13.5 10L17 10.75L14.5 13.14L15.21 16.64L12 15.19L8.79 16.64L9.5 13.14L7 10.75L10.5 10L12 7Z"/>
        </svg>
        <div class="empty-title">Meeting in Progress</div>
        <div class="empty-description">Participants will appear here when they join</div>
      </div>
    </div>
  </div>
  
  <script>
    console.log('LiveKit custom layout starting...');
    
    let room = null;
    let participantElements = new Map();
    
    // Get room and token from URL parameters (passed by LiveKit)
    const urlParams = new URLSearchParams(window.location.search);
    const roomName = urlParams.get('room') || window.ROOM_NAME || 'default-room';
    const token = urlParams.get('token') || window.TOKEN;
    
    console.log('Room name:', roomName);
    
    // Update room title
    document.getElementById('room-title').textContent = roomName || 'Meeting Room';
    
    function createParticipantTile(participant) {
      console.log('Creating tile for participant:', participant.identity);
      
      const tile = document.createElement('div');
      tile.className = 'participant-tile';
      tile.id = \`participant-\${participant.identity}\`;
      
      // Create video element
      const video = document.createElement('video');
      video.className = 'participant-video';
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true; // Always muted for egress
      
      // Create overlay
      const overlay = document.createElement('div');
      overlay.className = 'participant-overlay';
      
      // Create name display
      const nameEl = document.createElement('div');
      nameEl.className = 'participant-name';
      nameEl.textContent = participant.name || participant.identity || 'Anonymous';
      
      // Check if participant is host (from metadata)
      const metadata = participant.metadata ? JSON.parse(participant.metadata || '{}') : {};
      const isHost = metadata.role === 'host' || metadata.isHost === true;
      
      // Create host badge if needed
      if (isHost) {
        const hostBadge = document.createElement('div');
        hostBadge.className = 'host-badge';
        hostBadge.innerHTML = \`
          <svg class="crown-icon" viewBox="0 0 24 24">
            <path d="M5 16L3 5L8.5 12L12 4L15.5 12L21 5L19 16H5Z"/>
          </svg>
          HOST
        \`;
        tile.appendChild(hostBadge);
      }
      
      // Create status indicators
      const statusIndicators = document.createElement('div');
      statusIndicators.className = 'status-indicators';
      
      // Mic indicator
      const micIndicator = document.createElement('div');
      micIndicator.className = 'status-indicator';
      micIndicator.id = \`mic-\${participant.identity}\`;
      
      // Connection indicator
      const connectionIndicator = document.createElement('div');
      connectionIndicator.className = 'status-indicator good-connection';
      connectionIndicator.innerHTML = \`
        <svg class="connection-icon" viewBox="0 0 24 24">
          <path d="M2 17H22V19H2V17ZM1.15 12.65L4.85 16.35L6.26 14.94L3.85 12.53L6.26 10.12L4.85 8.71L1.15 12.41L1.15 12.65ZM22.85 12.65L19.15 8.95L17.74 10.36L20.15 12.77L17.74 15.18L19.15 16.59L22.85 12.89L22.85 12.65Z"/>
        </svg>
      \`;
      
      statusIndicators.appendChild(micIndicator);
      statusIndicators.appendChild(connectionIndicator);
      
      overlay.appendChild(nameEl);
      tile.appendChild(video);
      tile.appendChild(overlay);
      tile.appendChild(statusIndicators);
      
      // Update mic status
      updateMicStatus(participant);
      
      return tile;
    }
    
    function updateMicStatus(participant) {
      const micIndicator = document.getElementById(\`mic-\${participant.identity}\`);
      if (!micIndicator) return;
      
      const hasAudio = participant.audioTrackPublications.size > 0;
      const audioEnabled = hasAudio && Array.from(participant.audioTrackPublications.values()).some(pub => !pub.isMuted);
      
      micIndicator.className = audioEnabled ? 'status-indicator' : 'status-indicator muted';
      micIndicator.innerHTML = audioEnabled ? \`
        <svg class="mic-icon" viewBox="0 0 24 24">
          <path d="M12 2C13.1 2 14 2.9 14 4V10C14 11.1 13.1 12 12 12C10.9 12 10 11.1 10 10V4C10 2.9 10.9 2 12 2ZM19 10V12C19 15.3 16.3 18 13 18V22H11V18C7.7 18 5 15.3 5 12V10H7V12C7 14.2 8.8 16 11 16H13C15.2 16 17 14.2 17 12V10H19Z"/>
        </svg>
      \` : \`
        <svg class="mic-icon" viewBox="0 0 24 24">
          <path d="M16 8V12C16 13.11 15.11 14 14 14H10C8.89 14 8 13.11 8 12V8M8 8V6C8 4.89 8.89 4 10 4H14C15.11 4 16 4.89 16 6V8M8 8L6 10M16 8L18 10M12 14V18M8 22H16"/>
        </svg>
      \`;
    }
    
    function attachVideoTrack(participant, track) {
      const tile = document.getElementById(\`participant-\${participant.identity}\`);
      if (!tile) return;
      
      const video = tile.querySelector('video');
      if (video && track.kind === 'video') {
        console.log('Attaching video track for:', participant.identity);
        track.attach(video);
      }
    }
    
    function handleParticipantConnected(participant) {
      console.log('Participant connected:', participant.identity);
      
      // Skip egress participant
      if (participant.identity.toLowerCase().includes('egress')) {
        console.log('Skipping egress participant');
        return;
      }
      
      const participantsGrid = document.getElementById('participantsGrid');
      const emptyState = document.getElementById('emptyState');
      
      // Hide empty state
      if (emptyState) {
        emptyState.style.display = 'none';
      }
      
      // Create participant tile
      const tile = createParticipantTile(participant);
      participantElements.set(participant.identity, tile);
      participantsGrid.appendChild(tile);
      
      // Handle existing tracks
      participant.videoTrackPublications.forEach((publication) => {
        if (publication.track) {
          attachVideoTrack(participant, publication.track);
        }
      });
      
      // Listen for track events
      participant.on('trackSubscribed', (track, publication) => {
        console.log('Track subscribed:', track.kind, participant.identity);
        if (track.kind === 'video') {
          attachVideoTrack(participant, track);
        }
      });
      
      participant.on('trackMuted', () => {
        updateMicStatus(participant);
      });
      
      participant.on('trackUnmuted', () => {
        updateMicStatus(participant);
      });
      
      participant.on('isSpeakingChanged', (speaking) => {
        const tile = document.getElementById(\`participant-\${participant.identity}\`);
        if (tile) {
          if (speaking) {
            tile.classList.add('speaking');
          } else {
            tile.classList.remove('speaking');
          }
        }
      });
    }
    
    function handleParticipantDisconnected(participant) {
      console.log('Participant disconnected:', participant.identity);
      
      const tile = participantElements.get(participant.identity);
      if (tile && tile.parentNode) {
        tile.parentNode.removeChild(tile);
        participantElements.delete(participant.identity);
      }
      
      // Show empty state if no participants
      if (participantElements.size === 0) {
        const emptyState = document.getElementById('emptyState');
        if (emptyState) {
          emptyState.style.display = 'flex';
        }
      }
    }
    
    async function connectToRoom() {
      try {
        console.log('Connecting to LiveKit room...');
        
        if (!window.LiveKitClient) {
          console.error('LiveKit client not loaded');
          return;
        }
        
        room = new window.LiveKitClient.Room({
          adaptiveStream: true,
          dynacast: true,
        });
        
        // Set up event listeners
        room.on('participantConnected', handleParticipantConnected);
        room.on('participantDisconnected', handleParticipantDisconnected);
        
        room.on('connected', () => {
          console.log('Connected to room successfully');
          
          // Handle existing participants
          room.remoteParticipants.forEach(handleParticipantConnected);
        });
        
        room.on('disconnected', (reason) => {
          console.log('Disconnected from room:', reason);
        });
        
        // Connect with egress token or use a viewer token
        const wsUrl = 'wss://wenlivefun-pubw3uyl.livekit.cloud';
        
        // For egress, we don't need a token - LiveKit handles this internally
        await room.connect(wsUrl, token || '');
        
      } catch (error) {
        console.error('Failed to connect to room:', error);
      }
    }
    
    // Initialize when page loads
    document.addEventListener('DOMContentLoaded', () => {
      console.log('Page loaded, initializing LiveKit connection...');
      
      // Small delay to ensure LiveKit client is fully loaded
      setTimeout(() => {
        connectToRoom();
      }, 1000);
    });
    
    // Handle page unload
    window.addEventListener('beforeunload', () => {
      if (room) {
        room.disconnect();
      }
    });
  </script>
</body>
</html>`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { streamId, roomName, muxStreamKey } = await req.json();
    
    console.log('=== STARTING LIVEKIT EGRESS WITH ENHANCED LAYOUT ===');
    console.log('Stream ID:', streamId);
    console.log('Room Name:', roomName);
    console.log('Mux Stream Key:', muxStreamKey ? `${muxStreamKey.substring(0, 8)}...` : 'MISSING');
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const livekitUrl = Deno.env.get('LIVEKIT_URL')!;
    const livekitApiKey = Deno.env.get('LIVEKIT_API_KEY')!;
    const livekitApiSecret = Deno.env.get('LIVEKIT_API_SECRET')!;
    
    if (!supabaseUrl || !supabaseServiceKey || !livekitUrl || !livekitApiKey || !livekitApiSecret) {
      return new Response(JSON.stringify({ 
        error: 'Missing required environment variables' 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (!streamId || !roomName || !muxStreamKey) {
      return new Response(JSON.stringify({ 
        error: 'Missing required parameters: streamId, roomName, and muxStreamKey' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Configure egress to send to Mux RTMP endpoint
    const muxRtmpUrl = `rtmp://live.mux.com/app/${muxStreamKey}`;
    console.log('Mux RTMP URL:', `rtmp://live.mux.com/app/${muxStreamKey.substring(0, 8)}...`);
    
    // Create the egress request payload for room composite egress with enhanced layout
    const egressRequest = {
      room_name: roomName,
      layout: "custom",
      custom: {
        base_url: "data:text/html;base64," + btoa(customLayoutTemplate),
        width: 1920,
        height: 1080
      },
      audio_only: false,
      video_only: false,
      stream: {
        protocol: "rtmp",
        urls: [muxRtmpUrl]
      }
    };
    
    console.log('Starting LiveKit egress with enhanced dynamic layout...');
    
    // Generate JWT token for LiveKit API
    const now = Math.floor(Date.now() / 1000);
    
    // Create header
    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };
    
    // Create payload with minimal required permissions
    const payload = {
      iss: livekitApiKey,
      exp: now + 3600, // 1 hour expiry
      nbf: now,
      sub: livekitApiKey,
      room: roomName,
      video: {
        roomRecord: true,
        roomAdmin: true
      }
    };
    
    // Base64url encode (URL-safe base64 without padding)
    const base64UrlEncode = (obj: any) => {
      const jsonStr = JSON.stringify(obj);
      const base64 = btoa(jsonStr);
      return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    };
    
    const headerEncoded = base64UrlEncode(header);
    const payloadEncoded = base64UrlEncode(payload);
    
    // Create signature
    const encoder = new TextEncoder();
    const keyData = encoder.encode(livekitApiSecret);
    const messageData = encoder.encode(`${headerEncoded}.${payloadEncoded}`);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureArray = new Uint8Array(signature);
    const signatureBase64 = btoa(String.fromCharCode(...signatureArray))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
    
    const token = `${headerEncoded}.${payloadEncoded}.${signatureBase64}`;
    
    console.log('Generated JWT token for LiveKit API');
    
    // Call LiveKit Cloud API
    const livekitApiUrl = livekitUrl.replace('wss://', 'https://').replace('ws://', 'http://');
    const egressEndpoint = `${livekitApiUrl}/twirp/livekit.Egress/StartRoomCompositeEgress`;
    
    console.log('Calling LiveKit Cloud API with enhanced dynamic layout...');
    
    const livekitResponse = await fetch(egressEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(egressRequest)
    });
    
    const responseText = await livekitResponse.text();
    console.log('LiveKit API Response:', responseText);
    
    if (!livekitResponse.ok) {
      console.error('LiveKit API error:', responseText);
      return new Response(JSON.stringify({ 
        error: `LiveKit API failed: ${responseText}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    const egressInfo = JSON.parse(responseText);
    console.log('Enhanced dynamic layout egress started successfully:', egressInfo.egressId);
    
    // Update stream with egress ID
    const { error: updateError } = await supabase
      .from('streams')
      .update({ livekit_egress_id: egressInfo.egressId })
      .eq('id', streamId);
      
    if (updateError) {
      console.error('Error updating stream with egress ID:', updateError);
      return new Response(JSON.stringify({ 
        error: `Failed to update stream: ${updateError.message}` 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    console.log('=== ENHANCED DYNAMIC LAYOUT EGRESS SETUP COMPLETE ===');
    
    return new Response(JSON.stringify({
      success: true,
      egressId: egressInfo.egressId,
      message: 'LiveKit egress with enhanced dynamic layout started successfully'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
    
  } catch (error) {
    console.error('Error in start-livekit-egress:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
