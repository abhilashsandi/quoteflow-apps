type LogFields = Record<string, unknown>;

function log(
  level: 'info' | 'warn' | 'error',
  message: string,
  fields?: LogFields,
): void {
  const suffix = fields ? ` ${JSON.stringify(fields)}` : '';
  // eslint-disable-next-line no-console -- this is the logger; console is the intended sink
  console[level === 'info' ? 'log' : level](
    `[automation-worker] ${message}${suffix}`,
  );
}

export const logger = {
  info: (message: string, fields?: LogFields) => log('info', message, fields),
  warn: (message: string, fields?: LogFields) => log('warn', message, fields),
  error: (message: string, fields?: LogFields) => log('error', message, fields),
};
