import { useState, useCallback, useRef, useEffect } from 'react';
import type { BluetoothDevice, BluetoothRemoteGATTCharacteristic } from '@/types/bluetooth';

const MAX_RECONNECT_ATTEMPTS = 3;
const RECONNECT_DELAY_MS = 2000;

interface BluetoothHRState {
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;
  bpm: number;
  error: string | null;
  deviceName: string | null;
  reconnectAttempts: number;
  connectionLost: boolean;
}

export function useBluetoothHR() {
  const [state, setState] = useState<BluetoothHRState>({
    isConnected: false,
    isConnecting: false,
    isReconnecting: false,
    bpm: 0,
    error: null,
    deviceName: null,
    reconnectAttempts: 0,
    connectionLost: false,
  });

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const wasConnectedRef = useRef(false);
  const isManualDisconnectRef = useRef(false);

  const handleHeartRateMeasurement = useCallback((event: Event) => {
    const target = event.target as unknown as BluetoothRemoteGATTCharacteristic;
    const value = target.value;

    const flags = value.getUint8(0);
    const is16Bit = flags & 0x01;
    
    let heartRate: number;
    if (is16Bit) {
      heartRate = value.getUint16(1, true);
    } else {
      heartRate = value.getUint8(1);
    }

    setState(prev => ({ ...prev, bpm: heartRate }));
  }, []);

  const connectToDevice = useCallback(async (device: BluetoothDevice): Promise<boolean> => {
    try {
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Could not connect to GATT server');

      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      
      characteristicRef.current = characteristic;
      
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleHeartRateMeasurement);

      wasConnectedRef.current = true;
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        isReconnecting: false,
        deviceName: device.name || 'Unknown Device',
        reconnectAttempts: 0,
        connectionLost: false,
        error: null,
      }));
      
      return true;
    } catch (error) {
      return false;
    }
  }, [handleHeartRateMeasurement]);

  const attemptReconnect = useCallback(async () => {
    const device = deviceRef.current;
    if (!device || isManualDisconnectRef.current) return;

    setState(prev => ({
      ...prev,
      isReconnecting: true,
      connectionLost: true,
    }));

    for (let attempt = 1; attempt <= MAX_RECONNECT_ATTEMPTS; attempt++) {
      setState(prev => ({ ...prev, reconnectAttempts: attempt }));
      
      console.log(`Reconnect attempt ${attempt}/${MAX_RECONNECT_ATTEMPTS}`);
      
      const success = await connectToDevice(device);
      if (success) {
        console.log('Reconnect successful');
        return;
      }

      if (attempt < MAX_RECONNECT_ATTEMPTS) {
        await new Promise(resolve => setTimeout(resolve, RECONNECT_DELAY_MS));
      }
    }

    // All attempts failed
    setState(prev => ({
      ...prev,
      isReconnecting: false,
      isConnected: false,
      bpm: 0,
      error: 'Verbindung konnte nicht wiederhergestellt werden',
    }));
  }, [connectToDevice]);

  const handleDisconnect = useCallback(() => {
    if (isManualDisconnectRef.current) {
      // Manual disconnect - just update state
      setState(prev => ({
        ...prev,
        isConnected: false,
        bpm: 0,
        deviceName: null,
        connectionLost: false,
      }));
      return;
    }

    // Unexpected disconnect - attempt reconnect
    if (wasConnectedRef.current && deviceRef.current) {
      attemptReconnect();
    }
  }, [attemptReconnect]);

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setState(prev => ({
        ...prev,
        error: 'Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.',
      }));
      return;
    }

    isManualDisconnectRef.current = false;
    setState(prev => ({ ...prev, isConnecting: true, error: null, connectionLost: false }));

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['heart_rate'],
      });

      deviceRef.current = device;
      device.addEventListener('gattserverdisconnected', handleDisconnect);

      const success = await connectToDevice(device);
      if (!success) {
        throw new Error('Could not connect to device');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to heart rate monitor';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
    }
  }, [connectToDevice, handleDisconnect]);

  const reconnect = useCallback(async () => {
    if (!deviceRef.current) {
      // No previous device - need to do fresh connect
      await connect();
      return;
    }

    isManualDisconnectRef.current = false;
    attemptReconnect();
  }, [connect, attemptReconnect]);

  const disconnect = useCallback(() => {
    isManualDisconnectRef.current = true;
    wasConnectedRef.current = false;

    if (characteristicRef.current) {
      characteristicRef.current.removeEventListener('characteristicvaluechanged', handleHeartRateMeasurement);
      characteristicRef.current.stopNotifications().catch(() => {});
    }

    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }

    setState({
      isConnected: false,
      isConnecting: false,
      isReconnecting: false,
      bpm: 0,
      error: null,
      deviceName: null,
      reconnectAttempts: 0,
      connectionLost: false,
    });
  }, [handleHeartRateMeasurement]);

  useEffect(() => {
    return () => {
      isManualDisconnectRef.current = true;
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    reconnect,
  };
}
