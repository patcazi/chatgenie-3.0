import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ChannelsList from './ChannelsList';
import OnlineUsers from './OnlineUsers';
import EmojiPicker from 'emoji-picker-react';

const Chat = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeChannel, setActiveChannel] = useState(null);
  const [activeChannelName, setActiveChannelName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

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

  // Fetch channel name when active channel changes
  useEffect(() => {
    const fetchChannelName = async () => {
      if (!activeChannel) {
        setActiveChannelName('');
        return;
      }

      try {
        const channelDoc = await getDoc(doc(db, 'channels', activeChannel));
        if (channelDoc.exists()) {
          setActiveChannelName(channelDoc.data().channelName);
        }
      } catch (error) {
        console.error('Error fetching channel name:', error);
      }
    };

    fetchChannelName();
  }, [activeChannel]);

  // Listen for messages in the active channel
  useEffect(() => {
    if (!activeChannel) return;

    const q = query(
      collection(db, `channels/${activeChannel}/messages`),
      orderBy('timestamp')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [activeChannel]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannel) return;

    try {
      const messagesRef = collection(db, `channels/${activeChannel}/messages`);
      await addDoc(messagesRef, {
        text: newMessage,
        sender: user.email,
        senderName: user.displayName || 'Anonymous',
        timestamp: serverTimestamp(),
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      {/* Sidebar for larger screens */}
      <div className="hidden md:flex md:flex-shrink-0">
        <div className="flex flex-col w-64 bg-gray-800">
          {/* Sidebar header */}
          <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
            <h1 className="text-white font-bold">ChatGenie</h1>
          </div>
          {/* Channels list */}
          <div className="flex-1 flex flex-col overflow-y-auto">
            <nav className="flex-1 px-2 py-4">
              <ChannelsList setActiveChannel={setActiveChannel} />
              <OnlineUsers currentUser={user} />
            </nav>
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      <div className="md:hidden">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="fixed top-4 left-4 z-50 p-2 rounded-md bg-gray-800 text-white"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M4 6h16M4 12h16M4 18h16"></path>
          </svg>
        </button>

        {/* Mobile sidebar drawer */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-40">
            <div className="fixed inset-0 bg-gray-600 opacity-75" onClick={() => setIsSidebarOpen(false)}></div>
            <div className="fixed inset-y-0 left-0 flex flex-col w-64 bg-gray-800">
              <div className="flex items-center h-16 flex-shrink-0 px-4 bg-gray-900">
                <h1 className="text-white font-bold">ChatGenie</h1>
              </div>
              <nav className="flex-1 px-2 py-4">
                <ChannelsList setActiveChannel={setActiveChannel} />
                <OnlineUsers currentUser={user} />
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200">
          <div className="h-16 flex items-center justify-between px-6">
            <h2 className="text-lg font-medium text-gray-900">
              {activeChannelName ? `#${activeChannelName}` : 'Select a channel'}
            </h2>
            
            {/* User profile and menu */}
            <div className="relative">
              <button
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center space-x-3 focus:outline-none"
              >
                <div className="flex items-center space-x-2">
                  <span className="h-2.5 w-2.5 bg-green-500 rounded-full"></span>
                  <span className="text-sm font-medium text-gray-700">
                    {user?.displayName || 'User'}
                  </span>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400"
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

              {/* Dropdown menu */}
              {isUserMenuOpen && (
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

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {!activeChannel ? (
            <p className="text-center text-gray-500">Select a channel to start chatting</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-gray-500">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === user?.email ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs md:max-w-md rounded-lg px-4 py-2 ${
                    message.sender === user?.email
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-200 text-gray-900'
                  }`}
                >
                  <div className="text-xs opacity-75 mb-1">
                    {message.senderName || 'Anonymous'}
                  </div>
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {message.timestamp?.toDate().toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message input */}
        {activeChannel && (
          <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
            <form onSubmit={handleSendMessage} className="flex space-x-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="w-full rounded-lg border border-gray-300 pl-4 pr-12 py-2 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
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
              <button
                type="submit"
                disabled={!newMessage.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default Chat; 