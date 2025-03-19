import React, { useEffect, useRef } from 'react';
import CreativeEditorSDK from '@cesdk/cesdk-js';

const VideoEditor = () => {
  const containerRef = useRef(null);

  useEffect(() => {
    const initializeEditor = async () => {
      const config = {
        license: '5s7uR_lAEfMuD-LAZ-9SYcr7yBLM2Nwg4-aQDjGD4KNV0KqB3sEu51PtthUqG756',
        userId: 'guides-user',
        theme: 'light',
        baseURL: 'https://cdn.img.ly/packages/imgly/cesdk-js/1.44.0/assets',
        ui: {
          elements: {
            view: 'default',
            panels: {
              settings: true
            },
            navigation: {
              position: 'top',
              action: {
                save: true,
                load: true,
                download: true,
                export: true
              }
            },
          }
        },
        callbacks: {
          onUpload: 'local',
          onSave: (scene) => {
            const element = document.createElement('a');
            const base64Data = btoa(unescape(encodeURIComponent(scene)));
            element.setAttribute(
              'href',
              `data:application/octet-stream;base64,${base64Data}`
            );
            element.setAttribute(
              'download',
              `cesdk-${new Date().toISOString()}.scene`
            );

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();

            document.body.removeChild(element);
          },
          onLoad: 'upload',
          onDownload: 'download',
          onExport: 'download'
        }
      };

      try {
        const cesdk = await CreativeEditorSDK.create(containerRef.current, config);
        cesdk.addDefaultAssetSources();
        cesdk.addDemoAssetSources({ sceneMode: 'Video' });
        cesdk.ui.setBackgroundTrackAssetLibraryEntries(['ly.img.image', 'ly.img.video']);
        await cesdk.createVideoScene();
      } catch (error) {
        console.error('Error initializing editor:', error);
      }
    };

    initializeEditor();
  }, []);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100vh' }} 
    />
  );
};

export default VideoEditor;