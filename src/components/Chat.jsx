import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import EmojiPicker from 'emoji-picker-react';
import ChannelsList from './ChannelsList';
import OnlineUsers from './OnlineUsers';
import PrivateChat from './PrivateChat';

const Chat = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [activeChannel, setActiveChannel] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatContext, setChatContext] = useState('channels'); // 'channels' or 'private'
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const emojiPickerRef = useRef(null);
  const userMenuRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;

    try {
      console.log('Sending text message to channel:', activeChannel);
      
      const messageData = {
        type: 'text',
        text: newMessage.trim(),
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

  const handleLogout = async () => {
    try {
      // Update user's online status in Firestore
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        isOnline: false,
        lastActive: serverTimestamp()
      });

      // Sign out the user
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const renderMessage = (message) => {
    const isOwnMessage = message.userId === user.uid;
    const messageClass = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`;
    const bubbleClass = `max-w-xs rounded-lg px-4 py-3 ${
      isOwnMessage ? 'bg-[#d0eaff] text-gray-900' : 'bg-[#f1f1f1] text-gray-900'
    }`;

    return (
      <div key={message.id} className={messageClass}>
        <div className={bubbleClass}>
          <p className="text-sm font-medium text-gray-700">{message.userName}</p>
          {message.type === 'file' ? (
            <div>
              <p className="text-sm">
                uploaded: <a 
                  href={message.fileURL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-600 hover:text-blue-800"
                >
                  {message.fileName}
                </a>
              </p>
            </div>
          ) : (
            <p className="text-sm">{message.text}</p>
          )}
          <p className="text-xs mt-1 text-gray-500">
            {message.timestamp?.toDate().toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  };

  const handleChannelSelect = (channelId) => {
    setActiveChannel(channelId);
    setSelectedUser(null);
    setChatContext('channels');
  };

  const handleUserSelect = (user) => {
    setSelectedUser(user);
    setActiveChannel(null);
    setChatContext('private');
  };

  const handleBackToChannels = () => {
    setSelectedUser(null);
    setChatContext('channels');
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-[#2c3e50] flex flex-col">
        <div className={`flex-1 ${chatContext === 'private' ? 'hidden md:block' : ''}`}>
          <ChannelsList
            currentUser={user}
            activeChannel={activeChannel}
            setActiveChannel={handleChannelSelect}
          />
        </div>
        <div className={`flex-1 ${chatContext === 'channels' ? 'hidden md:block' : ''}`}>
          <OnlineUsers 
            currentUser={user}
            onUserSelect={handleUserSelect}
            selectedUserId={selectedUser?.id}
          />
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* User Status Bar */}
        <div className="bg-[#2c3e50] px-6 py-3 flex justify-between items-center border-b border-gray-700">
          {chatContext === 'private' && (
            <button
              onClick={handleBackToChannels}
              className="flex items-center text-gray-300 hover:text-white focus:outline-none"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Channels
            </button>
          )}
          <div className="flex-1 flex justify-end">
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 text-gray-300 hover:text-white focus:outline-none"
              >
                <span className="h-2 w-2 bg-green-500 rounded-full"></span>
                <span>{user?.displayName || 'Anonymous'}</span>
                <svg
                  className="h-4 w-4"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path d="M19 9l-7 7-7-7"></path>
                </svg>
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5">
                  <div className="py-1">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Conditional Rendering based on Context */}
        {chatContext === 'channels' ? (
          activeChannel ? (
            <>
              {/* Channel Messages Container */}
              <div className="flex-1 flex flex-col bg-white overflow-hidden">
                <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-500">No messages yet</p>
                  ) : (
                    messages.map(message => renderMessage(message))
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Channel Input Area */}
              <div className="p-6 bg-[#2c3e50] border-t border-gray-700">
                <form onSubmit={handleSendMessage} className="flex space-x-3">
                  <div className="flex-1 relative">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full bg-white text-gray-800 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-300 placeholder-gray-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      😀
                    </button>
                    {showEmojiPicker && (
                      <div
                        ref={emojiPickerRef}
                        className="absolute bottom-full right-0 mb-2"
                      >
                        <EmojiPicker onEmojiClick={handleEmojiClick} />
                      </div>
                    )}
                  </div>
                  <input
                    type="file"
                    onChange={handleFileUpload}
                    ref={fileInputRef}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="px-4 py-3 bg-white text-gray-700 rounded-lg hover:bg-gray-100 cursor-pointer flex items-center border border-gray-300"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                  </label>
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
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
          )
        ) : (
          selectedUser && (
            <PrivateChat
              currentUser={user}
              selectedUser={selectedUser}
              onClose={handleBackToChannels}
              className="flex-1"
            />
          )
        )}
      </div>
    </div>
  );
};

export default Chat; 