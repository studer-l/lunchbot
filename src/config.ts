export interface ZulipConfig {
  username: string;
  apiKey: string;
  realm: string;
}

export interface Config {
  readonly zulipConfig: ZulipConfig;
  readonly announceStream: string;
  readonly controlStream: string;
  readonly controlTopic: string;
  readonly dbUrl: string;
}

export function readEnv(key: string): string {
  const result = process.env[key];
  if (!result) {
    throw new Error(`env variable '${key}' not defined`);
  }
  return result;
}

export function readZulipConfigFromEnv(): ZulipConfig {
  return {
    username: readEnv('LUNCHBOT_ZULIP_USERNAME'),
    apiKey: readEnv('LUNCHBOT_ZULIP_API_KEY'),
    realm: readEnv('LUNCHBOT_ZULIP_REALM'),
  };
}

export function readConfigFromEnv(): Config {
  const zulipConfig = readZulipConfigFromEnv();
  return {
    zulipConfig,
    announceStream: readEnv('LUNCHBOT_ANNOUNCE_STREAM'),
    controlStream: readEnv('LUNCHBOT_CONTROL_STREAM'),
    controlTopic: readEnv('LUNCHBOT_CONTROL_TOPIC'),
    dbUrl: readEnv('LUNCHBOT_DB_URL'),
  };
}
