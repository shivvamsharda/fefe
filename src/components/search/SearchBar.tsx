
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/input';
import { User, Play, Video, Loader2 } from 'lucide-react';
import { useSearch } from '@/hooks/useSearch';
import { cn } from '@/lib/utils';

interface SearchBarProps {
  onClose?: () => void;
  className?: string;
}

const SearchBar = ({ onClose, className }: SearchBarProps) => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { results, isLoading } = useSearch(query);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setIsOpen(value.trim().length >= 2);
  };

  const handleResultClick = (type: 'creator' | 'stream' | 'vod', id: string, userUuid?: string) => {
    setQuery('');
    setIsOpen(false);
    onClose?.();

    switch (type) {
      case 'creator':
        if (userUuid) {
          navigate(`/creator/${userUuid}`);
        }
        break;
      case 'stream':
        navigate(`/stream/${id}`);
        break;
      case 'vod':
        navigate(`/vod/${id}`);
        break;
    }
  };

  const hasResults = results.creators.length > 0 || results.liveStreams.length > 0 || results.vods.length > 0;

  return (
    <div ref={searchRef} className={cn("relative", className)}>
      <div className="relative">
        <Input
          type="text"
          placeholder="Search creators, live streams, VODs..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.trim().length >= 2 && setIsOpen(true)}
          className="pr-8"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && query.trim().length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-96 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
              Searching...
            </div>
          ) : hasResults ? (
            <div className="py-2">
              {/* Creators */}
              {results.creators.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
                    Creators
                  </div>
                  {results.creators.map((creator) => (
                    <button
                      key={creator.id}
                      onClick={() => handleResultClick('creator', creator.id, creator.user_id_uuid)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left"
                    >
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{creator.display_name}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Live Streams */}
              {results.liveStreams.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
                    Live Streams
                  </div>
                  {results.liveStreams.map((stream) => (
                    <button
                      key={stream.id}
                      onClick={() => handleResultClick('stream', stream.id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left"
                    >
                      <Play className="h-4 w-4 text-red-500" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{stream.title}</div>
                        <div className="text-xs text-muted-foreground">Live</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* VODs */}
              {results.vods.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-semibold text-muted-foreground border-b">
                    VODs
                  </div>
                  {results.vods.map((vod) => (
                    <button
                      key={vod.id}
                      onClick={() => handleResultClick('vod', vod.mux_playback_id)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-accent text-left"
                    >
                      <Video className="h-4 w-4 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{vod.title}</div>
                        <div className="text-xs text-muted-foreground">VOD</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground">
              No results found for "{query}"
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;
