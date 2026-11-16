// Positions depend only on the prefix, so appending images doesn't move earlier pins.
export function masonryLayout(images, width, gap = 10) {
  const columns = Math.max(1, Math.floor((width + gap) / (width < 600 ? 150 : 215)));
  const columnWidth = (width - gap * (columns - 1)) / columns;
  const heights = Array(columns).fill(0);
  const items = images.map(image => {
    const column = heights.indexOf(Math.min(...heights));
    const height = columnWidth * (image.height || 1) / (image.width || 1);
    const position = { id: image.id, left: column * (columnWidth + gap), top: heights[column], width: columnWidth, height };
    heights[column] += height + gap;
    return position;
  });
  return { items, height: Math.max(0, ...heights) - (items.length ? gap : 0), columns };
}
