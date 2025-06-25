import { Overlay } from "../types";

// Threshold in pixels for snapping
const SNAP_THRESHOLD = 5;

interface AlignmentGuides {
  horizontal: number[];
  vertical: number[];
}

interface BoundingBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  centerX: number;
  centerY: number;
  width: number;
  height: number;
}

// Helper to get the bounding box of an overlay
const getBoundingBox = (overlay: Overlay): BoundingBox => {
  const right = overlay.left + overlay.width;
  const bottom = overlay.top + overlay.height;
  const centerX = overlay.left + overlay.width / 2;
  const centerY = overlay.top + overlay.height / 2;
  return {
    left: overlay.left,
    top: overlay.top,
    right,
    bottom,
    centerX,
    centerY,
    width: overlay.width,
    height: overlay.height,
  };
};

/**
 * Calculates alignment guides based on the position of a moving overlay
 * relative to other overlays and the canvas boundaries.
 *
 * @param movingOverlay The overlay currently being moved or resized.
 * @param otherOverlays An array of all other overlays on the canvas.
 * @param canvasWidth The width of the editor canvas.
 * @param canvasHeight The height of the editor canvas.
 * @param threshold The pixel distance within which alignment should occur.
 * @returns An object containing arrays of horizontal and vertical guide positions.
 */
export const calculateAlignmentGuides = (
  movingOverlay: Overlay,
  otherOverlays: Overlay[],
  canvasWidth: number,
  canvasHeight: number,
  threshold: number = SNAP_THRESHOLD
): AlignmentGuides => {
  const guides: AlignmentGuides = { horizontal: [], vertical: [] };
  const movingBox = getBoundingBox(movingOverlay);

  // Define potential alignment targets for the canvas
  const canvasTargets = {
    vertical: [0, canvasWidth / 2, canvasWidth],
    horizontal: [0, canvasHeight / 2, canvasHeight],
  };

  // Check against canvas boundaries and center
  canvasTargets.vertical.forEach((targetX) => {
    if (Math.abs(movingBox.left - targetX) <= threshold)
      guides.vertical.push(targetX);
    if (Math.abs(movingBox.centerX - targetX) <= threshold)
      guides.vertical.push(targetX);
    if (Math.abs(movingBox.right - targetX) <= threshold)
      guides.vertical.push(targetX);
  });
  canvasTargets.horizontal.forEach((targetY) => {
    if (Math.abs(movingBox.top - targetY) <= threshold)
      guides.horizontal.push(targetY);
    if (Math.abs(movingBox.centerY - targetY) <= threshold)
      guides.horizontal.push(targetY);
    if (Math.abs(movingBox.bottom - targetY) <= threshold)
      guides.horizontal.push(targetY);
  });

  // Check against other overlays
  otherOverlays.forEach((other) => {
    if (other.id === movingOverlay.id) return; // Skip self comparison
    const otherBox = getBoundingBox(other);

    // Potential vertical targets from the other overlay
    const verticalTargets = [otherBox.left, otherBox.centerX, otherBox.right];
    verticalTargets.forEach((targetX) => {
      if (Math.abs(movingBox.left - targetX) <= threshold)
        guides.vertical.push(targetX);
      if (Math.abs(movingBox.centerX - targetX) <= threshold)
        guides.vertical.push(targetX);
      if (Math.abs(movingBox.right - targetX) <= threshold)
        guides.vertical.push(targetX);
    });

    // Potential horizontal targets from the other overlay
    const horizontalTargets = [otherBox.top, otherBox.centerY, otherBox.bottom];
    horizontalTargets.forEach((targetY) => {
      if (Math.abs(movingBox.top - targetY) <= threshold)
        guides.horizontal.push(targetY);
      if (Math.abs(movingBox.centerY - targetY) <= threshold)
        guides.horizontal.push(targetY);
      if (Math.abs(movingBox.bottom - targetY) <= threshold)
        guides.horizontal.push(targetY);
    });
  });

  // Remove duplicate guide lines
  guides.horizontal = Array.from(new Set(guides.horizontal));
  guides.vertical = Array.from(new Set(guides.vertical));

  return guides;
};

