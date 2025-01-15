import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

// Temporary data structure for channels
const TEMP_CHANNELS = [
  { id: 1, name: 'General' },
  { id: 2, name: 'Random' },
  { id: 3, name: 'Support' },
];

// Temporary data structure for messages
const TEMP_MESSAGES = [
  { id: 1, text: 'Hello everyone!', sender: 'user1@example.com', timestamp: new Date().toISOString() },
  { id: 2, text: 'Welcome to ChatGenie!', sender: 'user2@example.com', timestamp: new Date().toISOString() },
];

const Chat = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState(TEMP_MESSAGES);
  const [newMessage, setNewMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(TEMP_CHANNELS[0]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message = {
      id: messages.length + 1,
      text: newMessage,
      sender: user.email,
      timestamp: new Date().toISOString(),
    };

    setMessages([...messages, message]);
    setNewMessage('');
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
            <nav className="flex-1 px-2 py-4 space-y-1">
              {TEMP_CHANNELS.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => setSelectedChannel(channel)}
                  className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium ${
                    selectedChannel.id === channel.id
                      ? 'bg-gray-900 text-white'
                      : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  # {channel.name}
                </button>
              ))}
            </nav>
          </div>
          {/* New channel button */}
          <div className="flex-shrink-0 flex bg-gray-700 p-4">
            <button className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">
              New Channel
            </button>
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
              <nav className="flex-1 px-2 py-4 space-y-1">
                {TEMP_CHANNELS.map((channel) => (
                  <button
                    key={channel.id}
                    onClick={() => {
                      setSelectedChannel(channel);
                      setIsSidebarOpen(false);
                    }}
                    className={`w-full text-left px-4 py-2 rounded-md text-sm font-medium ${
                      selectedChannel.id === channel.id
                        ? 'bg-gray-900 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    # {channel.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}
      </div>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Chat header */}
        <div className="flex-shrink-0 bg-white border-b border-gray-200">
          <div className="h-16 flex items-center px-6">
            <h2 className="text-lg font-medium text-gray-900">#{selectedChannel.name}</h2>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 ? (
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
                  <p className="text-sm">{message.text}</p>
                  <p className="text-xs mt-1 opacity-75">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message input */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              Send
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Chat; 