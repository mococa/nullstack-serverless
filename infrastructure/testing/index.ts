import * as cdk from "aws-cdk-lib";
import path from "path";

import { NullstackAppConstruct, NullstackProps, zip_nullstack } from "../src";

const app = new cdk.App();
const app_dir = path.join("..", "web");

const ssg_bucket: NullstackProps.NullstackAppBucket = {
  id: "Nullstack-App-Test-SSG-Build",
  name: "nullstack-app-test-ssg-build",
};

const ssr_buckets = {
  public_bucket: {
    id: "Nullstack-App-Test-SSR-CDN",
    name: "nullstack-app-test-ssr-cdn",
  },
  build_bucket: {
    id: "Nullstack-App-Test-SSR-Build",
    name: "nullstack-app-test-ssr-build",
  },
};

const spa_bucket: NullstackProps.NullstackAppBucket = {
  id: "Nullstack-App-Test-SPA-Build",
  name: "nullstack-app-test-spa-build",
};

const ssg_props: NullstackProps.StackProps = {
  environment: "development",
  bucket: ssg_bucket,
  region: "sa-east-1",
  build_dir: path.join("..", "web", "ssg"),
  app_env: {
    NULLSTACK_PROJECT_NAME: "[dev] Web",
    NULLSTACK_PROJECT_COLOR: "#D22365",
  },
  build_type: "ssg",
};

const ssr_props: NullstackProps.StackProps = {
  environment: "development",
  app_dir,
  ...ssr_buckets,
  region: "sa-east-1",
  app_env: {
    NULLSTACK_PROJECT_NAME: "[dev] Web",
    NULLSTACK_PROJECT_COLOR: "#D22365",
  },
  build_type: "ssr",
};

const spa_props: NullstackProps.StackProps = {
  environment: "development",
  bucket: spa_bucket,
  region: "sa-east-1",
  build_dir: path.join("..", "web", "spa"),
  app_env: {
    NULLSTACK_PROJECT_NAME: "[dev] Web",
    NULLSTACK_PROJECT_COLOR: "#D22365",
  },
  build_type: "spa",
};

(async () => {
  await zip_nullstack(app_dir);

  const stack = new cdk.Stack(app, "NullstackAppStack", {
    env: { region: "sa-east-1" },
  });

  new NullstackAppConstruct(stack, "NullstackAppStackTestSSG", ssg_props);
  new NullstackAppConstruct(stack, "NullstackAppStackTestSSR", ssr_props);
  new NullstackAppConstruct(stack, "NullstackAppStackTestSPA", spa_props);
})();
