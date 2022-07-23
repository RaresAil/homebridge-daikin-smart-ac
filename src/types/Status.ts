export enum Mode {
  Auto,
  Dry,
  Cool,
  Heat,
  Fan,
  UNKNOWN
}

export enum FanSpeed {
  Auto,
  Night,
  S1,
  S2,
  S3,
  S4,
  S5,
  UNKNOWN
}

export enum FanDirection {
  Off,
  Vertical,
  Horizontal,
  VerticalAndHorizontal,
  UNKNOWN
}

export class Status {
  private successUpdate = false;

  public get wasSuccessUpdate(): boolean {
    return this.successUpdate;
  }

  public fanDirection: FanDirection = FanDirection.UNKNOWN;
  public fanSpeed: FanSpeed = FanSpeed.UNKNOWN;
  public heatTargetTemperature = 0;
  public coolTargetTemperature = 0;
  public mode: Mode = Mode.UNKNOWN;
  public roomTemperature = 0;
  public power = false;

  public get targetTemperature() {
    if (this.mode === Mode.Heat) {
      return this.heatTargetTemperature;
    }

    return this.coolTargetTemperature;
  }

  private readonly MODES = {
    '0': Mode.Auto,
    '2': Mode.Dry,
    '3': Mode.Cool,
    '4': Mode.Heat,
    '6': Mode.Fan
  };

  private readonly FAN_SPEEDS = {
    A: FanSpeed.Auto,
    B: FanSpeed.Night,
    '3': FanSpeed.S1,
    '4': FanSpeed.S2,
    '5': FanSpeed.S3,
    '6': FanSpeed.S4,
    '7': FanSpeed.S5
  };

  private readonly FAN_DIRECTIONS = {
    '0': FanDirection.Off,
    '1': FanDirection.Vertical,
    '2': FanDirection.Horizontal,
    '3': FanDirection.VerticalAndHorizontal
  };

  private readonly M_FAN_DIRECTIONS: Record<string, string>;
  private readonly M_FAN_SPEEDS: Record<string, string>;
  private readonly M_MODES: Record<string, string>;

  constructor(
    controlInfo?: Record<string, string>,
    sensorInfo?: Record<string, string>
  ) {
    this.M_FAN_DIRECTIONS = this.mirrorObj(
      this.FAN_DIRECTIONS as unknown as Record<string, string>
    );
    this.M_FAN_SPEEDS = this.mirrorObj(
      this.FAN_SPEEDS as unknown as Record<string, string>
    );
    this.M_MODES = this.mirrorObj(
      this.MODES as unknown as Record<string, string>
    );

    if (!controlInfo || !sensorInfo) {
      return;
    }

    this.update(controlInfo, sensorInfo);
  }

  public update(
    controlInfo?: Record<string, string>,
    sensorInfo?: Record<string, string>
  ): void {
    if (!controlInfo || !sensorInfo) {
      return;
    }

    this.fanSpeed =
      this.FAN_SPEEDS[controlInfo.f_rate?.toString()] ?? FanSpeed.UNKNOWN;
    this.mode = this.MODES[controlInfo.mode?.toString()] ?? Mode.UNKNOWN;
    this.fanDirection =
      this.FAN_DIRECTIONS[controlInfo.f_dir?.toString()] ??
      FanDirection.UNKNOWN;
    this.power = controlInfo.pow === '1';

    this.heatTargetTemperature = parseFloat(controlInfo.dt4 || '0');
    this.coolTargetTemperature = parseFloat(controlInfo.dt3 || '0');

    try {
      this.roomTemperature = parseFloat(sensorInfo.htemp || '0');
    } catch {
      // keep previous value
    }

    this.successUpdate = true;
  }

  public toParams(): string {
    const params = new URLSearchParams();

    params.set(
      'f_dir',
      this.M_FAN_DIRECTIONS[this.fanDirection.toString()] ?? ''
    );
    params.set('f_rate', this.M_FAN_SPEEDS[this.fanSpeed.toString()] ?? '');
    params.set('stemp', this.targetTemperature.toFixed(1) ?? '');
    params.set('mode', this.M_MODES[this.mode.toString()] ?? '');
    params.set('pow', this.power ? '1' : '0');
    params.set('shum', '');

    return params.toString();
  }

  public clone(): Status {
    const copy = new (this.constructor as { new (): Status })();
    Object.assign(copy, this);
    return copy;
  }

  private mirrorObj = (obj: Record<string, string>): Record<string, string> => {
    return Object.entries(obj).reduce((acc, [key, value]) => {
      return {
        ...acc,
        [value]: key
      };
    }, {});
  };
}
