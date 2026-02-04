import React, { useState, useRef, useMemo } from "react";

interface VirtualListProps<T> {
  items: T[];
  height: number;
  getItemHeight: (index: number) => number;
  renderItem: (
    item: T,
    index: number,
    style: React.CSSProperties,
  ) => React.ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

export function VirtualList<T>({
  items,
  height,
  getItemHeight,
  renderItem,
  overscan = 5,
  className = "",
  onScroll,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const { itemOffsets, totalHeight } = useMemo(() => {
    const offsets = new Array(items.length);
    let currentOffset = 0;
    for (let i = 0; i < items.length; i++) {
      offsets[i] = currentOffset;
      currentOffset += getItemHeight(i);
    }
    return { itemOffsets: offsets, totalHeight: currentOffset };
  }, [items, getItemHeight]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    if (onScroll) onScroll(newScrollTop);
  };

  const findStartIndex = () => {
    let low = 0,
      high = items.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const offset = itemOffsets[mid];
      const nextOffset =
        mid < items.length - 1 ? itemOffsets[mid + 1] : totalHeight;

      if (offset <= scrollTop && nextOffset > scrollTop) {
        return mid;
      } else if (offset > scrollTop) {
        high = mid - 1;
      } else {
        low = mid + 1;
      }
    }
    return 0;
  };

  const rawStartIndex = findStartIndex();
  const startIndex = Math.max(0, rawStartIndex - overscan);

  let endIndex = startIndex;
  const bottomScroll = scrollTop + height;
  while (endIndex < items.length && itemOffsets[endIndex] < bottomScroll) {
    endIndex++;
  }
  endIndex = Math.min(items.length, endIndex + overscan);

  const visibleItems = [];
  for (let i = startIndex; i < endIndex; i++) {
    visibleItems.push({
      index: i,
      item: items[i],
      style: {
        position: "absolute",
        top: itemOffsets[i],
        left: 0,
        width: "100%",
        height: getItemHeight(i),
      } as React.CSSProperties,
    });
  }

  return (
    <div
      ref={containerRef}
      className={`overflow-y-auto relative custom-scrollbar ${className}`}
      style={{ height }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {visibleItems.map(({ index, item, style }) => (
          <React.Fragment key={index}>
            {renderItem(item, index, style)}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
