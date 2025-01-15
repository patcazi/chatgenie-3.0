import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import EmojiPicker from 'emoji-picker-react';

const PrivateChat = ({ currentUser, selectedUser, onClose, className = '' }) => {
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
    const messageClass = `flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`;
    const bubbleClass = `max-w-xs rounded-lg px-4 py-3 ${
      isOwnMessage ? 'bg-[#d0eaff] text-gray-900' : 'bg-[#f1f1f1] text-gray-900'
    }`;

    return (
      <div key={message.id} className={messageClass}>
        <div className={bubbleClass}>
          <p className="text-sm font-medium text-gray-700">{message.senderName}</p>
          {message.type === 'file' ? (
            <div>
              <p className="text-sm">
                shared a file: <a 
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
            <p className="text-sm">{message.message}</p>
          )}
          <p className="text-xs mt-1 text-gray-500">
            {message.timestamp?.toDate().toLocaleTimeString()}
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className={`flex flex-col bg-white overflow-hidden ${className}`}>
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet</p>
        ) : (
          messages.map(message => renderMessage(message))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input */}
      <form onSubmit={handleSendMessage} className="p-6 bg-[#2c3e50] border-t border-gray-700">
        <div className="flex space-x-3">
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
            id="private-file-upload"
          />
          <label
            htmlFor="private-file-upload"
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
        </div>
      </form>
    </div>
  );
};

export default PrivateChat; 