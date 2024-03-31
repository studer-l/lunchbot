#!/usr/bin/env node
import logger from './logger';
import { mkLunchBot } from './lunch_bot';

logger.info('Launching lunch bot');

// eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => {
  const lunchBot = await mkLunchBot();
  await lunchBot.run();
})();
