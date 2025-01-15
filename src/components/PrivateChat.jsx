import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { db } from '../firebase';

const PrivateChat = ({ currentUser, selectedUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Listen for private messages between current user and selected user
  useEffect(() => {
    if (!currentUser?.uid || !selectedUser?.id) {
      console.log('Missing user information:', { currentUser, selectedUser });
      return;
    }

    console.log('Setting up message listener between:', {
      currentUserId: currentUser.uid,
      selectedUserId: selectedUser.id
    });

    try {
      const q = query(
        collection(db, 'privateMessages'),
        where('senderId', 'in', [currentUser.uid, selectedUser.id]),
        where('receiverId', 'in', [currentUser.uid, selectedUser.id]),
        orderBy('timestamp', 'asc')
      );

      console.log('Query created:', q);

      const unsubscribe = onSnapshot(
        q,
        (querySnapshot) => {
          console.log('Snapshot received, document count:', querySnapshot.size);
          
          const messagesList = [];
          querySnapshot.forEach((doc) => {
            const messageData = {
              id: doc.id,
              ...doc.data()
            };
            console.log('Message data:', messageData);
            messagesList.push(messageData);
          });

          console.log('Final messages list:', messagesList);
          setMessages(messagesList);
        },
        (error) => {
          console.error('Error in message listener:', error);
        }
      );

      return () => {
        console.log('Cleaning up message listener');
        unsubscribe();
      };
    } catch (error) {
      console.error('Error setting up message listener:', error);
    }
  }, [currentUser?.uid, selectedUser?.id]); // Updated dependencies to be more specific

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const messageData = {
        senderId: currentUser.uid,
        receiverId: selectedUser.id,
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
        senderName: currentUser.displayName || 'Anonymous',
        receiverName: selectedUser.displayName || 'Anonymous'
      };
      
      console.log('Sending message:', messageData);
      
      const docRef = await addDoc(collection(db, 'privateMessages'), messageData);
      console.log('Message sent successfully with ID:', docRef.id);

      setNewMessage('');
    } catch (error) {
      console.error('Error sending private message:', error);
    }
  };

  console.log('Current messages state:', messages); // Debug current messages state

  return (
    <div className="flex flex-col bg-white w-full h-96 border-t border-gray-200 shadow-lg">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center">
          <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
          <h3 className="text-gray-800 font-medium">
            Chat with {selectedUser.displayName || 'Anonymous'}
          </h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet</p>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.senderId === currentUser.uid ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs rounded-lg px-4 py-2 ${
                  message.senderId === currentUser.uid
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.message}</p>
                <p className="text-xs mt-1 opacity-75">
                  {message.timestamp?.toDate().toLocaleTimeString()}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
};

export default PrivateChat; 