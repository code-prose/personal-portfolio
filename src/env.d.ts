/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly GITLAB_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
