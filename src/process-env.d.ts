declare global {
  namespace NodeJS {
    interface ProcessEnv {
      DATABASE_URL: string;
      DISCORD_APPLICATION_ID: string;
      DISCORD_TOKEN: string;
    }
  }
}

export {};
