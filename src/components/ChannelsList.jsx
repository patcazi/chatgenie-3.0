import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';

const ChannelsList = ({ setActiveChannel }) => {
  const [channels, setChannels] = useState([]);
  const [isAddingChannel, setIsAddingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');

  const fetchChannels = async () => {
    try {
      const channelsCollection = collection(db, 'channels');
      const snapshot = await getDocs(channelsCollection);
      const channelsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        channelName: doc.data().channelName?.toString().replace(/['"]+/g, '')
      }));
      setChannels(channelsList);
    } catch (error) {
      console.error('Error fetching channels:', error);
    }
  };

  useEffect(() => {
    fetchChannels();
  }, []);

  const handleAddChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    try {
      const channelsRef = collection(db, 'channels');
      await addDoc(channelsRef, {
        channelName: newChannelName.trim().replace(/['"]+/g, ''),
        createdAt: serverTimestamp(),
        createdBy: 'admin'
      });

      setNewChannelName('');
      setIsAddingChannel(false);
      fetchChannels();
    } catch (error) {
      console.error('Error adding channel:', error);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add Channel Button */}
      {!isAddingChannel ? (
        <button
          onClick={() => setIsAddingChannel(true)}
          className="w-full flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 rounded-md"
        >
          <span className="mr-2">+</span> Add Channel
        </button>
      ) : (
        <form onSubmit={handleAddChannel} className="space-y-2">
          <input
            type="text"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="Channel name"
            className="w-full px-3 py-2 bg-gray-700 text-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              type="submit"
              className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAddingChannel(false);
                setNewChannelName('');
              }}
              className="px-3 py-1 text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Channels List */}
      <ul className="space-y-2">
        {channels.map(channel => (
          <li
            key={channel.id}
            className="cursor-pointer hover:bg-gray-700 px-4 py-2 rounded-md text-sm font-medium text-gray-300"
            onClick={() => setActiveChannel(channel.id)}
          >
            # {channel.channelName}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ChannelsList; 