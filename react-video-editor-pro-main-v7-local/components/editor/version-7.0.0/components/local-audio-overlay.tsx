import React from 'react';
import { useEditorContext } from '../contexts/editor-context';
import { OverlayType, SoundOverlay } from '../types';

interface LocalAudioOverlayProps {
  audioPath: string;
  durationInFrames: number;
  from: number;
  row: number;
}

export const LocalAudioOverlay: React.FC<LocalAudioOverlayProps> = ({
  audioPath,
  durationInFrames,
  from,
  row,
}) => {
  const { addOverlay } = useEditorContext();

  React.useEffect(() => {
    const newOverlay: SoundOverlay = {
      id: Date.now(),
      type: OverlayType.SOUND,
      content: audioPath.split('/').pop() || '',
      src: audioPath,
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

    addOverlay(newOverlay);
  }, [audioPath, durationInFrames, from, row, addOverlay]);

  return null;
}; 