declare module 'pino' {
  const pino: any;
  export default pino;
}

declare module 'pino-roll' {
  import { DestinationObjectOptions } from 'pino';
  interface Opts {
    dir: string;
    size?: string;
    maxFiles?: number;
    compress?: boolean;
  }
  export default function (opts: Opts): DestinationObjectOptions;
}