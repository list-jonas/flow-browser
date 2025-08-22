import { NewTabButton } from "@/components/browser-ui/sidebar/content/new-tab-button";
import { SidebarTabGroups } from "@/components/browser-ui/sidebar/content/sidebar-tab-groups";
import { SidebarPinnedTab } from "@/components/browser-ui/sidebar/content/sidebar-pinned-tab";
import { SidebarPinnedTabDropTarget } from "@/components/browser-ui/sidebar/content/sidebar-pinned-tab-drop-target";
import { SpaceTitle } from "@/components/browser-ui/sidebar/content/space-title";
import { useTabs } from "@/components/providers/tabs-provider";
import { Button } from "@/components/ui/button";
import { SidebarGroup, SidebarMenu, useSidebar } from "@/components/ui/resizable-sidebar";
import { Space } from "~/flow/interfaces/sessions/spaces";
import { cn, hex_is_light } from "@/lib/utils";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useRef } from "react";
import { DropIndicator as BaseDropIndicator } from "@atlaskit/pragmatic-drag-and-drop-react-drop-indicator/list-item";
import { SidebarTabDropTarget } from "@/components/browser-ui/sidebar/content/sidebar-tab-drop-target";

const ENABLE_SECTION_DEVIDER = true;

export function DropIndicator({ isSpaceLight }: { isSpaceLight: boolean }) {
  return (
    <ol
      className="flex *:mx-2 relative h-0 -m-0.5"
      style={
        {
          "--ds-border-selected": isSpaceLight ? "#000" : "#fff"
        } as React.CSSProperties
      }
    >
      <BaseDropIndicator
        instruction={{
          axis: "vertical",
          operation: "reorder-after",
          blocked: false
        }}
        lineGap="0px"
        lineType="terminal-no-bleed"
      />
    </ol>
  );
}

function SidebarSectionDivider({ hasTabs, handleCloseAllTabs }: { hasTabs: boolean; handleCloseAllTabs: () => void }) {
  const { open } = useSidebar();

  if (!hasTabs) return null;

  return (
    <motion.div
      className={cn("flex flex-row", "items-center justify-between", "h-1 gap-1", open ? "mx-1 my-3" : "mx-1 my-1")}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.2 }}
    >
      <div className={cn("h-[1px] flex-grow", "bg-black/10 dark:bg-white/25")} />
      {open && (
        <Button
          className={cn(
            "h-1 !p-1 rounded-sm",
            "text-black/50 dark:text-white/50",
            "hover:text-black/80 dark:hover:text-white/80",
            "hover:bg-transparent hover:dark:bg-transparent"
          )}
          variant="ghost"
          size="sm"
          onClick={handleCloseAllTabs}
        >
          <span className="text-xs font-semibold">Clear</span>
        </Button>
      )}
    </motion.div>
  );
}

