/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly GITHUB_TOKEN: string;
  readonly GITLAB_TOKEN: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
