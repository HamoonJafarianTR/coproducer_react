/**
 * Video Helper Utility
 * 
 * Provides utility functions for working with videos in the editor
 */

/**
 * Gets the absolute URL for a video path
 * 
 * @param path - The video path
 * @returns The absolute URL
 */
export const getVideoUrl = (path: string): string => {
  // If already an absolute URL, return as is
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  
  // If we're in the browser, convert to absolute URL
  if (typeof window !== 'undefined') {
    if (path.startsWith('/')) {
      return `${window.location.origin}${path}`;
    } else {
      return `${window.location.origin}/${path}`;
    }
  }
  
  // Return the original path if not in browser
  return path;
};

/**
 * Checks if a video is valid and loads properly
 * 
 * @param path - The video path or URL
 * @returns A promise that resolves to { valid: boolean, duration?: number, error?: string }
 */
export const checkVideo = async (path: string): Promise<{ 
  valid: boolean;
  duration?: number;
  error?: string;
}> => {
  try {
    const videoUrl = getVideoUrl(path);
    console.log(`Checking video at: ${videoUrl}`);
    
    // Create a video element to test with
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = videoUrl;
    
    // Wait for metadata to load
    const result = await new Promise<{ valid: boolean; duration?: number; error?: string }>((resolve) => {
      let timeoutId: NodeJS.Timeout;
      
      // Handle successful metadata load
      video.onloadedmetadata = () => {
        clearTimeout(timeoutId);
        resolve({ 
          valid: true, 
          duration: video.duration
        });
      };
      
      // Handle errors
      video.onerror = () => {
        clearTimeout(timeoutId);
        resolve({ 
          valid: false, 
          error: `Error code: ${video.error?.code || 'unknown'}, message: ${video.error?.message || 'unknown error'}`
        });
      };
      
      // Set timeout for loading
      timeoutId = setTimeout(() => {
        resolve({ valid: false, error: 'Video load timed out' });
      }, 10000);
    });
    
    return result;
  } catch (e) {
    return { 
      valid: false, 
      error: e instanceof Error ? e.message : 'Unknown error checking video'
    };
  }
}; 