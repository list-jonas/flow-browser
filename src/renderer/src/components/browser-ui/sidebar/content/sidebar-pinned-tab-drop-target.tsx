import { useEffect, useRef, useState, type ReactNode } from "react";
import { DropIndicator } from "@/components/browser-ui/sidebar/content/space-sidebar";
import { PinnedTabSourceData } from "@/components/browser-ui/sidebar/content/sidebar-pinned-tab";
import { TabGroupSourceData } from "@/components/browser-ui/sidebar/content/sidebar-tab-groups";
import {
  dropTargetForElements,
  ElementDropTargetEventBasePayload
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

interface SidebarPinnedTabDropTargetProps {
  isSpaceLight: boolean;
  pinnedTabsLength: number;
  movePinnedTab: (tabId: number, newPos: number) => void;
  children?: ReactNode;
}

export function SidebarPinnedTabDropTarget({
  isSpaceLight,
  pinnedTabsLength,
  movePinnedTab,
  children
}: SidebarPinnedTabDropTargetProps) {
  const [showDropIndicator, setShowDropIndicator] = useState(false);
  const dropTargetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = dropTargetRef.current;
    if (!el) return () => {};

    const handleDrop = (args: ElementDropTargetEventBasePayload) => {
      setShowDropIndicator(false);
      const srcAny = args.source.data as PinnedTabSourceData | TabGroupSourceData;
      if (srcAny.type === "pinned-tab") {
        movePinnedTab(srcAny.tabId, pinnedTabsLength);
      } else if (srcAny.type === "tab-group") {
        flow.tabs.setTabPinned(srcAny.primaryTabId, true);
        movePinnedTab(srcAny.primaryTabId, pinnedTabsLength);
      }
    };

    const handleChange = () => setShowDropIndicator(true);

    const cleanup = dropTargetForElements({
      element: el,
      canDrop: ({ source }) => {
        const src = source.data as PinnedTabSourceData | TabGroupSourceData;
        return src.type === "pinned-tab" || src.type === "tab-group";
      },
      onDrop: handleDrop,
      onDragEnter: handleChange,
      onDrag: handleChange,
      onDragLeave: () => setShowDropIndicator(false)
    });

    return cleanup;
  }, [movePinnedTab, pinnedTabsLength]);

  return (
    <div ref={dropTargetRef} className="relative flex flex-col">
      {showDropIndicator && (
        <div className="absolute inset-0 pointer-events-none">
          <DropIndicator isSpaceLight={isSpaceLight} />
        </div>
      )}
      {children}
    </div>
  );
}
