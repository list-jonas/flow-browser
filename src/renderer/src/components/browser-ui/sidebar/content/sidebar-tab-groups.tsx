import { RefObject, useRef } from "react";
import { motion } from "motion/react";
import { TabGroup } from "@/components/providers/tabs-provider";
import { Edge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import { TabData } from "~/types/tabs";
import { DropIndicator } from "@/components/browser-ui/sidebar/content/space-sidebar";
import { BaseTab } from "@/components/browser-ui/sidebar/content/shared/base-tab";
import { useTabDragDrop } from "@/components/browser-ui/sidebar/content/shared/tab-drag-drop";
import { cn } from "@/lib/utils";

export function SidebarTab({ tab, isFocused }: { tab: TabData; isFocused: boolean }) {
  const handleClick = () => {
    if (!tab.id) return;
    flow.tabs.switchToTab(tab.id);
  };

  const handleCloseTab = (e: React.MouseEvent) => {
    if (!tab.id) return;
    e.preventDefault();
    flow.tabs.closeTab(tab.id);
  };

  const handleResetTab = (e: React.MouseEvent) => {
    if (!tab.id) return;
    e.preventDefault();
    if (tab.pinnedUrl) {
      flow.navigation.goTo(tab.pinnedUrl, tab.id);
    } else {
      flow.navigation.reloadTab(tab.id);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (tab.id) flow.tabs.showContextMenu(tab.id);
  };

  return (
    <BaseTab
      tab={tab}
      isFocused={isFocused}
      onTabClick={handleClick}
      onCloseTab={handleCloseTab}
      onResetTab={handleResetTab}
      onContextMenu={handleContextMenu}
    />
  );
}

export type TabGroupSourceData = {
  type: "tab-group";
  tabGroupId: number;
  primaryTabId: number;
  profileId: string;
  spaceId: string;
  position: number;
};

export function SidebarTabGroups({
  tabGroup,
  isFocused,
  isSpaceLight,
  position,
  moveTab
}: {
  tabGroup: TabGroup;
  isActive: boolean;
  isFocused: boolean;
  isSpaceLight: boolean;
  position: number;
  moveTab: (tabId: number, newPosition: number) => void;
}) {
  const { tabs, focusedTab } = tabGroup;
  const ref = useRef<HTMLDivElement>(null);

  const handleDrop = (sourceData: any, targetEdge: Edge | null, newPosition: number) => {
    if (sourceData.type === "pinned-tab") {
      // Unpin the tab first
      flow.tabs.setTabPinned(sourceData.tabId, false);
      // Treat like moving a single tab (not group) into this group
      moveTab(sourceData.tabId, newPosition);
      return;
    }

    const sourceTabId = sourceData.primaryTabId;

    if (sourceData.spaceId != tabGroup.spaceId) {
      if (sourceData.profileId != tabGroup.profileId) {
        // TODO: @MOVE_TABS_BETWEEN_PROFILES not supported yet
      } else {
        // move tab to new space
        flow.tabs.moveTabToWindowSpace(sourceTabId, tabGroup.spaceId, newPosition);
      }
    } else {
      moveTab(sourceTabId, newPosition);
    }
  };

  const canDrop = (sourceData: any) => {
    if (sourceData.type === "pinned-tab") {
      // Only allow dropping into same profile and different space (or same) for now
      return sourceData.profileId === tabGroup.profileId && sourceData.spaceId === tabGroup.spaceId;
    }

    if (sourceData.type !== "tab-group") {
      return false;
    }

    if (sourceData.tabGroupId === tabGroup.id) {
      return false;
    }

    if (sourceData.profileId !== tabGroup.profileId) {
      // TODO: @MOVE_TABS_BETWEEN_PROFILES not supported yet
      return false;
    }

    return true;
  };

  const { closestEdge: groupClosestEdge } = useTabDragDrop({
    elementRef: ref as RefObject<HTMLElement>,
    tabId: tabGroup.tabs[0].id,
    profileId: tabGroup.profileId,
    spaceId: tabGroup.spaceId,
    position,
    isPinned: false,
    onDrop: handleDrop,
    canDrop
  });

  return (
    <>
      {groupClosestEdge == "top" && <DropIndicator isSpaceLight={isSpaceLight} />}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        layout
        className={cn("space-y-0.5")}
        ref={ref}
      >
        {tabs.map((tab) => (
          <SidebarTab key={tab.id} tab={tab} isFocused={isFocused && focusedTab?.id === tab.id} />
        ))}
      </motion.div>
      {groupClosestEdge == "bottom" && <DropIndicator isSpaceLight={isSpaceLight} />}
    </>
  );
}
