// src/utils/open-browser.ts
import { exec } from 'child_process';
import { Logger } from '@nestjs/common';

const logger = new Logger('OpenBrowser');

export function openBrowser(url: string) {
  const start = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${start} ${url}`, (error) => {
    if (error) {
      logger.warn(`Failed to automatically open browser: ${error.message}`);
      logger.log(`Please manually navigate to: ${url}`);
    } else {
      logger.log(`Browser opened successfully to: ${url}`);
    }
  });
}