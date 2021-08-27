import logger from 'pino';
import dayjs from 'dayjs';

function timestampFormat() {
  return `,"time":"${dayjs().format()}"`;
}

const sysLogger = logger({
  prettyPrint: true,
  base: {
    pid: false,
  },
  timestamp: timestampFormat,
});

export default sysLogger;
