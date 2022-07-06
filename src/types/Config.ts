import { PlatformConfig } from 'homebridge';

interface CustomConfig {
  email: string;
  password: string;
}

export type Config = PlatformConfig & Partial<CustomConfig>;
