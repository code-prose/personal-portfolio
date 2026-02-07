# Personal Portfolio

My personal portfolio site built with Astro, deployed to [logancodes.com](https://logancodes.com).

## Development

```sh
npm install
npm run dev
```

## Deployment

Pushes to `main` trigger a GitHub Actions workflow that builds the site and pushes to the `Build` branch. Hostinger pulls from `Build` via Git deployment.
