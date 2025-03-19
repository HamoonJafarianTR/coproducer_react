import './App.css'
import Chatbot from './Chatbot';
import Gallery from './Gallery';
import React, { useState } from 'react';  
import Editor from './Editor';
import logo from './logo.png';

function App() {
  const [userPrompt, setUserPrompt] = useState(null);
  const [selected, setSelected] = useState([]);
  const [showChatbotGallery, setShowChatbotGallery] = useState(true);
  
  function handleClick() {
    setShowChatbotGallery(false);
  }

  return (
    <div id='my_app'>
      <div id='header'>
        <img src={logo} alt="Coproducer Logo" width={100}/>
        <h1>Coproducer Demo</h1>
      </div>
      
      {showChatbotGallery ? (
        <>
          <div id='chatbot'>
            <Chatbot setUserPrompt={setUserPrompt}/>
          </div>
          
          <div id='gallery'> 
            <Gallery 
              data={userPrompt}
              selected={selected}
              setSelected={setSelected}
            />
          </div>
          
          <div id='editButton'>
            <button className="button-24" onClick={handleClick}>Video Editor</button>
          </div>
        </>
      ) : (
        <div id='my_editor'>
          <Editor selected={selected}/>
        </div>
      )}
    </div>
  )
}

export default App