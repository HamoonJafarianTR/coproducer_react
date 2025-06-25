"use client";

import React from "react";
import { useEditorContext } from "../../contexts/editor-context";

const GUIDE_COLOR = "#FF00FF"; // Magenta for visibility
const GUIDE_THICKNESS = 1;

/**
 * Renders alignment guide lines within the video player based on context state.
 */
export const AlignmentGuides: React.FC = () => {
  const {
    alignmentGuides,
    playerDimensions,
    scale,
    // getAspectRatioDimensions, // Might need this if playerDimensions isn't canvas size
  } = useEditorContext();

  if (
    !alignmentGuides ||
    (!alignmentGuides.horizontal.length && !alignmentGuides.vertical.length)
  ) {
    return null; // No guides to display
  }

  const { width: canvasWidth, height: canvasHeight } = playerDimensions;
  // const { width: canvasWidth, height: canvasHeight } = getAspectRatioDimensions(); // Alternative

  const guideStyle: React.CSSProperties = {
    position: "absolute",
    backgroundColor: GUIDE_COLOR,
    zIndex: 1500, // High z-index to be visible above overlays
    pointerEvents: "none", // Don't interfere with interactions
  };

  const scaledThickness = Math.max(1, GUIDE_THICKNESS / scale); // Ensure minimum 1px thickness

  return (
    <>
      {/* Vertical Guides */}
      {alignmentGuides.vertical.map((xPos: number, index: number) => (
        <div
          key={`v-guide-${index}`}
          style={{
            ...guideStyle,
            left: `${xPos}px`,
            top: 0,
            width: `${scaledThickness}px`,
            height: `${canvasHeight}px`,
          }}
        />
      ))}
      {/* Horizontal Guides */}
      {alignmentGuides.horizontal.map((yPos: number, index: number) => (
        <div
          key={`h-guide-${index}`}
          style={{
            ...guideStyle,
            top: `${yPos}px`,
            left: 0,
            height: `${scaledThickness}px`,
            width: `${canvasWidth}px`,
          }}
        />
      ))}
    </>
  );
};
