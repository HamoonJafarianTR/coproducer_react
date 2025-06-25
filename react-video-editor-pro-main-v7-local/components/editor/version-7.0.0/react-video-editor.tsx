"use client";

// UI Components
import { SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "./components/sidebar/app-sidebar";
import { Editor } from "./components/core/editor";
import { SidebarProvider as UISidebarProvider } from "@/components/ui/sidebar";
import { SidebarProvider as EditorSidebarProvider } from "./contexts/sidebar-context";

// Context Providers
import { EditorProvider } from "./contexts/editor-context";

// Custom Hooks
import { useOverlays } from "./hooks/use-overlays";
import { useVideoPlayer } from "./hooks/use-video-player";
import { useTimelineClick } from "./hooks/use-timeline-click";
import { useAspectRatio } from "./hooks/use-aspect-ratio";
import { useCompositionDuration } from "./hooks/use-composition-duration";
import { useHistory } from "./hooks/use-history";
import { useTimelinePositioning } from "./hooks/use-timeline-positioning";
import { useTimeline } from "./contexts/timeline-context";
import { useEditorContext } from "./contexts/editor-context";

// Types
import { Overlay, OverlayType, SoundOverlay, ClipOverlay } from "./types";
import { useRendering } from "./hooks/use-rendering";
import {
  AUTO_SAVE_INTERVAL,
  DEFAULT_OVERLAYS,
  FPS,
  RENDER_TYPE,
} from "./constants";
import { TimelineProvider } from "./contexts/timeline-context";

// Autosave Components
import { AutosaveRecoveryDialog } from "./components/autosave/autosave-recovery-dialog";
import { AutosaveStatus } from "./components/autosave/autosave-status";
import { useState, useEffect } from "react";
import { useAutosave } from "./hooks/use-autosave";
import { LocalMediaProvider, useLocalMedia } from "./contexts/local-media-context";
import { KeyframeProvider } from "./contexts/keyframe-context";
import { AssetLoadingProvider } from "./contexts/asset-loading-context";
import { LocalVideoOverlay } from "./components/local-video-overlay";
import { LocalAudioOverlay } from "./components/local-audio-overlay";
import { LocalMediaPanel } from "./components/overlays/local-media/local-media-panel";

// Function to parse video filename and get timing information
const parseVideoFilename = (filename: string) => {
  try {
    const name = filename.split(".")[0];
    const parts = name.split("_");
    
    // Extract row, start, and end from filename
    const row = parseInt(parts[1]) || 0;
    const start = parseInt(parts[2]) || 0;
    const end = parseInt(parts[3]) || 0;
    
    // Calculate frames (assuming 30fps)
    const from = start * 30;
    const durationInFrames = (end - start) * 30;
    
    console.log("Parsed filename:", { filename, row, start, end, from, durationInFrames });
    
    return { row, from, durationInFrames };
  } catch (error) {
    console.error('Error parsing filename:', filename, error);
    // Return default values if parsing fails
    return { row: 0, from: 0, durationInFrames: 300 };
  }
};

// Function to get video files from shots directory
const getVideoFiles = async () => {
  try {
    console.log("Fetching files from /api/list-shots");
    const response = await fetch('/api/list-shots');
    if (!response.ok) {
      throw new Error('Failed to fetch media files');
    }
    const files = await response.json();
    console.log("Raw files from API:", files);
    
    const videoFiles = files.filter((file: string) => file.toLowerCase().endsWith('.mp4'));
    const audioFiles = files.filter((file: string) => 
      file.toLowerCase().endsWith('.mp3') || 
      file.toLowerCase().endsWith('.wav') || 
      file.toLowerCase().endsWith('.m4a')
    );
    
    console.log("Filtered video files:", videoFiles);
    console.log("Filtered audio files:", audioFiles);
    
    return { videos: videoFiles, audio: audioFiles };
  } catch (error) {
    console.error('Error fetching media files:', error);
    return { videos: [], audio: [] };
  }
};

// Declare global window extension for TypeScript
declare global {
  interface Window {
    __REACT_VIDEO_EDITOR__: {
      editorContext: any;
      localMediaContext: any;
    };
  }
}

// Create a single component for handling both video and audio files
const MediaFilesHandler: React.FC<{
  videoFiles: string[];
  audioFiles: string[];
  parseVideoFilename: (filename: string) => { row: number; from: number; durationInFrames: number };
}> = ({ videoFiles, audioFiles, parseVideoFilename }) => {
  const { addOverlay } = useEditorContext();

  useEffect(() => {
    console.log("Processing media files:", { videoFiles, audioFiles });
    
    // Process video files
    videoFiles.forEach((videoPath) => {
      try {
        const { row, from, durationInFrames } = parseVideoFilename(videoPath);
        console.log("Parsed video file:", { videoPath, row, from, durationInFrames });
        
        const videoFile = {
          type: "video",
          name: videoPath.split('/').pop() || '',
          path: `/shots/${videoPath}`,
          duration: durationInFrames / 30
        };

        const newOverlay: ClipOverlay = {
          id: Date.now(),
          type: OverlayType.VIDEO,
          content: videoFile.name,
          src: videoFile.path,
          from,
          row,
          durationInFrames,
          left: 0,
          top: 0,
          width: 1920,
          height: 1080,
          rotation: 0,
          isDragging: false,
          videoStartTime: 0,
          styles: {
            opacity: 1,
            zIndex: 100,
            transform: "none",
            objectFit: "cover",
          },
        };

        console.log("Adding video overlay:", newOverlay);
        addOverlay(newOverlay);
        console.log("Video overlay added successfully");
      } catch (error) {
        console.error("Error processing video file:", videoPath, error);
      }
    });

    // Process audio files
    audioFiles.forEach((audioPath) => {
      try {
        const { row, from, durationInFrames } = parseVideoFilename(audioPath);
        console.log("Parsed audio file:", { audioPath, row, from, durationInFrames });
        
        const audioFile = {
          type: "audio",
          name: audioPath.split('/').pop() || '',
          path: `/shots/${audioPath}`,
          duration: durationInFrames / 30
        };

        const newOverlay: SoundOverlay = {
          id: Date.now(),
          type: OverlayType.SOUND,
          content: audioFile.name,
          src: audioFile.path,
          from,
          row,
          durationInFrames,
          left: 0,
          top: 0,
          width: 0,
          height: 0,
          rotation: 0,
          isDragging: false,
          styles: {
            volume: 1,
          },
        };

        console.log("Adding audio overlay:", newOverlay);
        addOverlay(newOverlay);
        console.log("Audio overlay added successfully");
      } catch (error) {
        console.error("Error processing audio file:", audioPath, error);
      }
    });
  }, [videoFiles, audioFiles, parseVideoFilename, addOverlay]);

  return null;
};

export default function ReactVideoEditor({ projectId }: { projectId: string }) {
  // Autosave state
  const [showRecoveryDialog, setShowRecoveryDialog] = useState(false);
  const [autosaveTimestamp, setAutosaveTimestamp] = useState<number | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<number | null>(null);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [videoFiles, setVideoFiles] = useState<string[]>([]);
  const [audioFiles, setAudioFiles] = useState<string[]>([]);

  // Overlay management hooks
  const {
    overlays,
    setOverlays,
    selectedOverlayId,
    setSelectedOverlayId,
    changeOverlay,
    addOverlay,
    deleteOverlay,
    duplicateOverlay,
    splitOverlay,
    deleteOverlaysByRow,
    updateOverlayStyles,
    resetOverlays,
  } = useOverlays(DEFAULT_OVERLAYS);

  // Video player controls and state
  const { isPlaying, currentFrame, playerRef, togglePlayPause, formatTime } =
    useVideoPlayer();

  // Composition duration calculations
  const { durationInFrames, durationInSeconds } =
    useCompositionDuration(overlays);

  // Aspect ratio and player dimension management
  const {
    aspectRatio,
    setAspectRatio,
    playerDimensions,
    updatePlayerDimensions,
    getAspectRatioDimensions,
  } = useAspectRatio();

  // Event handlers
  const handleOverlayChange = (updatedOverlay: Overlay) => {
    changeOverlay(updatedOverlay.id, () => updatedOverlay);
  };

  const { width: compositionWidth, height: compositionHeight } =
    getAspectRatioDimensions();

  const handleTimelineClick = useTimelineClick(playerRef, durationInFrames);

  const inputProps = {
    overlays,
    durationInFrames,
    fps: FPS,
    width: compositionWidth,
    height: compositionHeight,
    src: "",
  };


  const { renderMedia, state } = useRendering(
    "TestComponent",
    inputProps,
    RENDER_TYPE
  );
  console.log("inputProps", inputProps);
  const saveOutput = () => {
    // First test the server connection
    return fetch('http://localhost:8080/api/test')
      .then(response => {
        console.log("Test response:", response.status);
        if (!response.ok) {
          throw new Error(`Server test failed: ${response.status}`);
        }
        return response.json();
      })
      .then(testData => {
        console.log("Server test successful:", testData);
        
        // If server test passes, proceed with saving
        console.log("Sending overlays:", inputProps["overlays"]);
        return fetch('http://localhost:8080/api/saveOutput', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ output: inputProps["overlays"] }),
        });
      })
      .then(response => {
        console.log("Save response status:", response.status);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        console.log("Save response:", data);
        return data;
      })
      .catch(error => {
        console.error("Error:", error);
        throw error;
      });
  };

  // Replace history management code with hook
  const { undo, redo, canUndo, canRedo } = useHistory(overlays, setOverlays);

  // Create the editor state object to be saved
  const editorState = {
    overlays,
    aspectRatio,
    playerDimensions,
  };

  // Implment load state
  const { saveState, loadState } = useAutosave(projectId, editorState, {
    interval: AUTO_SAVE_INTERVAL,
    onSave: () => {
      setIsSaving(false);
      setLastSaveTime(Date.now());
    },
    onLoad: (loadedState) => {
      console.log("loadedState", loadedState);
      if (loadedState) {
        // Apply loaded state to editor
        setOverlays(loadedState.overlays || []);
        if (loadedState.aspectRatio) setAspectRatio(loadedState.aspectRatio);
        if (loadedState.playerDimensions)
          updatePlayerDimensions(
            loadedState.playerDimensions.width,
            loadedState.playerDimensions.height
          );
      }
    },
    onAutosaveDetected: (timestamp) => {
      // Only show recovery dialog on initial load, not during an active session
      if (!initialLoadComplete) {
        setAutosaveTimestamp(timestamp);
        setShowRecoveryDialog(true);
      }
    },
  });

  // Mark initial load as complete after component mounts
  useEffect(() => {
    setInitialLoadComplete(true);
  }, []);

  // Add effect to load media files on mount
  useEffect(() => {
    const loadMediaFiles = async () => {
      console.log("Starting to load media files");
      const { videos, audio } = await getVideoFiles();
      console.log("Loaded media files:", { videos, audio });
      setVideoFiles(videos);
      setAudioFiles(audio);
    };
    loadMediaFiles();
  }, []);

  // Handle recovery dialog actions
  const handleRecoverAutosave = async () => {
    const loadedState = await loadState();
    console.log("loadedState", loadedState);
    setShowRecoveryDialog(false);
  };

  const handleDiscardAutosave = () => {
    setShowRecoveryDialog(false);
  };

  // Manual save function for use in keyboard shortcuts or save button
  const handleManualSave = async () => {
    setIsSaving(true);
    await saveState();
  };

  // Set up keyboard shortcut for manual save (Ctrl+S)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleManualSave();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [editorState]);

  // Combine all editor context values
  const editorContextValue = {
    // Overlay management
    overlays,
    setOverlays,
    selectedOverlayId,
    setSelectedOverlayId,
    changeOverlay,
    handleOverlayChange,
    addOverlay,
    deleteOverlay,
    duplicateOverlay,
    splitOverlay,
    resetOverlays,

    // Player controls
    isPlaying,
    currentFrame,
    playerRef,
    togglePlayPause,
    formatTime,
    handleTimelineClick,
    playbackRate,
    setPlaybackRate,

    // Dimensions and duration
    aspectRatio,
    setAspectRatio,
    playerDimensions,
    updatePlayerDimensions,
    getAspectRatioDimensions,
    durationInFrames,
    durationInSeconds,

    // Add renderType to the context
    renderType: RENDER_TYPE,
    renderMedia,
    state,

    deleteOverlaysByRow,

    // History management
    undo,
    redo,
    canUndo,
    canRedo,

    // New style management
    updateOverlayStyles,

    // Autosave
    saveProject: handleManualSave,

    // Save output
    saveOutput,
  };

  // Custom hook to make local media context accessible
  const ExportLocalMediaContext = () => {
    const localMedia = useLocalMedia();
    
    useEffect(() => {
      if (typeof window !== 'undefined') {
        window.__REACT_VIDEO_EDITOR__ = window.__REACT_VIDEO_EDITOR__ || {};
        window.__REACT_VIDEO_EDITOR__.localMediaContext = localMedia;
        window.__REACT_VIDEO_EDITOR__.editorContext = editorContextValue;
      }
    }, [localMedia]);
    
    return null;
  };

  return (
    <UISidebarProvider>
      <EditorSidebarProvider>
        <KeyframeProvider>
          <TimelineProvider>
            <EditorProvider value={editorContextValue}>
              <LocalMediaProvider>
                <ExportLocalMediaContext />
                <AssetLoadingProvider>
                  <AppSidebar />
                  <SidebarInset>
                    <Editor />
                  </SidebarInset>
                  {showRecoveryDialog && autosaveTimestamp !== null && (
                    <AutosaveRecoveryDialog
                      projectId={projectId}
                      timestamp={autosaveTimestamp}
                      onRecover={handleRecoverAutosave}
                      onDiscard={handleDiscardAutosave}
                      onClose={() => setShowRecoveryDialog(false)}
                    />
                  )}
                  <AutosaveStatus
                    isSaving={isSaving}
                    lastSaveTime={lastSaveTime}
                  />
                  <MediaFilesHandler 
                    videoFiles={videoFiles}
                    audioFiles={audioFiles}
                    parseVideoFilename={parseVideoFilename}
                  />
                </AssetLoadingProvider>
              </LocalMediaProvider>
            </EditorProvider>
          </TimelineProvider>
        </KeyframeProvider>
      </EditorSidebarProvider>
    </UISidebarProvider>
  );
}
