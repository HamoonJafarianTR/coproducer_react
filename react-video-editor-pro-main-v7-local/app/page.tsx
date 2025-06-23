'use client';

import { Button } from "@/components/ui/button";
import Link from "next/link";
import logo from './logo.png';
import './page.css';
import { useState } from 'react'; 
import Chatbot from './Chatbot.jsx';
import Gallery from './Gallery';
import CircleLoader from './CircleLoader';

export default function Home() {
  const [userPrompt, setUserPrompt] = useState(null);
  const [selected, setSelected] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const storeSelectedState = () => {
    if (!selected || selected.length === 0) {
      console.error('No videos selected');
      return Promise.reject('No videos selected');
    }
    
    setIsLoading(true);
    console.log('Selected videos:', selected);
    return fetch('http://localhost:8080/api/downloadVideos', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ shots: selected }),
    })
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      console.log('Success:', data);
      if (data.status === 'success') {
        console.log('Videos downloaded successfully');
        return true;
      }
      throw new Error('Download failed');
    })
    .catch(error => {
      console.error('Error:', error);
      throw error;
    })
    .finally(() => {
      setIsLoading(false);
    });
  };

  return (
    <div id='my_app'>
      <div id='header'>
        <img src={logo.src} alt="Coproducer Logo" width={100}/>
        <h1>Coproducer Demo V1.5</h1>
      </div>
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
        <Link href="/versions/7.0.0" onClick={(e) => {
          e.preventDefault();
          storeSelectedState()
            .then(() => {
              window.location.href = '/versions/7.0.0';
            })
            .catch(error => {
              console.error('Failed to download videos:', error);
              // You might want to show an error message to the user here
            });
        }}>
          <Button 
            size="lg" 
            id='editButton'
            disabled={isLoading}
          >
            {isLoading ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CircleLoader size="1.5rem" />
                <span>Downloading...</span>
              </div>
            ) : (
              'Start Editing'
            )}
          </Button>
        </Link>
    </div>
  );
}
