# Nullstack Serverless with Pulumi

## Installation

```bash
npm install nullstack-serverless-pulumi-aws
```

or

```bash
yarn add nullstack-serverless-pulumi-aws
```

## Usage

In your pulumi app, you'll need to know your app path

```ts
/* ---------- External ---------- */
import { Resource, getStack } from "@pulumi/pulumi";
import path, { resolve } from "path";
import {
  PulumiNullstack,
  ServerlessApp,
  compressSSRNullstackApps,
} from "nullstack-serverless-pulumi-aws";

/* ---------- Environment ---------- */
const environment = getStack(); // development, staging, production...

/* ---------- Constants ---------- */
const my_nullstack_app_dir = path.join(__dirname, "..", "my-nullstack-app");

/* ---------- Handlers ---------- */
compressSSRNullstackApps([my_nullstack_app_dir]).then(() => {
  console.log("zipped nullstack apps.");
});

/* ---------- Resources ---------- */
const nullstack_app = new PulumiNullstack("my-amazing-nullstack-app", {
  environment,
  env: {
    NULLSTACK_PROJECT_NAME: `[${environment}] AWS Lambda`,
  },
  nullstack_app_path: my_nullstack_app_dir,
  // mode: 'ssr', 'ssg' or 'spa'. Caution: if you choose ssg or spa, your built nullstack-app folder should be 'ssg' or 'spa'!
});

const sls_app = new ServerlessApp(
  "my-amazing-nullstack-app-sls",
  {
    lambda_fn: nullstack_app.lambda_fn,
    environment,
  },
  { dependsOn: [nullstack_app.lambda_fn as Resource] }
);

export const nullstack_app_lambda_url =
  nullstack_app.lambda_fn_url?.functionUrl;

export const nullstack_app_execute_url = sls_app.apigateway.apiEndpoint;

export const nullstack_app_cname =
  sls_app.apigateway_domain_name?.domainNameConfiguration.targetDomainName;
```

## What is Nullstack?

Nullstack is a feature-driven full stack JavaScript framework that helps you build isomorphic applications and stay focused on shipping products to production.

Write the backend and frontend of a feature in a single component and let the framework decide where the code should run.

Nullstack provides you all the tools you need to stay focused on the product.

Learn more about [Nullstack](https://nullstack.app)

## How Nullstack works?

Nullstack works in three different build modes:

- SSR
  - Creates an express app that serves the built JSX seamlessly in the server-side when it needs
- SSG
  - It generates a static HTML file for each different page
- SPA
  - It generates an almost empty HTML file that will be in charge of all the pages and routes with JavaScript, like React.
