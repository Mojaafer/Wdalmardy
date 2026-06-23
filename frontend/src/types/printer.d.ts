declare module '@point-of-sale/receipt-printer-encoder' {
  interface EncoderOptions {
    language?: string;
    width?: number;
  }

  interface EncoderInstance {
    initialize(): EncoderInstance;
    newline(): EncoderInstance;
    align(position: 'left' | 'center' | 'right'): EncoderInstance;
    style(style: 'normal' | 'bold' | 'double-height'): EncoderInstance;
    text(value: string): EncoderInstance;
    cut(): EncoderInstance;
    encode(): Uint8Array;
  }

  const ReceiptPrinterEncoder: new (options?: EncoderOptions) => EncoderInstance;
  export default ReceiptPrinterEncoder;
}

interface BluetoothDevice {
  gatt?: BluetoothRemoteGATTServer;
}

interface Navigator {
  bluetooth?: {
    requestDevice(options: {
      acceptAllDevices?: boolean;
      filters?: { services?: string[] }[];
      optionalServices?: string[];
    }): Promise<BluetoothDevice>;
  };
}

interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothRemoteGATTService {
  uuid: string;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTCharacteristic {
  writeValue(value: Uint8Array): Promise<void>;
}
