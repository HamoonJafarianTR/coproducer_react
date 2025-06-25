"use client";

import { useEffect, useState } from "react";
import { useLocalMedia } from "../contexts/local-media-context";
import { useEditorContext } from "../contexts/editor-context";
import { OverlayType, ClipOverlay } from "../types";

interface AutoUploadVideoProps {
  videoPath: string;
}

/**
 * AutoUploadVideo component
 * 
 * This component automatically uploads a video file to the timeline when mounted.
 * It handles the loading, conversion, and adding to the timeline in one place.
 * Uses localStorage to ensure the video is only uploaded once per session.
 */
export const AutoUploadVideo: React.FC<AutoUploadVideoProps> = ({ videoPath }) => {
  const { addMediaFile } = useLocalMedia();
  const { addOverlay, getAspectRatioDimensions } = useEditorContext();
  const [isUploaded, setIsUploaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pre-check video file validity
  useEffect(() => {
    const validateVideo = async () => {
      try {
        const video = document.createElement('video');
        video.src = videoPath;
        
        // Check if video loads properly
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            console.log(`Video metadata loaded successfully: Duration ${video.duration}s`);
            resolve();
          };
          
          video.onerror = (e) => {
            reject(new Error(`Video failed to load: ${video.error?.message || 'Unknown error'}`));
          };
          
          // Set timeout for loading
          const timeout = setTimeout(() => {
            reject(new Error('Video load timed out'));
          }, 5000);
          
          // Cleanup on success
          video.onloadedmetadata = () => {
            clearTimeout(timeout);
            resolve();
          };
        });
      } catch (err: any) {
        console.error('Video validation failed:', err);
        setError(`Could not validate video: ${err.message}`);
      }
    };
    
    validateVideo();
  }, [videoPath]);

  useEffect(() => {
    if (isUploaded || error) return;
    
    // Check if this video was already uploaded in this session
    const sessionKey = `video_uploaded_${videoPath}`;
    const wasUploaded = localStorage.getItem(sessionKey);
    
    if (wasUploaded) {
      console.log(`Video ${videoPath} was already uploaded in this session.`);
      setIsUploaded(true);
      return;
    }

    const uploadVideoToTimeline = async () => {
      try {
        console.log(`Attempting to load video from: ${videoPath}`);
        // Give the editor time to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Fetch the video file from the public directory
        const response = await fetch(videoPath);
        if (!response.ok) {
          throw new Error(`Failed to load video from ${videoPath}: ${response.status} ${response.statusText}`);
        }
        
        // Convert to a File object
        const blob = await response.blob();
        const fileName = videoPath.split('/').pop() || 'video.mp4';
        console.log(`Blob type: ${blob.type}, size: ${blob.size} bytes`);
        
        // Fix the MIME type if needed
        const contentType = blob.type || 'video/mp4';
        const file = new File([blob], fileName, { type: contentType });
        
        console.log(`Video loaded successfully, adding to media library: ${fileName}`);
        
        // Add to media library - more robust error handling
        let mediaFile;
        try {
          mediaFile = await addMediaFile(file);
          if (!mediaFile) {
            throw new Error('Media file upload returned null');
          }
          console.log('Media file successfully added:', mediaFile);
        } catch (uploadError) {
          console.error('Error in addMediaFile:', uploadError);
          throw new Error(`Failed to add media file to library: ${uploadError instanceof Error ? uploadError.message : 'Unknown error'}`);
        }
        
        console.log('Media file added to library, adding to timeline');
        
        // Get dimensions based on current aspect ratio
        const { width, height } = getAspectRatioDimensions();
        
        // Create a properly typed video overlay for the timeline
        const newOverlay: ClipOverlay = {
          left: 0,
          top: 0,
          width,
          height,
          durationInFrames: mediaFile.duration ? Math.round(mediaFile.duration * 30) : 200,
          from: 0,
          id: Date.now(),
          rotation: 0,
          row: 0,
          isDragging: false,
          type: OverlayType.VIDEO,
          content: mediaFile.thumbnail || "",
          src: mediaFile.path,
          videoStartTime: 0,
          styles: {
            opacity: 1,
            zIndex: 100,
            transform: "none",
            objectFit: "cover",
          }
        };
        
        // Add to timeline
        try {
          addOverlay(newOverlay);
          console.log('Video overlay added to timeline:', newOverlay);
        } catch (overlayError) {
          console.error('Error adding overlay:', overlayError);
          throw new Error(`Failed to add overlay to timeline: ${overlayError instanceof Error ? overlayError.message : 'Unknown error'}`);
        }
        
        setIsUploaded(true);
        
        // Mark this video as uploaded in this session
        localStorage.setItem(sessionKey, 'true');
        
        console.log('Video successfully added to timeline');
      } catch (error) {
        console.error('Failed to auto-upload video:', error);
        setError(error instanceof Error ? error.message : 'Unknown error during upload');
      }
    };
    
    uploadVideoToTimeline();
  }, [videoPath, addMediaFile, addOverlay, getAspectRatioDimensions, isUploaded, error]);
  
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
        <strong>Video Upload Error:</strong>
        <div>{error}</div>
      </div>
    );
  }
  
  return null;
}; 