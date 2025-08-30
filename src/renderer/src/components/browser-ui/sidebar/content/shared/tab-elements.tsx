import { Button } from "@/components/ui/button";
import { cn, craftActiveFaviconURL } from "@/lib/utils";
import { Volume2, VolumeX } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

export type TabFaviconProps = {
  tabId: number;
  faviconURL: string | null;
  title: string;
  onClick?: () => void;
  onMouseDown?: (e: React.MouseEvent) => void;
  onReset?: () => void;
  isIconHovered?: boolean;
  onIconHoverChange?: (isHovered: boolean) => void;
};

export function TabFavicon({
  tabId,
  faviconURL,
  title,
  onClick,
  onMouseDown,
  onReset,
  onIconHoverChange
}: TabFaviconProps) {
  const [isError, setIsError] = useState(false);
  const noFavicon = !faviconURL || isError;

  const handleMouseEnter = () => onIconHoverChange && onIconHoverChange(true);
  const handleMouseLeave = () => onIconHoverChange && onIconHoverChange(false);

  const handleClick = (e: React.MouseEvent) => {
    if (onReset) {
      e.preventDefault();
      onReset();
    } else if (onClick) {
      onClick();
    }
  };

  return (
    <div
      className="w-4 h-4 flex-shrink-0 mr-1"
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {!noFavicon && (
        <img
          src={craftActiveFaviconURL(tabId, faviconURL)}
          alt={title}
          className="size-full rounded-sm user-drag-none object-contain overflow-hidden"
          onError={() => setIsError(true)}
          onClick={onClick}
          onMouseDown={onMouseDown}
        />
      )}
      {noFavicon && <div className="size-full bg-gray-300 dark:bg-gray-300/30 rounded-sm" />}
    </div>
  );
}

export type TabAudioIndicatorProps = {
  isPlayingAudio: boolean;
  isMuted: boolean;
  tabId: number;
};

export function TabAudioIndicator({ isPlayingAudio, isMuted, tabId }: TabAudioIndicatorProps) {
  const VolumeIcon = isMuted ? VolumeX : Volume2;

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tabId) return;
    const newMutedState = !isMuted;
    flow.tabs.setTabMuted(tabId, newMutedState);
  };

  return (
    <AnimatePresence initial={false}>
      {(isPlayingAudio || isMuted) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, width: 0 }}
          animate={{ opacity: 1, scale: 1, width: "auto" }}
          exit={{ opacity: 0, scale: 0.8, width: 0, marginLeft: 0, marginRight: 0 }}
          transition={{
            type: "spring",
            stiffness: 500,
            damping: 30
          }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center justify-center overflow-hidden ml-0.5"
        >
          <Button
            variant="ghost"
            size="icon"
            onClick={handleToggleMute}
            className="size-5 bg-transparent rounded-sm hover:bg-black/10 dark:hover:bg-white/10"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <VolumeIcon className={cn("size-4", "text-muted-foreground/60 dark:text-white/50")} />
          </Button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export type TabActionButtonProps = {
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
};

export function TabActionButton({ icon, onClick }: TabActionButtonProps) {
  return (
    <motion.div whileTap={{ scale: 0.95 }} className="flex items-center justify-center">
      <Button
        variant="ghost"
        size="icon"
        onClick={onClick}
        className="size-5 bg-transparent rounded-sm hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
        onMouseDown={(event) => event.stopPropagation()}
      >
        {icon}
      </Button>
    </motion.div>
  );
}
