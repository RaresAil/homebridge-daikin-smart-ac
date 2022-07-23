import { DaikinAC } from '../DaikinAC';

export interface AccessoryContext {
  daikinAC: DaikinAC;
  name: string;
  ip: string;
}
