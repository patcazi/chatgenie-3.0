import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import ChannelsList from './ChannelsList';
import OnlineUsers from './OnlineUsers';

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for messages in the active channel
  useEffect(() => {
    if (!activeChannel) {
      console.log('No active channel selected');
      return;
    }

    console.log('Setting up message listener for channel:', activeChannel);

    // Use the nested collection path for messages
    const messagesRef = collection(db, `channels/${activeChannel}/messages`);
    const q = query(
      messagesRef,
      orderBy('timestamp', 'asc')
    );

    console.log('Query created:', q);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Snapshot received, document count:', snapshot.size);
      
      const messagesList = snapshot.docs.map(doc => {
        const data = {
          id: doc.id,
          ...doc.data()
        };
        console.log('Message data:', data);
        return data;
      });

      console.log('Final messages list:', messagesList);
      setMessages(messagesList);
    }, (error) => {
      console.error('Error in message listener:', error);
    });

    return () => {
      console.log('Cleaning up message listener');
      unsubscribe();
    };
  }, [activeChannel]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;

    try {
      console.log('Sending text message to channel:', activeChannel);
      
      const messageData = {
        type: 'text',
        text: newMessage,
        timestamp: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName || 'Anonymous'
      };

      console.log('Message data:', messageData);

      const messagesRef = collection(db, `channels/${activeChannel}/messages`);
      const docRef = await addDoc(messagesRef, messageData);
      
      console.log('Message saved successfully with ID:', docRef.id);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChannel) return;

    try {
      console.log('Uploading file:', file.name, 'to channel:', activeChannel);

      // Upload file to Storage
      const storageRef = ref(storage, `channels/${activeChannel}/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log('File uploaded to Storage, URL:', downloadURL);

      // Create a message for the file
      const messageData = {
        type: 'file',
        fileName: file.name,
        fileURL: downloadURL,
        timestamp: serverTimestamp(),
        userId: user.uid,
        userName: user.displayName || 'Anonymous'
      };

      console.log('Creating file message:', messageData);

      const messagesRef = collection(db, `channels/${activeChannel}/messages`);
      const docRef = await addDoc(messagesRef, messageData);

      console.log('File message saved successfully with ID:', docRef.id);

      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('File upload failed:', error);
    }
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.userId === user.uid;
    const messageClass = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`;
    const bubbleClass = `max-w-xs rounded-lg px-4 py-2 ${
      isOwnMessage ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-900'
    }`;

    return (
      <div key={message.id} className={messageClass}>
        <div className={bubbleClass}>
          <p className="text-sm font-medium">{message.userName}</p>
          {message.type === 'file' ? (
            <div>
              <p className="text-sm">
                uploaded: <a 
                  href={message.fileURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`underline ${isOwnMessage ? 'text-white' : 'text-indigo-600'} hover:opacity-80`}
                >
                  {message.fileName}
                </a>
              </p>
            </div>
          ) : (
            <p className="text-sm">{message.text}</p>
          )}
          <p className="text-xs mt-1 opacity-75">
            {message.timestamp?.toDate().toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 flex flex-col">
        <ChannelsList
          currentUser={user}
          activeChannel={activeChannel}
          setActiveChannel={setActiveChannel}
        />
        <OnlineUsers currentUser={user} />
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeChannel ? (
          <>
            {/* Messages Container */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500">No messages yet</p>
                ) : (
                  messages.map(message => renderMessage(message))
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input Area */}
            <div className="p-4 bg-gray-800 border-t border-gray-700">
              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-700 text-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <input
                  type="file"
                  onChange={handleFileUpload}
                  ref={fileInputRef}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="px-4 py-2 bg-gray-700 text-gray-200 rounded-lg hover:bg-gray-600 cursor-pointer flex items-center"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </label>
                <button
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Send
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-white">
            <p className="text-gray-500">Select a channel to start chatting</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat; 