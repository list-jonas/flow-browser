import { useEffect, useState, RefObject } from "react";
import { Edge, attachClosestEdge, extractClosestEdge } from "@atlaskit/pragmatic-drag-and-drop-hitbox/closest-edge";
import {
  draggable,
  dropTargetForElements,
  ElementDropTargetEventBasePayload
} from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { TabGroupSourceData } from "../sidebar-tab-groups";
import { PinnedTabSourceData } from "../sidebar-pinned-tab";

export type TabSourceData = TabGroupSourceData | PinnedTabSourceData;

export type UseDragDropOptions = {
  elementRef: RefObject<HTMLElement>;
  tabId: number;
  profileId: string;
  spaceId: string;
  position: number;
  isPinned: boolean;
  onDrop?: (sourceData: TabSourceData, targetEdge: Edge | null, newPosition: number) => void;
  canDrop?: (sourceData: TabSourceData) => boolean;
};

export function useTabDragDrop({
  elementRef,
  tabId,
  profileId,
  spaceId,
  position,
  isPinned,
  onDrop,
  canDrop
}: UseDragDropOptions) {
  const [closestEdge, setClosestEdge] = useState<Edge | null>(null);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return () => {};

    const onChange = ({ self }: ElementDropTargetEventBasePayload) => {
      setClosestEdge(extractClosestEdge(self.data));
    };

    const handleDrop = (args: ElementDropTargetEventBasePayload) => {
      const targetEdge = extractClosestEdge(args.self.data);
      setClosestEdge(null);
      
      const sourceData = args.source.data as TabSourceData;
      const newPos = targetEdge === "top" ? position - 0.5 : position + 0.5;
      
      if (onDrop) {
        onDrop(sourceData, targetEdge, newPos);
      }
    };

    const sourceData = isPinned
      ? {
          type: "pinned-tab" as const,
          tabId,
          profileId,
          spaceId,
          position
        }
      : {
          type: "tab-group" as const,
          tabGroupId: 0, // This will be set by the parent component
          primaryTabId: tabId,
          profileId,
          spaceId,
          position
        };

    const draggableCleanup = draggable({
      element: el,
      getInitialData: () => sourceData
    });

    const dropTargetCleanup = dropTargetForElements({
      element: el,
      getData: ({ input, element }) => {
        return attachClosestEdge({}, { input, element, allowedEdges: ["top", "bottom"] });
      },
      canDrop: ({ source }) => {
        const src = source.data as TabSourceData;
        
        if (canDrop) {
          return canDrop(src);
        }
        
        // Default drop logic
        if (src.type === "pinned-tab" && isPinned) {
          return src.tabId !== tabId && src.profileId === profileId;
        }
        
        if (src.type === "tab-group" && !isPinned) {
          return src.primaryTabId !== tabId && src.profileId === profileId;
        }
        
        return false;
      },
      onDrop: handleDrop,
      onDragEnter: onChange,
      onDrag: onChange,
      onDragLeave: () => setClosestEdge(null)
    });

    return () => {
      draggableCleanup();
      dropTargetCleanup();
    };
  }, [elementRef, tabId, profileId, spaceId, position, isPinned, onDrop, canDrop]);

  return { closestEdge };
}