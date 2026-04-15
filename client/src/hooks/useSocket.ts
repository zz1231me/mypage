import { useContext } from 'react';
import { SocketContext } from '../contexts/socketContextValue';

export const useSocket = () => useContext(SocketContext);
