import { PlatformConfig } from 'homebridge';

interface CustomConfig {
  ips: string[];
}

export type Config = PlatformConfig & Partial<CustomConfig>;
