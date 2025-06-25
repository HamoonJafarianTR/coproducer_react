"use client";

import { useEffect, useState } from "react";
import { useEditorContext } from "../contexts/editor-context";
import { OverlayType, ClipOverlay } from "../types";
import { getVideoUrl, checkVideo } from "../utils/video-helper";

interface DirectVideoUploadProps {
  videoPath: string;
}

/**
 * DirectVideoUpload component
 * 
 * This component adds a video directly to the timeline without going through the media library.
 * It's a simpler approach that might work better in some cases.
 */
export const DirectVideoUpload: React.FC<DirectVideoUploadProps> = ({ videoPath }) => {
  const { addOverlay, getAspectRatioDimensions } = useEditorContext();
  const [isAdded, setIsAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isAdded || error) return;
    
    // Check if we've already added this video in this session
    const sessionKey = `direct_video_${videoPath}`;
    if (localStorage.getItem(sessionKey)) {
      console.log(`Video ${videoPath} was already added in this session.`);
      setIsAdded(true);
      return;
    }

    const addVideoToTimeline = async () => {
      try {
        console.log(`Attempting to directly add video: ${videoPath}`);
        // Wait for editor to initialize
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Get the absolute URL
        const absoluteVideoPath = getVideoUrl(videoPath);
        console.log(`Absolute video path: ${absoluteVideoPath}`);
        
        // Check if the video is valid and get its duration
        const videoCheck = await checkVideo(absoluteVideoPath);
        if (!videoCheck.valid) {
          throw new Error(`Video check failed: ${videoCheck.error}`);
        }
        
        console.log(`Video is valid, duration: ${videoCheck.duration}s`);
        
        // Generate a simple thumbnail canvas
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');
        
        // Just create a placeholder thumbnail
        if (ctx) {
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#ffffff';
          ctx.font = '14px Arial';
          ctx.fillText('Video', 140, 90);
        }
        
        const thumbnailDataURL = canvas.toDataURL('image/jpeg');
        
        // Get dimensions based on current aspect ratio
        const { width, height } = getAspectRatioDimensions();
        
        // Create overlay directly with validated duration
        const newOverlay: ClipOverlay = {
          left: 0,
          top: 0,
          width,
          height,
          durationInFrames: Math.round((videoCheck.duration || 10) * 30), // 30 fps
          from: 0,
          id: Date.now(),
          rotation: 0,
          row: 0,
          isDragging: false,
          type: OverlayType.VIDEO,
          content: thumbnailDataURL,
          src: absoluteVideoPath, // Use the absolute path
          videoStartTime: 0,
          styles: {
            opacity: 1,
            zIndex: 100,
            transform: "none",
            objectFit: "cover",
          }
        };
        
        console.log('Adding video directly to timeline:', newOverlay);
        addOverlay(newOverlay);
        setIsAdded(true);
        
        // Mark as added in this session
        localStorage.setItem(sessionKey, 'true');
        
        console.log('Video successfully added directly to timeline');
      } catch (e) {
        console.error('Failed to add video directly:', e);
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    };
    
    addVideoToTimeline();
  }, [videoPath, addOverlay, getAspectRatioDimensions, isAdded, error]);
  
  // This component will render an error message if there's an issue
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
        <strong>Direct Video Upload Error:</strong>
        <div>{error}</div>
      </div>
    );
  }
  
  return null;
}; 