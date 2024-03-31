import { createLogger, format, transports } from 'winston';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fmt(info: any): string {
  const { level, message, metadata, timestamp } = info;
  if ('stack' in metadata) {
    const stack = metadata.stack;
    delete metadata.stack;
    return `${timestamp} ${level}: ${message} ${JSON.stringify(metadata)}\n${stack}`;
  }
  if (Object.keys(metadata).length) {
    return `${timestamp} ${level}: ${message} ${JSON.stringify(metadata)}`;
  }
  return `${timestamp} ${level}: ${message}`;
}

const logger = createLogger({
  transports: [
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.metadata(),
        format.timestamp(),
        format.printf(fmt),
      ),
      level: 'info',
    }),
  ],
});
export default logger;
