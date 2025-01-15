import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import EmojiPicker from 'emoji-picker-react';

const PrivateChat = ({ currentUser, selectedUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const emojiPickerRef = useRef(null);

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

  // Create a consistent conversation ID between two users
  const getConversationId = (uid1, uid2) => {
    return [uid1, uid2].sort().join('_');
  };

  // Listen for private messages between current user and selected user
  useEffect(() => {
    if (!currentUser?.uid || !selectedUser?.id) {
      console.log('Missing user information:', { currentUser, selectedUser });
      return;
    }

    console.log('Setting up private message listener between:', {
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
  }, [currentUser?.uid, selectedUser?.id]);

  const handleEmojiClick = (emojiData) => {
    setNewMessage(prev => prev + emojiData.emoji);
    setShowEmojiPicker(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const messageData = {
        type: 'text',
        message: newMessage.trim(),
        timestamp: serverTimestamp(),
        senderId: currentUser.uid,
        receiverId: selectedUser.id,
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

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      console.log('Uploading file:', file.name);

      // Create a unique conversation ID for storage path
      const conversationId = getConversationId(currentUser.uid, selectedUser.id);
      
      // Upload file to Storage
      const storageRef = ref(storage, `privateMessages/${conversationId}/${file.name}`);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log('File uploaded to Storage, URL:', downloadURL);

      // Create a message for the file
      const messageData = {
        type: 'file',
        fileName: file.name,
        fileURL: downloadURL,
        timestamp: serverTimestamp(),
        senderId: currentUser.uid,
        receiverId: selectedUser.id,
        senderName: currentUser.displayName || 'Anonymous',
        receiverName: selectedUser.displayName || 'Anonymous'
      };

      console.log('Creating file message:', messageData);

      const docRef = await addDoc(collection(db, 'privateMessages'), messageData);
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
    const isOwnMessage = message.senderId === currentUser.uid;
    const messageClass = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`;
    const bubbleClass = `max-w-xs rounded-lg px-4 py-2 ${
      isOwnMessage ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-900'
    }`;

    return (
      <div key={message.id} className={messageClass}>
        <div className={bubbleClass}>
          <p className="text-sm font-medium">{message.senderName}</p>
          {message.type === 'file' ? (
            <div>
              <p className="text-sm">
                shared a file: <a 
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
            <p className="text-sm">{message.message}</p>
          )}
          <p className="text-xs mt-1 opacity-75">
            {message.timestamp?.toDate().toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  };

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
          messages.map(message => renderMessage(message))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-4 bg-white border-t border-gray-200">
        <div className="flex space-x-2">
          <div className="flex-1 relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-1 focus:ring-indigo-500"
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
          <input
            type="file"
            onChange={handleFileUpload}
            ref={fileInputRef}
            className="hidden"
            id="private-file-upload"
          />
          <label
            htmlFor="private-file-upload"
            className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 cursor-pointer flex items-center"
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
        </div>
      </form>
    </div>
  );
};

export default PrivateChat; 