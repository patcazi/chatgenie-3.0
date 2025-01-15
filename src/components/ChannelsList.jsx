import React, { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

const ChannelsList = ({ setActiveChannel }) => {
  const [channels, setChannels] = useState([]);

  useEffect(() => {
    const fetchChannels = async () => {
      try {
        const channelsCollection = collection(db, 'channels');
        const snapshot = await getDocs(channelsCollection);
        const channelsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setChannels(channelsList);
      } catch (error) {
        console.error('Error fetching channels:', error);
      }
    };

    fetchChannels();
  }, []);

  return (
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
  );
};

export default ChannelsList; 