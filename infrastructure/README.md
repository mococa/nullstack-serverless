## Infrastructure folder

Here, it lays the CDK App. Where the magic happens.
There is a a `testing/index.ts` file, there is a CDK app being instantiated and creating 3 nullstack apps.

What the construct, that is located at `lib/nullstack-construct.ts`, does is:

1. It creates an s3 bucket to host all the public files.
2. (SSR only) It creates a private s3 bucket to host the build files. in it, there will be a folder, with an index.js, where it uses [@codegenie/serverless-express](https://github.com/CodeGenieApp/serverless-express), and gets the Express server in Nullstack and converts it into a lambda function; in this folder there is also the node_modules of this external package, and a .production folder from nullstack (changed server.js in it removing the crossorigin attribute - [explained here](https://github.com/nullstack/nullstack/pull/355), but got merged on [Nullstack v0.19.2](https://github.com/nullstack/nullstack/releases/tag/v0.19.2)).
3. It deploys the necessary files into these buckets.
4. (SSR only) It creates a lambda that will run the files in the build bucket
5. (SSR only) It creates an API Gateway with the route `/` and the route `/{proxy+}` for the rest of the routes.
6. (SSR only) It creates a lambda function url for it to be accessible.
7. (SSG and SPA only) It creates an s3 website url for it to be accessible.