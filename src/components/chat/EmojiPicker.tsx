
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Smile, Search } from 'lucide-react';

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  // Popular and categorized emojis
  const popularEmojis = ['😀', '😂', '🥰', '😍', '🤔', '👍', '❤️', '🔥', '💯', '🎉', '👏', '🙏'];
  
  const emojiCategories = {
    'Smileys & People': [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊',
      '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙', '😋', '😛', '😜', '🤪',
      '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏',
      '😒', '🙄', '😬', '🤥', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢'
    ],
    'Nature & Animals': [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮',
      '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤',
      '🌳', '🌲', '🌴', '🌵', '🌾', '🌿', '🍀', '🍁', '🍂', '🍃', '🌸', '🌺'
    ],
    'Food & Drink': [
      '🍎', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍',
      '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄',
      '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🧈', '🥞', '🧇', '🥓', '🥩', '🍗'
    ],
    'Activities & Objects': [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓',
      '🏸', '🏒', '🏑', '🥍', '🏏', '🪃', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿',
      '🎮', '🕹️', '🎲', '♠️', '♥️', '♦️', '♣️', '🃏', '🀄', '🎴', '🎭', '🖼️'
    ]
  };

  const filteredEmojis = searchTerm
    ? Object.values(emojiCategories)
        .flat()
        .filter(emoji => 
          // Simple emoji name matching - in a real app you'd want emoji names/keywords
          emoji.includes(searchTerm) || 
          popularEmojis.includes(emoji)
        )
    : null;

  const handleEmojiClick = (emoji: string) => {
    onEmojiSelect(emoji);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-10 w-10 p-0 hover:bg-white/10 text-white/70 hover:text-white"
          title="Add emoji"
        >
          <Smile size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0 bg-black/90 border-white/20 backdrop-blur-sm" 
        align="end"
        side="top"
        sideOffset={8}
      >
        <div className="p-3">
          {/* Search */}
          <div className="relative mb-3">
            <Search size={14} className="absolute left-2 top-1/2 transform -translate-y-1/2 text-white/50" />
            <Input
              placeholder="Search emojis..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 bg-white/5 border-white/10 text-white placeholder:text-white/50 h-8 text-sm"
            />
          </div>

          {/* Emoji Grid */}
          <div className="max-h-64 overflow-y-auto">
            {searchTerm ? (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-white/70 mb-2">Search Results</h4>
                <div className="grid grid-cols-8 gap-1">
                  {filteredEmojis?.map((emoji, index) => (
                    <button
                      key={index}
                      onClick={() => handleEmojiClick(emoji)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-lg transition-colors"
                      title={emoji}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Popular */}
                <div>
                  <h4 className="text-xs font-medium text-white/70 mb-2">Popular</h4>
                  <div className="grid grid-cols-8 gap-1">
                    {popularEmojis.map((emoji, index) => (
                      <button
                        key={index}
                        onClick={() => handleEmojiClick(emoji)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-lg transition-colors"
                        title={emoji}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Categories */}
                {Object.entries(emojiCategories).map(([category, emojis]) => (
                  <div key={category}>
                    <h4 className="text-xs font-medium text-white/70 mb-2">{category}</h4>
                    <div className="grid grid-cols-8 gap-1">
                      {emojis.slice(0, 24).map((emoji, index) => (
                        <button
                          key={index}
                          onClick={() => handleEmojiClick(emoji)}
                          className="w-8 h-8 flex items-center justify-center hover:bg-white/10 rounded text-lg transition-colors"
                          title={emoji}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
