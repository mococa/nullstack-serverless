# Nullstack Serverless

### Installation

```bash
yarn add nullstack-serverless
```

or

```
npm i nullstack-serverless
```

## Explanation

If you want to run an SSR built nullstack app in an AWS lambda or an SSG/SPA on a bucket, here is an example of a [CDK construct](https://docs.aws.amazon.com/cdk/v2/guide/home.html) that will do all the dirty job for you.

## What does it do

1. It creates an s3 bucket to host all the public files.
2. (SSR only) It creates a private s3 bucket to host the build files. in it, there will be a folder, with an index.js, where it uses [@vendia/serverless-express](https://github.com/vendia/serverless-express), and gets the Express server in Nullstack and converts it into a lambda function; in this folder there is also the node_modules of this external package, and a .production folder from nullstack (changed server.js in it removing the crossorigin attribute - [explained here](https://github.com/nullstack/nullstack/pull/355), but got merged on [Nullstack v0.19.2](https://github.com/nullstack/nullstack/releases/tag/v0.19.2)).
3. It deploys the necessary files into these buckets.
4. (SSR only) It creates a lambda that will run the files in the build bucket
5. (SSR only) It creates an API Gateway with the route `/` and the route `/{proxy+}` for the rest of the routes.
6. (SSR only) It creates a lambda function url for it to be accessible.
7. (SSG and SPA only) It creates an s3 website url for it to be accessible.

### Examples

#### SSR

```ts
import * as cdk from "aws-cdk-lib";
import {
  NullstackAppConstruct,
  zip_nullstack,
  NullstackProps,
} from "nullstack-serverless";

const app_dir = process.env.NULLSTACK_APP_DIR || "../web";

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

const ssr_props: NullstackProps.StackProps = {
  app_dir,
  build_type: "ssr",
  ...ssr_buckets,
  environment: "development",
  region: "sa-east-1",
  app_env: {
    NULLSTACK_PROJECT_NAME: "[dev] Web",
    NULLSTACK_PROJECT_COLOR: "#D22365",
  },
};

(async () => {
  await zip_nullstack(app_dir);

  const stack = new cdk.Stack(app, "NullstackAppStack", {
    env: { region: "sa-east-1" },
  });

  new NullstackAppConstruct(stack, "NullstackAppStackTestSSR", ssr_props);
})();
```

#### SSG or SPA

<details><summary>Show</summary>

```ts
import * as cdk from "aws-cdk-lib";
import {
  NullstackAppConstruct,
  zip_nullstack,
  NullstackProps,
} from "nullstack-serverless";

const app_dir = process.env.NULLSTACK_APP_DIR || "../web";

const ssg_bucket: NullstackProps.NullstackAppBucket = {
  id: "Nullstack-App-Test-SSG-Build",
  name: "nullstack-app-test-ssg-build",
};

const ssg_props: NullstackProps.StackProps = {
  bucket: ssg_bucket,
  build_dir: path.join("..", "web", "ssg"), // or spa, wherever the build is
  build_type: "ssg", // or spa
  environment: "development",
  region: "sa-east-1",
  app_env: {
    NULLSTACK_PROJECT_NAME: "[dev] Web",
    NULLSTACK_PROJECT_COLOR: "#D22365",
  },
};

(async () => {
  await zip_nullstack(app_dir);

  const stack = new cdk.Stack(app, "NullstackAppStack", {
    env: { region: "sa-east-1" },
  });

  new NullstackAppConstruct(stack, "NullstackAppStackTestSSG", ssg_props);
})();
```

</details>

### Image trick

For images, for not trying to access the public folder assets. I created a nullstack component for it, that tries to get the one in the CDN first:

```tsx
/* eslint-disable nullstack/no-unused-vars */
import Nullstack, {
  ImgHTMLAttributes,
  NullstackClientContext,
} from "nullstack";

type ImageProps = ImgHTMLAttributes<HTMLImageElement>;

export class Image extends Nullstack<ImageProps> {
  render({
    project,
    children,
    environment,
    instances,
    page,
    params,
    router,
    settings,
    ...props
  }: NullstackClientContext<ImageProps>) {
    return (
      <img
        {...props}
        src={`${
          project.cdn?.endsWith("/")
            ? project.cdn.slice(0, -1)
            : project.cdn || ""
        }/${props.src.startsWith("/") ? props.src.slice(1) : props.src}`}
      />
    );
  }
}
```

### Pros ✅

It turns out to be blazingly fast ⚡⚡
The lambda runs very quickly and the impression it gives is that it's not even online, as there is both offline cache and s3 cache.

In this example, I used a server function to store the amount of time we clicked the button (and displayed it), although it's obvious that it resets after the lambda dies, it's still super fast and testing it on a phone and on a computer hitting refresh, feels like it's even doing some websockets, but it's just pure HTTP magic refreshing the data.
