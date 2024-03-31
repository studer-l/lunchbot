/* eslint-disable */
declare module 'zulip-js' {
  export interface ZulipConfig {
    zuliprc?: string;
    realm: string;
    apiKey?: string;
    apiURL?: string;
  }

  // Define the resources object type
  export interface ZulipResources {
    config: ZulipConfig;
    callEndpoint: (
      endpoint: string,
      method?: string,
      params?: any,
    ) => Promise<any>;
    accounts: any;
    streams: any;
    messages: any;
    queues: any;
    events: any;
    users: any;
    emojis: any;
    typing: any;
    reactions: any;
    server: any;
    filters: any;
    callOnEachEvent: any;
  }

  // Define the zulip function type
  declare function zulip(initialConfig: ZulipConfig): Promise<ZulipResources>;

  // Export the zulip function
  export default zulip;
}
