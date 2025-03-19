import React, { useEffect, useRef, memo } from 'react';  
import { Reorder, useDragControls } from 'framer-motion';  
import Box from '@mui/material/Box';  
import Slider from '@mui/material/Slider';  
import './Editor.css';
import { Button } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete'; 
import PropTypes from 'prop-types';
  
const ShotItem = memo(({ shot, handleSliderChange, handleLoadedMetadata, delClick }) => {  
  const videoRef = useRef(null);  
  const dragControls = useDragControls(); // Initialize drag controls  
  
  useEffect(() => {  
    const videoElement = videoRef.current;  
    if (!videoElement) return;
    
    const handleTimeUpdate = () => {  
      if (videoElement.currentTime >= shot.entity.shotEnd) {  
        videoElement.pause();  
      }  
    };
    
    videoElement.addEventListener('timeupdate', handleTimeUpdate);  
    return () => {  
      videoElement.removeEventListener('timeupdate', handleTimeUpdate);  
    };  
  }, [shot.entity.shotEnd]);  
  
  useEffect(() => {  
    const videoElement = videoRef.current;  
    if (videoElement) {  
      videoElement.currentTime = shot.entity.shotStart;  
    }  
  }, [shot.entity.shotStart]);  
  
  // Function to handle slider change that prevents start time from exceeding end time
  const handleSliderChangeWithConstraints = (event, newValue) => {
    // Ensure start time is always less than end time
    const constrainedValue = [
      Math.min(newValue[0], newValue[1] - 0.1), // Ensure start is less than end by at least 0.1
      Math.max(newValue[1], newValue[0] + 0.1)  // Ensure end is greater than start by at least 0.1
    ];
    
    handleSliderChange(shot.id, event, constrainedValue);
  };
  
  return (  
    <Reorder.Item    
      value={shot}    
      className='myItem'    
      key={shot.id}    
      dragListener={false}    
      dragControls={dragControls}    
    >    
      <DeleteIcon  
        className='deleteIcon'
        onClick={() => delClick(shot.id)} 
        style={{ cursor: 'pointer' }}  
        aria-label="Delete"  
      />  
      <div className='videoAndSlider'>  
        <video    
          ref={videoRef}    
          controls    
          className='myVideo'    
          onLoadedMetadata={(e) => handleLoadedMetadata(shot.id, e)}    
          onPointerDown={(event) => dragControls.start(event)}    
        >    
          <source src={shot.video_url} type='video/mp4' />    
          Your browser does not support the video tag.    
        </video>    
        <Box sx={{ width: 300 }}>    
          <Slider    
            value={[shot.entity.shotStart, shot.entity.shotEnd]}    
            valueLabelDisplay="auto"    
            max={shot.entity.duration}    
            onChange={handleSliderChangeWithConstraints}    
            className='mySlider'
            disableSwap={true}
            sx={{
              width: 300,
              color: '#FF4742',
              '& .MuiSlider-thumb': {
                borderRadius: '5px',
                width: '10px',
                height: '21px',
              },
            }}
          />    
        </Box>    
      </div>  
      <div    
        className='myPara'    
        onPointerDown={(event) => dragControls.start(event)}    
      >    
        <p><strong>Headline:</strong> {shot.entity.headline}</p>
        <p><strong>Location:</strong> {shot.entity.located}</p>
        <p><strong>Date:</strong> {shot.entity.date}</p>
        <p><strong>Keyword:</strong> {shot.entity.keyword}</p>
      </div>    
    </Reorder.Item>    
  );  
});

ShotItem.propTypes = {
  shot: PropTypes.shape({
    id: PropTypes.string.isRequired,
    video_url: PropTypes.string.isRequired,
    entity: PropTypes.shape({
      headline: PropTypes.string,
      located: PropTypes.string,
      date: PropTypes.string,
      keyword: PropTypes.string,
      shotStart: PropTypes.number.isRequired,
      shotEnd: PropTypes.number.isRequired,
      duration: PropTypes.number
    }).isRequired
  }).isRequired,
  handleSliderChange: PropTypes.func.isRequired,
  handleLoadedMetadata: PropTypes.func.isRequired,
  delClick: PropTypes.func.isRequired
};

ShotItem.displayName = 'ShotItem';
  
export default ShotItem;  