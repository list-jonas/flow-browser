import { Button } from "@/components/ui/button";
import { Minus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useTabs } from "@/components/providers/tabs-provider";
import { TabData } from "~/types/tabs";
import { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { DropIndicator } from "@/components/browser-ui/sidebar/content/space-sidebar";
import { BaseTab } from "@/components/browser-ui/sidebar/content/shared/base-tab";
import { TabFavicon, TabAudioIndicator } from "@/components/browser-ui/sidebar/content/shared/tab-elements";
import { useTabDragDrop } from "@/components/browser-ui/sidebar/content/shared/tab-drag-drop";

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
  const [isIconHovered, setIsIconHovered] = useState(false);

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

  const { getTabGroups } = useTabs();

  const ref = useRef<HTMLButtonElement>(null);

  // navigation handlers
  const handleRowClick = () => tab.id && flow.tabs.switchToTab(tab.id);

  const handleFaviconReset = () => {
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

  /* Drag & Drop logic */
  const handleDrop = (sourceData: any, targetEdge: Edge | null, newPosition: number) => {
    let sourceTabId: number | null = null;

    if (sourceData.type === "pinned-tab") {
      sourceTabId = sourceData.tabId;
    } else if (sourceData.type === "tab-group") {
      // Pin the tab first when dragging from normal list
      flow.tabs.setTabPinned(sourceData.primaryTabId, true);
      sourceTabId = sourceData.primaryTabId;
    }

    if (sourceTabId === null) return;
    movePinnedTab(sourceTabId, newPosition);
  };

  const canDrop = (sourceData: any) => {
    if (sourceData.type === "pinned-tab") {
      return sourceData.tabId !== tab.id && sourceData.profileId === tab.profileId;
    }
    if (sourceData.type === "tab-group") {
      return sourceData.profileId === tab.profileId;
    }
    return false;
  };

  const { closestEdge } = useTabDragDrop({
    elementRef: ref as unknown as React.RefObject<HTMLElement>,
    tabId: tab.id,
    profileId: tab.profileId,
    spaceId: tab.spaceId,
    position,
    isPinned: true,
    onDrop: handleDrop,
    canDrop
  });

  return (
    <>
      {closestEdge === "top" && <DropIndicator isSpaceLight={isSpaceLight} />}
      <BaseTab
        tab={tab}
        isFocused={isFocused}
        onTabClick={handleRowClick}
        onContextMenu={handleContextMenu}
        onResetTab={handleFaviconReset}
        ref={ref}
        renderLeftSide={() => (
          <>
            <TabFavicon
              tabId={tab.id}
              faviconURL={tab.faviconURL}
              title={tab.title}
              onReset={handleFaviconReset}
              isIconHovered={isIconHovered}
              onIconHoverChange={setIsIconHovered}
            />
            {tab.pinnedUrl && tab.url && tab.pinnedUrl !== tab.url && (
              <span className={`text-muted-foreground ${isIconHovered && "invisible"}`}>/</span>
            )}
            <TabAudioIndicator isPlayingAudio={tab.audible || false} isMuted={tab.muted || false} tabId={tab.id} />
            <div className="flex flex-col ml-1 relative overflow-hidden">
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
                  className="truncate min-w-0 flex-1 font-medium text-ellipsis overflow-hidden"
                  style={{
                    position: "relative",
                    top: isIconHovered && tab.pinnedUrl && tab.url && tab.pinnedUrl !== tab.url ? "-7px" : "0",
                    transition: "top 0.2s ease",
                    maxWidth: "100%",
                    display: "inline-block"
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
          </>
        )}
        renderRightSide={(isHovered) => (
          <>
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
          </>
        )}
      />
      {closestEdge === "bottom" && <DropIndicator isSpaceLight={isSpaceLight} />}
    </>
  );
}
