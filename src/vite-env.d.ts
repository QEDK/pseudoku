/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly GITHUB_CLIENT_ID?: string;
  readonly OAUTH_API_ENDPOINT?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
