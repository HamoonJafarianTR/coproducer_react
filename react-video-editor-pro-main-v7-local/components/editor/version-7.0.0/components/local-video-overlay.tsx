"use client";

import { useEffect, useState } from "react";
import { useEditorContext } from "../contexts/editor-context";
import { OverlayType, ClipOverlay } from "../types";

interface LocalVideoOverlayProps {
  videoPath: string;
  durationInFrames?: number;
  from?: number;
  row?: number;
}

/**
 * A component that directly adds a local video file to the timeline
 * without relying on media library, uploads, or API endpoints.
 * 
 * This is the simplest approach for debugging video playback issues.
 */
export const LocalVideoOverlay: React.FC<LocalVideoOverlayProps> = ({ 
  videoPath,
  durationInFrames = 300, // Default if not provided
  from = 0, // Default if not provided
  row = 0, // Default if not provided
 }) => {
  const { addOverlay, getAspectRatioDimensions } = useEditorContext();
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (added || error) return;
    
    // Check for localStorage support
    let hasBeenAdded = false;
    try {
      const key = `local_video_${videoPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
      hasBeenAdded = localStorage.getItem(key) === 'true';
      
      if (hasBeenAdded) {
        console.log(`Video already added in this session: ${videoPath}`);
        setAdded(true);
        return;
      }
    } catch (e) {
      // Ignore localStorage errors
      console.warn('Could not access localStorage:', e);
    }
    
    // Add a short delay to ensure editor is fully loaded
    const timer = setTimeout(() => {
      try {
        console.log(`Adding direct video overlay for: ${videoPath}`);
        
        // Get dimensions for the current aspect ratio
        const { width, height } = getAspectRatioDimensions();
        
        // Create a simple overlay with the video path
        const overlay: ClipOverlay = {
          id: Date.now(),
          type: OverlayType.VIDEO,
          durationInFrames: durationInFrames, // Arbitrary duration, 10 seconds at 30fps
          from: from,
          width,
          height,
          left: 0,
          top: 0,
          row: row,
          rotation: 0,
          isDragging: false,
          content: "Local Video File",
          src: videoPath,
          videoStartTime: 0,
          styles: {
            opacity: 1,
            zIndex: 100,
            transform: "none",
            objectFit: "contain", // Use contain to ensure whole video is visible
          }
        };
        
        // Add the overlay to the timeline
        addOverlay(overlay);
        setAdded(true);
        
        // Mark as added if localStorage is available
        try {
          const key = `local_video_${videoPath.replace(/[^a-zA-Z0-9]/g, '_')}`;
          localStorage.setItem(key, 'true');
        } catch (e) {
          // Ignore localStorage errors
          console.warn('Could not write to localStorage:', e);
        }
        
        console.log("Local video added directly to timeline:", overlay);
      } catch (e) {
        console.error("Error adding local video:", e);
        setError(e instanceof Error ? e.message : "Unknown error");
      }
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [videoPath, addOverlay, getAspectRatioDimensions, added, error]);
  
  // Display error message if there's an issue
  if (error) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        backgroundColor: 'rgba(255, 0, 0, 0.1)',
        borderLeft: '4px solid red',
        padding: '10px',
        maxWidth: '300px',
        zIndex: 9999,
        fontFamily: 'system-ui',
        fontSize: '14px',
        color: 'white'
      }}>
        <strong>Local Video Error:</strong>
        <div>{error}</div>
      </div>
    );
  }
  
  return null;
}; 