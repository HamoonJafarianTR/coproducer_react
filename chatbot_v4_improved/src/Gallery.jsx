import React, { useState, useEffect } from 'react';    
import PropTypes from 'prop-types';
import './Gallery.css';
import CircleLoader from './CircleLoader';
  
function Gallery({ data, selected = [], setSelected }) {    
  const [shots, setShots] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (event) => {
    const index = parseInt(event.target.value);
    if (event.target.checked) {
      setSelected([...selected, shots[index]]);
    } else {
      setSelected(selected.filter((item) => item !== shots[index]));
    }
  };
  
  useEffect(() => {  
    if (!data) return;
    
    const fetchShots = async () => {  
      setIsLoading(true);
      setError(null);
      
      try {  
        const response = await fetch('http://127.0.0.1:8080/api/search', {    
          method: 'POST',    
          headers: {    
            'Content-Type': 'application/json',    
          },    
          body: JSON.stringify({ prompt: data }),    
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        
        const shotsData = await response.json();    
        setShots(shotsData);
        setDataVersion(prevVersion => prevVersion + 1);
      } catch (error) {  
        console.error('Error fetching shots:', error);
        setError('Failed to fetch video shots. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };  
  
    fetchShots();
  }, [data]);
  
  if (!data) {    
    return <div className="Gallery Gallery--empty">Enter a search prompt to find video clips</div>;    
  }
  
  if (isLoading) {
    return (
      <div className="Gallery Gallery--loading">
        <CircleLoader />
        <p>Searching for videos...</p>
      </div>
    );
  }
  
  if (error) {
    return <div className="Gallery Gallery--error">{error}</div>;
  }
  
  if (!shots || shots.length === 0) {  
    return <div className="Gallery Gallery--no-results">No videos found for this search</div>;  
  }
  
  return (      
    <div className="Gallery">     
      {shots.map((shot, index) => (  
        <div className="myItemGallery" key={`${shot.id}-${dataVersion}-${index}`}>
          <input 
            type="checkbox" 
            id={`shot-${index}`} 
            className="myCheckboxGallery" 
            value={index} 
            onChange={handleChange}
            checked={selected.includes(shot)}
          />
          <label htmlFor={`shot-${index}`} className="sr-only">Select video</label>
          <video controls className="myVideoGallery">      
            <source 
              src={`${shot.video_url}#t=${shot.entity.shotStart},${shot.entity.shotEnd}`} 
              type="video/mp4"
            />      
            Your browser does not support the video tag.      
          </video>  
          <div className="myParaGallery"> 
            <p><strong>Headline:</strong> {shot.entity.headline}</p>
            <p><strong>Location:</strong> {shot.entity.located}</p>
            <p><strong>Date:</strong> {shot.entity.date}</p>
            <p><strong>Keyword:</strong> {shot.entity.keyword}</p>
          </div>
        </div>
      ))}  
    </div>    
  );   
}

Gallery.propTypes = {
  data: PropTypes.string,
  selected: PropTypes.array,
  setSelected: PropTypes.func.isRequired
};
        
export default Gallery;  