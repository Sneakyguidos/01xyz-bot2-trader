import pino from 'pino';
import pinoRoll from 'pino-roll';
import { join } from 'path';

export const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
    serializers: { err: pino.stdSerializers.err },
  },
  pinoRoll({
    dir: join(process.cwd(), 'logs'),
    size: '100MB',
    maxFiles: 5,
    compress: true,
  })
);