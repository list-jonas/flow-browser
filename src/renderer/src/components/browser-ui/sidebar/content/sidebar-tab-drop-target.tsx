import { TabGroupSourceData } from "@/components/browser-ui/sidebar/content/sidebar-tab-groups";
import { PinnedTabSourceData } from "@/components/browser-ui/sidebar/content/sidebar-pinned-tab";
import { DropIndicator } from "@/components/browser-ui/sidebar/content/space-sidebar";
import { useEffect, useRef, useState } from "react";
import { Space } from "~/flow/interfaces/sessions/spaces";
import {
  dropTargetForElements,
  ElementDropTargetEventBasePayload
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";

type SidebarTabDropTargetProps = {
  spaceData: Space;
  isSpaceLight: boolean;
  moveTab: (tabId: number, newPos: number) => void;
  biggestIndex: number;
};

export function SidebarTabDropTarget({ spaceData, isSpaceLight, moveTab, biggestIndex }: SidebarTabDropTargetProps) {
  const [showDropIndicator, setShowDropIndicator] = useState(false);
  const dropTargetRef = useRef<HTMLDivElement>(null);

  const handleDoubleClick = () => {
    flow.newTab.open();
  };

  useEffect(() => {
    const el = dropTargetRef.current;
    if (!el) return () => {};

    // inside onDrop definition replace body
    function onDrop(args: ElementDropTargetEventBasePayload) {
      setShowDropIndicator(false);
      const srcAny = args.source.data as TabGroupSourceData | PinnedTabSourceData;
    
      let sourceTabId: number;
    
      if (srcAny.type === "pinned-tab") {
        // Unpin the tab first before moving
        flow.tabs.setTabPinned(srcAny.tabId, false);
        sourceTabId = srcAny.tabId;
      } else {
        sourceTabId = srcAny.primaryTabId;
      }
    
      const newPos = biggestIndex + 1;
    
      if (srcAny.spaceId !== spaceData.id) {
        if (srcAny.profileId !== spaceData.profileId) {
          // TODO: cross-profile move not supported yet
        } else {
          flow.tabs.moveTabToWindowSpace(sourceTabId, spaceData.id, newPos);
        }
      } else {
        moveTab(sourceTabId, newPos);
      }
    }

    function onChange() {
      setShowDropIndicator(true);
    }

    const cleanupDropTarget = dropTargetForElements({
      element: el,
      canDrop: (args) => {
        const src = args.source.data as TabGroupSourceData | PinnedTabSourceData;
        if (src.type === "pinned-tab") {
          return src.profileId === spaceData.profileId;
        }
        if (src.type !== "tab-group") {
          return false;
        }
        if (src.profileId !== spaceData.profileId) {
          return false;
        }
        return true;
      },
      onDrop: onDrop,
      onDragEnter: onChange,
      onDrag: onChange,
      onDragLeave: () => setShowDropIndicator(false)
    });

    return cleanupDropTarget;
  }, [spaceData.profileId, isSpaceLight, moveTab, biggestIndex, spaceData.id]);

  return (
    <>
      {showDropIndicator && <DropIndicator isSpaceLight={isSpaceLight} />}
      <div className="flex-1 flex flex-col" ref={dropTargetRef} onDoubleClick={handleDoubleClick}></div>
    </>
  );
}
