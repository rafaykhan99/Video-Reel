import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setCodec('h264');
Config.setCrf(23);
Config.setPixelFormat('yuv420p');

// Enable concurrent rendering for better performance
Config.setConcurrency(2);

export default Config;