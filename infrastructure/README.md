## Infrastructure folder

Here, it lays the CDK App. Where the magic happens.
There is a a `src/index.ts` file, there is a CDK app being instantiated and the nullstack stack being called passing some props to it.

What the stack, that is located at `lib/null-stack.ts`, does is:

1. It creates an s3 bucket to host all the public files
2. It creates a private s3 bucket to host the build files. in it, there will be a folder, with an index.js, where it uses [@vendia/serverless-express](https://github.com/vendia/serverless-express), where it gets the Express server in Nullstack and converts it into a lambda function; in this folder there is also the node_modules of this external package, and a .production folder from nullstack (changed server.js in it removing the crossorigin attribute - [explained here](https://github.com/nullstack/nullstack/pull/355))
3. It deploys the necessary files into these buckets
4. It creates a lambda that will run the files in the build bucket
5. It creates an API Gateway with the route `/` and the route `/{proxy+}` for the rest of the routes.
6. It creates a lambda function url for it to be accessible.

### Scripts

You can run `yarn deploy` and it will do everything it takes to deploy the application.

# Welcome to your CDK TypeScript project

This is a blank project for CDK development with TypeScript.

The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template