export function SpaceSidebar({ space }: { space: Space }) {
  const { getTabGroups, getActiveTabGroup, getFocusedTab, getPinnedTabs } = useTabs();

  const tabGroups = getTabGroups(space.id);
  const pinnedTabs = getPinnedTabs(space.id);

  const movePinnedTab = useCallback(
    (tabId: number, newPosition: number) => {
      // Work with a fresh copy ordered by the persisted position
      const existingPinned = [...pinnedTabs].sort((a, b) => a.position - b.position);

      // If the tab is not yet in the pinned list (e.g. dragged from normal list),
      // temporarily include a minimal placeholder so that ordering can be derived.
      const workingList = existingPinned.some((t) => t.id === tabId)
        ? existingPinned
        : [...existingPinned, { id: tabId, position: newPosition } as any];

      // Build a quick lookup from tabId → currentIndex for fast access inside the sort callback
      const indexMap = new Map(workingList.map((t, idx) => [t.id, idx]));

      // Ensure the requested position is within current bounds (after potential removal)
      const clampedPosition = Math.min(newPosition, workingList.length);

      // Derive the new order by applying the same comparator technique used for normal tabs
      const reOrdered = [...workingList].sort((a, b) => {
        const aPos = a.id === tabId ? clampedPosition : (indexMap.get(a.id) ?? 0);
        const bPos = b.id === tabId ? clampedPosition : (indexMap.get(b.id) ?? 0);
        return aPos - bPos;
      });

      // Persist the updated sequential positions (0,1,2,...) back to main process
      reOrdered.forEach((t, idx) => {
        if (t.position !== idx) {
          flow.tabs.moveTab(t.id, idx);
        }
      });
    },
    [pinnedTabs]
  );

  const activeTabGroup = getActiveTabGroup(space.id);
  const focusedTab = getFocusedTab(space.id);

  const isSpaceLight = hex_is_light(space.bgStartColor || "#000000");

  const handleCloseAllTabs = useCallback(() => {
    const closeActive = tabGroups.length <= 1;

    for (const tabGroup of tabGroups) {
      const isTabGroupActive = activeTabGroup?.id === tabGroup.id;

      if (!closeActive && isTabGroupActive) continue;

      for (const tab of tabGroup.tabs) {
        flow.tabs.closeTab(tab.id);
      }
    }
  }, [tabGroups, activeTabGroup]);

  const sidebarRef = useRef<HTMLDivElement>(null);

  const hasTabs = tabGroups.length > 0;

  const sortedTabGroups = useMemo(() => {
    return [...tabGroups].sort((a, b) => a.position - b.position);
  }, [tabGroups]);

  const moveTab = useCallback(
    (tabId: number, newPosition: number) => {
      const newSortedTabGroups = [...sortedTabGroups].sort((a, b) => {
        const isTabInGroupA = a.tabs.some((tab) => tab.id === tabId);
        const isTabInGroupB = b.tabs.some((tab) => tab.id === tabId);

        const aIndex = sortedTabGroups.findIndex((tabGroup) => tabGroup.id === a.id);
        const bIndex = sortedTabGroups.findIndex((tabGroup) => tabGroup.id === b.id);

        const aPos = isTabInGroupA ? newPosition : aIndex;
        const bPos = isTabInGroupB ? newPosition : bIndex;

        return aPos - bPos;
      });

      for (const [index, tabGroup] of newSortedTabGroups.entries()) {
        if (tabGroup.position !== index) {
          flow.tabs.moveTab(tabGroup.tabs[0].id, index);
        }
      }
    },
    [sortedTabGroups]
  );

  return (
    <div className={cn(isSpaceLight ? "" : "dark", "h-full flex flex-col")} ref={sidebarRef}>
      <SpaceTitle space={space} />
      <SidebarGroup className="py-0.5 flex-1">
        <SidebarMenu className="flex-1">
          {/* Pinned Tabs Section */}
          <AnimatePresence initial={false}>
            {pinnedTabs.map((tab, index) => (
              <SidebarPinnedTab
                key={tab.id}
                tab={tab}
                isFocused={focusedTab?.id === tab.id}
                isSpaceLight={isSpaceLight}
                position={index}
                movePinnedTab={movePinnedTab}
              />
            ))}
          </AnimatePresence>

          {/* Drag zone: if Clear divider visible, use it; otherwise use New Tab button */}
          {pinnedTabs.length > 0 ? (
            <SidebarPinnedTabDropTarget
              isSpaceLight={isSpaceLight}
              pinnedTabsLength={pinnedTabs.length}
              movePinnedTab={movePinnedTab}
            >
              <AnimatePresence>
                <SidebarSectionDivider hasTabs={hasTabs} handleCloseAllTabs={handleCloseAllTabs} />
              </AnimatePresence>
            </SidebarPinnedTabDropTarget>
          ) : (
            <SidebarPinnedTabDropTarget
              isSpaceLight={isSpaceLight}
              pinnedTabsLength={pinnedTabs.length}
              movePinnedTab={movePinnedTab}
            >
              <NewTabButton />
            </SidebarPinnedTabDropTarget>
          )}

          {/* If Clear divider is shown, render New Tab button separately below it */}
          {pinnedTabs.length > 0 && <NewTabButton />}

          {/* Main Tab Groups Section */}
          <div className="flex-1 flex flex-col justify-between gap-1">
            <AnimatePresence initial={false}>
              {sortedTabGroups.map((tabGroup, index) => (
                <SidebarTabGroups
                  key={tabGroup.id}
                  tabGroup={tabGroup}
                  isActive={activeTabGroup?.id === tabGroup.id || false}
                  isFocused={!!focusedTab && tabGroup.tabs.some((tab) => tab.id === focusedTab.id)}
                  isSpaceLight={isSpaceLight}
                  position={index}
                  moveTab={moveTab}
                />
              ))}
              <SidebarTabDropTarget
                spaceData={space}
                isSpaceLight={isSpaceLight}
                moveTab={moveTab}
                biggestIndex={sortedTabGroups.length - 1}
              />
            </AnimatePresence>
          </div>
        </SidebarMenu>
      </SidebarGroup>
    </div>
  );
}
