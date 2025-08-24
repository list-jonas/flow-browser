import { Button } from "@/components/ui/button";
import { SidebarMenuButton, useSidebar } from "@/components/ui/resizable-sidebar";
import { cn, craftActiveFaviconURL } from "@/lib/utils";
import { Minus, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTabs } from "@/components/providers/tabs-provider";
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
  const [isIconHovered, setIsIconHovered] = useState(false);
  const noFavicon = !cachedFaviconUrl || isError;

  // state for editable pinned name
  const [isEditingName, setIsEditingName] = useState(false);
  const displayName =
    tab.pinnedUrl && tab.url && tab.pinnedUrl === tab.url
      ? (tab.pinnedName ?? tab.title)
      : tab.url
        ? tab.title
        : (tab.pinnedName ?? tab.title);
  const [editedName, setEditedName] = useState(tab.pinnedName ?? tab.title);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditingName) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else {
      setEditedName(tab.pinnedName ?? "");
    }
  }, [tab.pinnedName, isEditingName]);

  const commitEditedName = () => {
    if (!tab.id) return;
    const trimmed = editedName.trim();
    const newName = trimmed.length > 0 ? trimmed : null;
    flow.tabs.setTabPinned(tab.id, true, tab.pinnedUrl ?? tab.url ?? "", newName);
    setIsEditingName(false);
  };

  const isMuted = tab.muted;
  const isPlayingAudio = tab.audible;
  const { open } = useSidebar();
  const { getTabGroups } = useTabs();

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
  const handleRowClick = () => tab.id && flow.tabs.switchToTab(tab.id);
  const handleFaviconReset = (e: React.MouseEvent) => {
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
    if (e.button === 0) handleRowClick();
    setIsPressed(true);
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tab.id) return;
    flow.tabs.setTabMuted(tab.id, !tab.muted);
  };

  const handlePutToSleep = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!tab.id) return;

    // Helper to switch focus after putting tab to sleep
    const switchFocusAfterSleep = () => {
      const groups = getTabGroups(tab.spaceId);
      for (const g of groups) {
        for (const t of g.tabs) {
          if (!t.isPinned) {
            flow.tabs.switchToTab(t.id);
            return;
          }
        }
      }
    };

    // If current URL differs from pinned URL, navigate first then sleep after slight delay
    if (tab.pinnedUrl && tab.url !== tab.pinnedUrl) {
      flow.navigation.goTo(tab.pinnedUrl, tab.id);
      // Give the navigation IPC a brief moment to propagate before sleeping
      setTimeout(() => {
        flow.tabs.putToSleep(tab.id).then(switchFocusAfterSleep);
      }, 150);
    } else {
      await flow.tabs.putToSleep(tab.id);
      switchFocusAfterSleep();
    }
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
          <div className={cn("flex select-none flex-row items-center flex-1", open && "min-w-0 mr-1")}>
            <div
              className="w-4 h-4 select-none flex-shrink-0 mr-1"
              onClick={handleFaviconReset}
              onMouseEnter={() => setIsIconHovered(true)}
              onMouseLeave={() => setIsIconHovered(false)}
            >
              {!noFavicon && (
                <img
                  src={craftActiveFaviconURL(tab.id, tab.faviconURL)}
                  alt={tab.title}
                  className="size-full rounded-sm user-drag-none object-contain overflow-hidden"
                  onError={() => setIsError(true)}
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
                    <VolumeIcon className={cn("size-4", "text-muted-foreground/60")} />
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
            {tab.pinnedUrl && tab.url && tab.pinnedUrl !== tab.url && (
              <span className={`text-muted-foreground ${isIconHovered && "invisible"}`}>/</span>
            )}
            <div className="flex flex-col ml-1 relative">
              {isEditingName ? (
                <input
                  ref={inputRef}
                  value={editedName || tab.pinnedName || tab.title}
                  onChange={(e) => setEditedName(e.target.value)}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                  }}
                  onBlur={commitEditedName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitEditedName();
                    if (e.key === "Escape") setIsEditingName(false);
                  }}
                  className="truncate min-w-0 flex-1 font-medium bg-transparent outline-none"
                />
              ) : (
                <span
                  className="truncate min-w-0 flex-1 font-medium"
                  style={{
                    position: "relative",
                    top: isIconHovered && tab.pinnedUrl && tab.url && tab.pinnedUrl !== tab.url ? "-7px" : "0",
                    transition: "top 0.2s ease"
                  }}
                  onDoubleClick={() => {
                    setIsEditingName(true);
                    setTimeout(() => {
                      if (inputRef.current) {
                        inputRef.current.focus();
                        inputRef.current.select();
                      }
                    }, 0);
                  }}
                >
                  {displayName}
                </span>
              )}
              <AnimatePresence>
                {isIconHovered && tab.pinnedUrl && tab.url && tab.pinnedUrl !== tab.url && (
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 10 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-muted-foreground absolute"
                  >
                    Back to pinned
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
          <div className={cn("flex flex-row items-center gap-0.5", open && "flex-shrink-0")}>
            {isHovered && (
              <motion.div whileTap={{ scale: 0.95 }} className="flex items-center justify-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handlePutToSleep}
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
