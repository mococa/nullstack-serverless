import * as cdk from "aws-cdk-lib";
import { NullstackAppStack, zip_nullstack } from "../src";

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
