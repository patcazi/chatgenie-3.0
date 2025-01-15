import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import PrivateChat from './PrivateChat';

const OnlineUsers = ({ currentUser }) => {
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  useEffect(() => {
    // Query for online users
    const q = query(
      collection(db, 'users'),
      where('isOnline', '==', true)
    );

    // Set up real-time listener
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const users = snapshot.docs
        .map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        // Filter out the current user from the list
        .filter(user => user.id !== currentUser?.uid);
      
      setOnlineUsers(users);
    });

    // Clean up listener on unmount
    return () => unsubscribe();
  }, [currentUser]);

  // Don't render anything if there are no other online users
  if (onlineUsers.length === 0) {
    return (
      <div className="mt-6">
        <h2 className="px-4 mb-2 text-sm font-semibold text-gray-400 uppercase">Online Users</h2>
        <p className="px-4 text-sm text-gray-500">No users online</p>
      </div>
    );
  }

  return (
    <>
      <div className="mt-6">
        <h2 className="px-4 mb-2 text-sm font-semibold text-gray-400 uppercase">Online Users</h2>
        <ul className="space-y-1">
          {onlineUsers.map(user => (
            <li
              key={user.id}
              className={`flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-md cursor-pointer ${
                selectedUser?.id === user.id ? 'bg-gray-700' : ''
              }`}
              onClick={() => setSelectedUser(user)}
            >
              <span className="h-2 w-2 bg-green-500 rounded-full mr-2"></span>
              {user.displayName || 'Anonymous'}
            </li>
          ))}
        </ul>
      </div>

      {/* Private Chat Panel */}
      {selectedUser && (
        <div className="fixed bottom-0 left-0 right-0">
          <PrivateChat
            currentUser={currentUser}
            selectedUser={selectedUser}
            onClose={() => setSelectedUser(null)}
          />
        </div>
      )}
    </>
  );
};

export default OnlineUsers; 