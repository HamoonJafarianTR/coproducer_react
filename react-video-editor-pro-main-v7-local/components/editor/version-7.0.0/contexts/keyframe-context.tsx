import React, { createContext, useContext, useCallback, useState } from "react";

/**
 * Represents the data structure for keyframe information
 * @interface KeyframeData
 * @property {string[]} frames - Array of keyframe data strings
 * @property {number[]} previewFrames - Array of frame indices used for preview
 * @property {number} lastUpdated - Timestamp of the last update
 */
interface KeyframeData {
  frames: string[];
  previewFrames: number[];
  lastUpdated: number;
}

/**
 * Cache structure mapping overlay IDs to their keyframe data
 * @interface KeyframeCache
 */
interface KeyframeCache {
  [overlayId: number]: KeyframeData;
}

/**
 * Context interface providing methods to manage keyframe data
 * @interface KeyframeContextValue
 */
interface KeyframeContextValue {
  getKeyframes: (overlayId: number) => KeyframeData | null;
  updateKeyframes: (overlayId: number, data: KeyframeData) => void;
  clearKeyframes: (overlayId: number) => void;
  clearAllKeyframes: () => void;
}

/**
 * Context for managing keyframe data across the application
 * Provides functionality to store, retrieve, and clear keyframe information for overlays
 */
const KeyframeContext = createContext<KeyframeContextValue | null>(null);

/**
 * Hook to access the KeyframeContext
 * @throws {Error} If used outside of KeyframeProvider
 * @returns {KeyframeContextValue} The keyframe context value
 */
export const useKeyframeContext = () => {
  const context = useContext(KeyframeContext);
  if (!context) {
    throw new Error(
      "useKeyframeContext must be used within a KeyframeProvider"
    );
  }
  return context;
};

/**
 * Provider component that manages the keyframe cache state
 * Provides methods to interact with keyframe data through context
 * @component
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Child components
 */
export const KeyframeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [cache, setCache] = useState<KeyframeCache>({});

  const getKeyframes = useCallback(
    (overlayId: number) => {
      console.log(
        "[KeyframeContext] Getting keyframes for overlay:",
        overlayId,
        "Cache state:",
        cache
      );
      return cache[overlayId] || null;
    },
    [cache]
  );

  const updateKeyframes = useCallback(
    (overlayId: number, data: KeyframeData) => {
      console.log(
        "[KeyframeContext] Updating keyframes for overlay:",
        overlayId,
        "New data:",
        {
          framesCount: data.frames.length,
          previewFrames: data.previewFrames,
          lastUpdated: data.lastUpdated,
        }
      );
      setCache((prev) => {
        const newCache = {
          ...prev,
          [overlayId]: {
            ...data,
            lastUpdated: Date.now(),
          },
        };
        console.log("[KeyframeContext] New cache state:", newCache);
        return newCache;
      });
    },
    []
  );

  const clearKeyframes = useCallback((overlayId: number) => {
    console.log("[KeyframeContext] Clearing keyframes for overlay:", overlayId);
    setCache((prev) => {
      const newCache = { ...prev };
      delete newCache[overlayId];
      console.log("[KeyframeContext] Cache state after clear:", newCache);
      return newCache;
    });
  }, []);

  const clearAllKeyframes = useCallback(() => {
    console.log("[KeyframeContext] Clearing all keyframes");
    setCache({});
  }, []);

  return (
    <KeyframeContext.Provider
      value={{
        getKeyframes,
        updateKeyframes,
        clearKeyframes,
        clearAllKeyframes,
      }}
    >
      {children}
    </KeyframeContext.Provider>
  );
};
