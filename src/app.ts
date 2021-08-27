/* eslint-disable @getify/proper-arrows/where */
import express, { Application, Request, Response } from 'express';
import { defaultConfig } from './config/default-config';

const { port, host } = defaultConfig;
const app: Application = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/', (req: Request, res: Response) => res.send('<h2>Express + TypeScript Server + Nodemon</h2>'));

app.listen(port, host, () => {
  console.log(`⚡️[server]: Server is running at http://${host}:${port}`);
});
