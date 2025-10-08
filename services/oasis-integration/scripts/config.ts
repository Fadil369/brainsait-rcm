/**
 * OASIS+ Discovery Configuration
 */

import { config } from 'dotenv';

config();

export const CONFIG = {
  oasisUrl: process.env.OASIS_URL || 'http://128.1.1.185/prod/faces/Home',
  username: process.env.OASIS_USERNAME || 'U29958',
  password: process.env.OASIS_PASSWORD || 'U29958',
  headless: process.env.HEADED !== 'true',
  screenshotPath: process.env.SCREENSHOT_PATH || './screenshots',
  outputPath: process.env.OUTPUT_PATH || './discovery-output',
  timeout: 30000,
  slowMo: process.env.HEADED === 'true' ? 500 : 0,
};