/**
 * Adjusts the position and/or dimensions of a moving overlay to snap it to
 * the nearest alignment guides.
 *
 * @param movingOverlay The overlay being moved or resized.
 * @param guides The calculated alignment guides.
 * @param isResizing Indicates if the overlay is being resized (affects snapping behavior).
 * @param resizeType The type of resize handle being used (optional, for resizing).
 * @param threshold The pixel distance for snapping.
 * @returns A partially updated Overlay object with snapped position/dimensions.
 */
export const snapToBounds = (
  movingOverlay: Partial<Overlay> & { id: number }, // Use partial as position/size might be changing
  guides: AlignmentGuides,
  isDragging: boolean = false,
  isResizing: boolean = false,
  resizeType?: "top-left" | "top-right" | "bottom-left" | "bottom-right",
  threshold: number = SNAP_THRESHOLD
): Partial<Overlay> => {
  const snappedChanges: Partial<Overlay> = {};
  if (
    !movingOverlay.left ||
    !movingOverlay.top ||
    !movingOverlay.width ||
    !movingOverlay.height
  ) {
    // Cannot snap if essential properties are missing
    return {};
  }

  const movingBox = getBoundingBox(movingOverlay as Overlay); // Cast needed after check

  let bestSnapX: { target: number; diff: number } | null = null;
  let bestSnapY: { target: number; diff: number } | null = null;

  // --- Vertical Snapping ---
  guides.vertical.forEach((targetX) => {
    const diffs: { diff: number }[] = [
      { diff: movingBox.left - targetX },
      { diff: movingBox.centerX - targetX },
      { diff: movingBox.right - targetX },
    ];

    diffs.forEach(({ diff }) => {
      if (Math.abs(diff) <= threshold) {
        if (!bestSnapX) {
          // First potential snap
          bestSnapX = { target: targetX, diff: diff };
        } else if (Math.abs(diff) < Math.abs(bestSnapX!.diff)) {
          // Better snap found
          bestSnapX = { target: targetX, diff: diff };
        }
      }
    });
  });

  // --- Horizontal Snapping ---
  guides.horizontal.forEach((targetY) => {
    const diffs: { diff: number }[] = [
      { diff: movingBox.top - targetY },
      { diff: movingBox.centerY - targetY },
      { diff: movingBox.bottom - targetY },
    ];

    diffs.forEach(({ diff }) => {
      if (Math.abs(diff) <= threshold) {
        if (!bestSnapY) {
          // First potential snap
          bestSnapY = { target: targetY, diff: diff };
        } else if (Math.abs(diff) < Math.abs(bestSnapY!.diff)) {
          // Better snap found
          bestSnapY = { target: targetY, diff: diff };
        }
      }
    });
  });

  // Apply Snapping based on interaction type
  if (isDragging) {
    if (bestSnapX) snappedChanges.left = movingBox.left - bestSnapX!.diff;
    if (bestSnapY) snappedChanges.top = movingBox.top - bestSnapY!.diff;
  } else if (isResizing && resizeType) {
    const isLeftHandle = resizeType.includes("left");
    const isTopHandle = resizeType.includes("top");

    if (bestSnapX) {
      if (isLeftHandle) {
        const newLeft = movingBox.left - bestSnapX!.diff;
        const deltaX = newLeft - movingBox.left;
        snappedChanges.left = newLeft;
        snappedChanges.width = Math.max(1, movingBox.width - deltaX); // Prevent negative width
      } else {
        // Right handle
        const newRight = movingBox.right - bestSnapX!.diff;
        snappedChanges.width = Math.max(1, newRight - movingBox.left); // Prevent negative width
      }
    }

    if (bestSnapY) {
      if (isTopHandle) {
        const newTop = movingBox.top - bestSnapY!.diff;
        const deltaY = newTop - movingBox.top;
        snappedChanges.top = newTop;
        snappedChanges.height = Math.max(1, movingBox.height - deltaY); // Prevent negative height
      } else {
        // Bottom handle
        const newBottom = movingBox.bottom - bestSnapY!.diff;
        snappedChanges.height = Math.max(1, newBottom - movingBox.top); // Prevent negative height
      }
    }
  }

  return snappedChanges;
};
