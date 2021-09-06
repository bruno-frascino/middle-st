import config from 'config';
import log from '../logger';

export default function connect() {
  const uri: string = config.get('dbUri');

  log.info(`Connecting to db ${uri}`);
}
