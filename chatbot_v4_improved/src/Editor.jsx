import React, { useState } from 'react';    
import { Reorder } from 'framer-motion';  
import PropTypes from 'prop-types';
import './Editor.css';  
import CircleLoader from './CircleLoader';  
import ShotItem from './ShotItem'; // Import the ShotItem component  
import { div } from 'framer-motion/client';
  
function Editor({ selected }) {  
  const [shots, setShots] = useState(selected);  
  const [outputVideo, setOutputVideo] = useState(null);  
  const [videoDescription, setVideoDescription] = useState(null);
  const [isLoading, setIsLoading] = useState(false); 

  // useEffect(() => {
  //   console.log("shots", shots);
  // },[shots]);
  
  const handleDeleteShot = (shotId) => {
    setShots((prevShots) => prevShots.filter((shot) => shot.id !== shotId));
  };
  
  const handleSliderChange = (shotId, _, newValue) => {  
    setShots((prevShots) => prevShots.map((shot) => {  
      if (shot.id !== shotId) return shot;  
      
      return {  
        ...shot,  
        entity: {  
          ...shot.entity,  
          shotStart: newValue[0],  
          shotEnd: newValue[1],  
        },  
      };  
    }));  
  };  
  
  const handleLoadedMetadata = (shotId, event) => {  
    const duration = event.target.duration;  
    setShots((prevShots) => prevShots.map((shot) => {  
      if (shot.id !== shotId) return shot;  
      
      return {  
        ...shot,  
        entity: {  
          ...shot.entity,  
          duration: duration  
        },  
      };  
    }));  
  };  
  
  const handleRenderVideo = async () => {  
    setIsLoading(true);  
    
    try {  
      const response = await fetch('http://127.0.0.1:8080/api/videoEdit', {  
        method: 'POST',  
        headers: {  
          'Content-Type': 'application/json',  
        },  
        body: JSON.stringify({ shots }),  
      });  
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const result = await response.json();  
      setOutputVideo(result.output_key);  
      setVideoDescription(result.description);
    } catch (error) {  
      console.error('Error rendering video:', error);  
      // Could add user-facing error handling here
    } finally {
      setIsLoading(false);  
    }
  };  
  
  return (  
    <div id='editor'>  
      <Reorder.Group id="shots" values={shots} onReorder={setShots}>  
        {shots.map((shot) => (  
          <ShotItem  
            key={shot.id}  
            shot={shot}  
            handleSliderChange={handleSliderChange}  
            handleLoadedMetadata={handleLoadedMetadata}  
            delClick={handleDeleteShot}
          />  
        ))}  
      </Reorder.Group>  
      <div id='preview'>  
        {isLoading ? (  
          <div id="loader">  
            <h1>Rendering...</h1>  
            <CircleLoader />  
          </div>  
        ) : outputVideo ? (  
          <div className='fOutput'>
            <video controls className='fVideo'>  
              <source src={outputVideo} type='video/mp4' />  
              Your browser does not support the video tag.  
            </video>  
            {videoDescription && (
              <p className='fPara'>{videoDescription}</p>
            )}
          </div>
        ) : null}  
      </div>  
      <div id='btn'>  
        <button 
          className='button-24' 
          onClick={handleRenderVideo}
          disabled={isLoading || shots.length === 0}
        >
          {isLoading ? 'Rendering...' : 'Preview'}
        </button>  
      </div>  
    </div>  
  );  
}  

Editor.propTypes = {
  selected: PropTypes.array.isRequired
};
  
export default Editor;  