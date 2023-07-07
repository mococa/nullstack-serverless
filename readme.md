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

1. It creates an s3 bucket to host all the public files
2. It creates a private s3 bucket to host the build files. in it, there will be a folder, with an index.js, where it uses [@vendia/serverless-express](https://github.com/vendia/serverless-express), where it gets the Express server in Nullstack and converts it into a lambda function; in this folder there is also the node_modules of this external package, and a .production folder from nullstack (changed server.js in it removing the crossorigin attribute - [explained here](https://github.com/nullstack/nullstack/pull/355)) (SSR only)
3. It deploys the necessary files into these buckets
4. It creates a lambda that will run the files in the build bucket (SSR only)
5. It creates an API Gateway with the route `/` and the route `/{proxy+}` for the rest of the routes. (SSR only)
6. It creates a lambda function url for it to be accessible. (SSR only)

## Example
```ts
import * as cdk from "aws-cdk-lib";
import { NullstackAppStack, zip_nullstack } from "nullstack-serverless";

const main = async () => {
  const app_dir = process.env.NULLSTACK_APP_DIR || "../web";

  await zip_nullstack(app_dir);

  const app = new cdk.App();

  new NullstackAppStack(app, "NullstackAppStack", {
    environment: "development",
    build_bucket: { id: "Nullstack-App-Build", name: "nullstack-app-build" }, // bucket: -> nullstack-app-build-development
    public_bucket: { id: "Nullstack-App-Public", name: "nullstack-app-public" }, // bucket: -> nullstack-app-public-development
    env: {
      region: "sa-east-1",
    },
    app_dir,
    app_env: {
      NULLSTACK_PROJECT_NAME: "[dev] Web",
      NULLSTACK_PROJECT_COLOR: "#D22365",
    },
    build_type: "ssr",
  });
};

main();
```

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
