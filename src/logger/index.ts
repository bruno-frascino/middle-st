import logger from 'pino';
import dayjs from 'dayjs';

function timestampFormat() {
  return `,"time":"${dayjs().format()}"`;
}

const log = logger({
  prettyPrint: true,
  base: {
    pid: false,
  },
  level: 'info',
  timestamp: timestampFormat,
});

export default log;
