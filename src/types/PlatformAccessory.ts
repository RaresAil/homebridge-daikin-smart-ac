import { PlatformAccessory as PA } from 'homebridge';

import { AccessoryContext } from './AccessoryContext';

export type PlatformAccessory = PA<AccessoryContext>;
