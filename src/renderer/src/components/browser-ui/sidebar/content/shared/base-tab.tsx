import { Button } from "@/components/ui/button";
import { SidebarMenuButton, useSidebar } from "@/components/ui/resizable-sidebar";
import { cn, craftActiveFaviconURL } from "@/lib/utils";
import { Minus, Volume2, VolumeX, XIcon } from "lucide-react";
import { useEffect, useState, forwardRef, ForwardedRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TabData } from "~/types/tabs";

const MotionSidebarMenuButton = motion(SidebarMenuButton);

export type BaseTabProps = {
  tab: TabData;
  isFocused: boolean;
  onTabClick?: () => void;
  onCloseTab?: (e: React.MouseEvent) => void;
  onResetTab?: (e: React.MouseEvent) => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  renderRightSide?: (isHovered: boolean) => React.ReactNode;
  renderLeftSide?: () => React.ReactNode;
  children?: React.ReactNode;
};

export const BaseTab = forwardRef(function BaseTab(
  {
    tab,
    isFocused,
    onTabClick,
    onCloseTab,
    onResetTab,
    onContextMenu,
    renderRightSide,
    renderLeftSide,
    children
  }: BaseTabProps,
  ref: ForwardedRef<HTMLButtonElement>
) {
  const [cachedFaviconUrl, setCachedFaviconUrl] = useState<string | null>(tab.faviconURL);
  const [isError, setIsError] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const noFavicon = !cachedFaviconUrl || isError;

  const isMuted = tab.muted;
  const isPlayingAudio = tab.audible;
  const isPinned = !!tab.isPinned;

  const { open } = useSidebar();

  useEffect(() => {
    if (tab.faviconURL) {
      setCachedFaviconUrl(tab.faviconURL);
    } else {
      setCachedFaviconUrl(null);
    }
    // Reset error state when favicon url changes
    setIsError(false);
  }, [tab.faviconURL]);

  const handleClick = () => {
    if (!tab.id) return;
    if (onTabClick) {
      onTabClick();
    } else {
      flow.tabs.switchToTab(tab.id);
    }
  };

  const handleCloseTab = (e: React.MouseEvent) => {
    if (!tab.id) return;
    e.preventDefault();
    if (onCloseTab) {
      onCloseTab(e);
    } else {
      flow.tabs.closeTab(tab.id);
    }
  };

  const handleResetTab = (e: React.MouseEvent) => {
    if (!tab.id) return;
    e.preventDefault();
    if (onResetTab) {
      onResetTab(e);
    } else if (tab.pinnedUrl) {
      flow.navigation.goTo(tab.pinnedUrl, tab.id);
    } else {
      flow.navigation.reloadTab(tab.id);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    // Left mouse button
    if (e.button === 0) {
      handleClick();
    }
    // Middle mouse button
    if (e.button === 1) {
      handleCloseTab(e);
    }

    setIsPressed(true);
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tab.id) return;
    const newMutedState = !tab.muted;
    flow.tabs.setTabMuted(tab.id, newMutedState);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (onContextMenu) {
      onContextMenu(e);
    } else if (tab.id) {
      flow.tabs.showContextMenu(tab.id);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => {
      setIsPressed(false);
    };
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const VolumeIcon = isMuted ? VolumeX : Volume2;

  return (
    <MotionSidebarMenuButton
      ref={ref}
      key={tab.id}
      onContextMenu={handleContextMenu}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "bg-transparent active:bg-transparent",
        !isFocused && "hover:bg-black/5 hover:dark:bg-white/10",
        !isFocused && "active:bg-black/10 active:dark:bg-white/20",
        isFocused && "bg-white dark:bg-white/25",
        isFocused && "active:bg-white active:dark:bg-white/25",
        "text-gray-900 dark:text-gray-200",
        "transition-colors"
      )}
      initial={{ opacity: 0, x: -10 }}
      animate={{
        opacity: 1,
        x: 0,
        scale: isPressed ? 0.985 : 1
      }}
      exit={{ opacity: 0, x: -10 }}
      onMouseDown={handleMouseDown}
      onMouseUp={() => setIsPressed(false)}
      transition={{
        duration: 0.2,
        scale: { type: "spring", stiffness: 600, damping: 20 }
      }}
      layout
      layoutId={`tab-${tab.id}`}
    >
      <div className="flex flex-row justify-between w-full h-full">
        {/* Left side */}
        <div className={cn("flex flex-row items-center flex-1", open && "min-w-0 mr-1")}>
          {renderLeftSide ? (
            renderLeftSide()
          ) : (
            <>
              {/* Favicon */}
              <div className="w-4 h-4 flex-shrink-0 mr-1">
                {!noFavicon && (
                  <img
                    src={craftActiveFaviconURL(tab.id, tab.faviconURL)}
                    alt={tab.title}
                    className="size-full rounded-sm user-drag-none object-contain overflow-hidden"
                    onError={() => setIsError(true)}
                    onClick={handleClick}
                    onMouseDown={handleMouseDown}
                  />
                )}
                {noFavicon && <div className="size-full bg-gray-300 dark:bg-gray-300/30 rounded-sm" />}
              </div>
              {/* Audio indicator */}
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
              {/* Title */}
              <span className="ml-1 truncate min-w-0 flex-1 font-medium">{tab.title}</span>
            </>
          )}
        </div>
        {/* Right side */}
        <div className={cn("flex flex-row items-center gap-0.5", open && "flex-shrink-0")}>
          {renderRightSide ? (
            renderRightSide(isHovered)
          ) : (
            <>
              {/* Close/Reset tab button */}
              {isHovered && (
                <motion.div whileTap={{ scale: 0.95 }} className="flex items-center justify-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={isPinned ? handleResetTab : handleCloseTab}
                    className="size-5 bg-transparent rounded-sm hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
                    onMouseDown={(event) => event.stopPropagation()}
                  >
                    {isPinned ? (
                      <Minus className="size-4 text-muted-foreground dark:text-white" />
                    ) : (
                      <XIcon className="size-4 text-muted-foreground dark:text-white" />
                    )}
                  </Button>
                </motion.div>
              )}
            </>
          )}
        </div>
        {children}
      </div>
    </MotionSidebarMenuButton>
  );
});