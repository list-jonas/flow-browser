import { Button } from "@/components/ui/button";
import { SidebarMenuButton, useSidebar } from "@/components/ui/resizable-sidebar";
import { cn, craftActiveFaviconURL } from "@/lib/utils";
import { Minus, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TabData } from "~/types/tabs";
import type { TabGroupSourceData } from "@/components/browser-ui/sidebar/content/sidebar-tab-groups";
import {
  draggable,
  dropTargetForElements,
  ElementDropTargetEventBasePayload
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { attachClosestEdge, extractClosestEdge, Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { DropIndicator } from "@/components/browser-ui/sidebar/content/space-sidebar";

const MotionSidebarMenuButton = motion(SidebarMenuButton);

export type PinnedTabSourceData = {
  type: "pinned-tab";
  tabId: number;
  profileId: string;
  spaceId: string;
  position: number;
};

type SidebarPinnedTabProps = {
  tab: TabData;
  isFocused: boolean;
  isSpaceLight: boolean;
  position: number;
  movePinnedTab: (tabId: number, newPos: number) => void;
};

export function SidebarPinnedTab({ tab, isFocused, isSpaceLight, position, movePinnedTab }: SidebarPinnedTabProps) {
  const [cachedFaviconUrl, setCachedFaviconUrl] = useState<string | null>(tab.faviconURL);
  const [isError, setIsError] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const noFavicon = !cachedFaviconUrl || isError;

  const isMuted = tab.muted;
  const isPlayingAudio = tab.audible;
  const { open } = useSidebar();

  const ref = useRef<HTMLButtonElement>(null);
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    if (tab.faviconURL) {
      setCachedFaviconUrl(tab.faviconURL);
    } else {
      setCachedFaviconUrl(null);
    }
    setIsError(false);
  }, [tab.faviconURL]);

  // navigation handlers
  const handleClick = () => tab.id && flow.tabs.switchToTab(tab.id);
  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!tab.id) return;
    if (tab.pinnedUrl) {
      flow.navigation.goTo(tab.pinnedUrl, tab.id);
    } else {
      flow.navigation.reloadTab(tab.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!tab.id) return;
    flow.tabs.showContextMenu(tab.id);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) handleClick();
    setIsPressed(true);
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tab.id) return;
    flow.tabs.setTabMuted(tab.id, !tab.muted);
  };

  const VolumeIcon = isMuted ? VolumeX : Volume2;

  /* Drag & Drop logic */
  useEffect(() => {
    const el = ref.current;
    if (!el) return () => {};

    const onChange = ({ self }: ElementDropTargetEventBasePayload) => {
      setClosestEdge(extractClosestEdge(self.data));
    };

    const onDrop = (args: ElementDropTargetEventBasePayload) => {
      setClosestEdge(null);
      const srcAny = args.source.data as PinnedTabSourceData | TabGroupSourceData;

      let sourceTabId: number | null = null;

      if (srcAny.type === "pinned-tab") {
        sourceTabId = srcAny.tabId;
      } else if (srcAny.type === "tab-group") {
        // Pin the tab first when dragging from normal list
        flow.tabs.setTabPinned(srcAny.primaryTabId, true);
        sourceTabId = srcAny.primaryTabId;
      }

      if (sourceTabId === null) return;

      const newPos = extractClosestEdge(args.self.data) === "top" ? position - 0.5 : position + 0.5;
      movePinnedTab(sourceTabId, newPos);
    };

    const cleanupDrag = draggable({
      element: el,
      getInitialData: () =>
        ({
          type: "pinned-tab",
          tabId: tab.id,
          profileId: tab.profileId,
          spaceId: tab.spaceId,
          position
        }) satisfies PinnedTabSourceData
    });

    const cleanupDrop = dropTargetForElements({
      element: el,
      getData: ({ input, element }) => attachClosestEdge({}, { input, element, allowedEdges: ["top", "bottom"] }),
      canDrop: ({ source }) => {
        const src = source.data as PinnedTabSourceData | TabGroupSourceData;
        if (src.type === "pinned-tab") {
          return src.tabId !== tab.id && src.profileId === tab.profileId;
        }
        if (src.type === "tab-group") {
          return src.profileId === tab.profileId;
        }
        return false;
      },
      onDrop,
      onDragEnter: onChange,
      onDrag: onChange,
      onDragLeave: () => setClosestEdge(null)
    });

    return () => {
      cleanupDrag();
      cleanupDrop();
    };
  }, [position, tab.id, tab.profileId, movePinnedTab]);

  return (
    <>
      {closestEdge === "top" && <DropIndicator isSpaceLight={isSpaceLight} />}
      <MotionSidebarMenuButton
        ref={ref}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={cn(
          "bg-transparent active:bg-transparent",
          !isFocused && "hover:bg-black/5 hover:dark:bg-white/10",
          !isFocused && "active:bg-black/10 active:dark:bg-white/20",
          isFocused && "bg-white dark:bg-white/25",
          "text-gray-900 dark:text-gray-200",
          "transition-colors"
        )}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0, scale: isPressed ? 0.985 : 1 }}
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
          <div className={cn("flex flex-row items-center flex-1", open && "min-w-0 mr-1")}>
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
            <AnimatePresence initial={false}>
              {(isPlayingAudio || isMuted) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8, width: 0 }}
                  animate={{ opacity: 1, scale: 1, width: "auto" }}
                  exit={{ opacity: 0, scale: 0.8, width: 0, marginLeft: 0, marginRight: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
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
            {tab.pinnedUrl && tab.pinnedUrl !== tab.url && (
              <span className="mx-1 text-muted-foreground dark:text-white/50">/</span>
            )}
            <span className="ml-1 truncate min-w-0 flex-1 font-medium">{tab.title}</span>
          </div>
          <div className={cn("flex flex-row items-center gap-0.5", open && "flex-shrink-0")}>
            {isHovered && (
              <motion.div whileTap={{ scale: 0.95 }} className="flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReset}
                  className="size-5 bg-transparent rounded-sm hover:bg-black/10 dark:hover:bg-white/10 flex items-center justify-center"
                  onMouseDown={(event) => event.stopPropagation()}
                >
                  <Minus className="size-4 text-muted-foreground dark:text-white" />
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </MotionSidebarMenuButton>
      {closestEdge === "bottom" && <DropIndicator isSpaceLight={isSpaceLight} />}
    </>
  );
}
