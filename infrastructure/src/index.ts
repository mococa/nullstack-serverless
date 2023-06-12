import * as cdk from "aws-cdk-lib";
import { NullstackAppStack } from "../lib/null-stack";

const app = new cdk.App();

new NullstackAppStack(app, "NullstackAppStack", {
  environment: "development",
  build_bucket_name: "nullstack-app-build",
  public_bucket_name: "nullstack-app-public",
  env: {
    region: 'sa-east-1'
  }
});
