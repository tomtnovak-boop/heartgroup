import { useState, useCallback, useRef, useEffect } from 'react';
import '@/types/bluetooth.d.ts';

interface BluetoothHRState {
  isConnected: boolean;
  isConnecting: boolean;
  bpm: number;
  error: string | null;
  deviceName: string | null;
}

export function useBluetoothHR() {
  const [state, setState] = useState<BluetoothHRState>({
    isConnected: false,
    isConnecting: false,
    bpm: 0,
    error: null,
    deviceName: null,
  });

  const deviceRef = useRef<BluetoothDevice | null>(null);
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);

  const handleHeartRateMeasurement = useCallback((event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;

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

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setState(prev => ({
        ...prev,
        error: 'Web Bluetooth is not supported in this browser. Please use Chrome, Edge, or Opera.',
      }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
        optionalServices: ['heart_rate'],
      });

      deviceRef.current = device;

      device.addEventListener('gattserverdisconnected', () => {
        setState(prev => ({
          ...prev,
          isConnected: false,
          bpm: 0,
          deviceName: null,
        }));
      });

      const server = await device.gatt?.connect();
      if (!server) throw new Error('Could not connect to GATT server');

      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');
      
      characteristicRef.current = characteristic;
      
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleHeartRateMeasurement);

      setState(prev => ({
        ...prev,
        isConnected: true,
        isConnecting: false,
        deviceName: device.name || 'Unknown Device',
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to connect to heart rate monitor';
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage,
      }));
    }
  }, [handleHeartRateMeasurement]);

  const disconnect = useCallback(() => {
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
      bpm: 0,
      error: null,
      deviceName: null,
    });
  }, [handleHeartRateMeasurement]);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    ...state,
    connect,
    disconnect,
  };
}
