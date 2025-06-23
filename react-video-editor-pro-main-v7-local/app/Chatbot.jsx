import { useState } from 'react'
import PropTypes from 'prop-types'
import '@chatscope/chat-ui-kit-styles/dist/default/styles.min.css';
import { MainContainer, ChatContainer, MessageList, Message, MessageInput, TypingIndicator } from '@chatscope/chat-ui-kit-react';
import './Chatbot.css'; 


function Chatbot({ setUserPrompt }) {
  const [messages, setMessages] = useState([
    {
      message: "Hello, I'm Coproducer assistant! Ask me anything!",
      sender: "ChatGPT",
      direction: "incoming"
    }
  ])
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);

  const handleSend = async (message) => {
    const newMessage = {
      message,
      sender: "user",
      direction: 'outgoing'
    };
  
    setMessages(prevMessages => [...prevMessages, newMessage]);
    await processMessageToChatGPT(message);
  };

  async function processMessageToChatGPT(userMessage) {
    setIsTyping(true);
    setError(null);
    
    const chatMessages = [...messages, { message: userMessage, sender: 'user' }];
    
    const apiMessages = chatMessages.map(messageObj => ({
      role: messageObj.sender === "ChatGPT" ? "assistant" : "user",
      content: messageObj.message
    }));

    try {
      const response = await fetch('http://127.0.0.1:8080/api/chat', {  
        method: 'POST',  
        headers: {  
          'Content-Type': 'application/json',  
        },  
        body: JSON.stringify({ chatHistory: apiMessages }),  
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Pass the data up to the parent component  
      setUserPrompt(data.content);
      
      const botMessage = {
        message: `Here are some video shots about ${data.content}`,
        sender: "ChatGPT",
        direction: "incoming"
      };
      
      setMessages(prevMessages => [...prevMessages, botMessage]);
    } catch (error) {
      console.error('Error processing message:', error);
      setError('Failed to process your message. Please try again.');
      
      const errorMessage = {
        message: "Sorry, I'm having trouble processing your request. Please try again.",
        sender: "ChatGPT",
        direction: "incoming"
      };
      
      setMessages(prevMessages => [...prevMessages, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  }

  return (
    <div className="Chatbot">
      <div style={{ position:"relative", height: "80vh", width: "100%"  }}>
        <MainContainer>
          <ChatContainer>       
            <MessageList 
              scrollBehavior="smooth" 
            >
              {messages.map((message, i) => {
                return <Message key={i} model={message} />
              })}
              {isTyping && <TypingIndicator content="AI is thinking" />}
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}
            </MessageList>
            <MessageInput placeholder="Type message here" onSend={handleSend} disabled={isTyping} />        
          </ChatContainer>
        </MainContainer>
      </div>
    </div>
  )
}

Chatbot.propTypes = {
  setUserPrompt: PropTypes.func.isRequired
};

export default Chatbot