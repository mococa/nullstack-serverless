/* ---------- External ---------- */
import path from "path";
import zipper from "adm-zip";

/* ---------- CDK ---------- */
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deployment from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import { Construct } from "constructs";

/* ---------- Types ---------- */
import { NullStackCDK } from "./@types";

/* ---------- Interfaces ---------- */
interface Bucket {
  /**
   * Bucket resource ID
   */
  id: string;

  /**
   * Bucket name
   */
  name: string;
}

type SSG = {
  build_type: "ssg";

  /**
   * Bucket to host all files generated in the SSG build
   */
  bucket: Bucket;

  /**
   * Built Nullstack application SSG directory
   *
   * Directory of the Nullstack application already built
   *
   * E.g: `path.join("..", "web", "ssg")`
   */
  build_dir: string;
};

type SPA = {
  build_type: "spa";

  /**
   * Bucket to host all files generated in the SPA build
   */
  bucket: Bucket;

  /**
   * Built Nullstack application SPA directory
   *
   * Directory of the Nullstack application already built
   *
   * E.g: `path.join("..", "web", "spa")`
   */
  build_dir: string;
};

type SSR = {
  build_type: "ssr";

  /**
   * Bucket to host a zip file containing all the build assets
   */
  build_bucket: Bucket;

  /**
   * Bucket to host all the Nullstack public folder
   */
  public_bucket: Bucket;

  /**
   * Nullstack application directory
   *
   * Directory with the Nullstack application already built
   *
   * E.g: `path.join("..", "web")`
   */
  app_dir: string;
};

type Props = cdk.StackProps & {
  /**
   * Environment
   *
   * This is also used a suffix for the buckets ids and names
   *
   * Example: development, staging, production, etc.
   */
  environment: string;

  /**
   * Nullstack application enviroment variables
   */
  app_env: Record<string, string>;
} & (SSG | SSR | SPA);

export class NullstackAppStack extends cdk.Stack {
  /* ---------- Helpers ---------- */
  getBucket({
    bucket_name,
    resource_name,
    environment,
    ...props
  }: NullStackCDK.GetBucket): s3.IBucket {
    return new s3.Bucket(this, `${resource_name}-${environment}`, {
      bucketName: `${bucket_name}-${environment}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      versioned: true,
      ...props,
    });
  }

  /**
   * Bucket for public nullstack assets
   *
   * For SSR, it hosts only the public folder
   * For SSG, it hosts the entire build folder
   */
  public_s3_bucket: cdk.aws_s3.IBucket;

  /**
   * Bucket for public nullstack assets
   *
   * For SSR, it hosts .production folder
   * For SSG, it is the same as `public_s3_bucket`
   */
  build_s3_bucket: cdk.aws_s3.IBucket;

  /**
   * Available only for SSR
   *
   * Lambda for running the SSR nullstack app
   */
  lambda_function: cdk.aws_lambda.Function;

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    /* ---------- Constants ---------- */
    const { environment, build_type, app_env } = props;

    const { asset } = s3deployment.Source;

    /* ----------
     * Buckets
     * --------- */

    // Public assets (cdn)
    this.public_s3_bucket = this.getBucket({
      bucket_name:
        build_type === "ssr" ? props.public_bucket.name : props.bucket.name,
      resource_name:
        build_type === "ssr" ? props.public_bucket.id : props.bucket.id,
      environment,

      // S3 props
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      websiteIndexDocument: build_type !== "ssr" ? "index.html" : undefined,
      websiteErrorDocument: build_type === "ssg" ? "404.html" : undefined,
    });

    this.public_s3_bucket.grantPublicAccess();

    // Build assets (nullstack ssr app)
    if (build_type === "ssr") {
      this.build_s3_bucket = this.getBucket({
        bucket_name: props.build_bucket.name,
        resource_name: props.build_bucket.id,
        environment,

        // S3 props
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
        accessControl: s3.BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      });
    } else {
      this.build_s3_bucket = this.public_s3_bucket;
    }

    /* ----------
     * Bucket deployments
     * -------- */

    // Deploy public assets
    const sources =
      build_type === "ssr"
        ? [
            // Getting nullstack public folder
            asset(path.join(props.app_dir, "public")),

            // Getting client.js and client.css
            asset(path.join(props.app_dir, ".production"), {
              exclude: [
                "client.css.map",
                "client.js.map",
                "server.js.map",
                "server.js",
              ],
            }),
          ]
        : [
            // Getting nullstack public folder
            asset(props.build_dir),
          ];

    const public_bucket_deployment = new s3deployment.BucketDeployment(
      this,
      `Nullstack-App-Public-Deployment-${environment}`,
      { sources, destinationBucket: this.public_s3_bucket }
    );

    // Add dependencies
    public_bucket_deployment.node.addDependency(this.public_s3_bucket);

    if (build_type !== "ssr") return;

    // Deploy build assets
    const build_bucket_deployment = new s3deployment.BucketDeployment(
      this,
      `Nullstack-App-Build-Deployment-${environment}`,
      {
        sources: [asset("nullstack-build.zip")],
        destinationBucket: this.build_s3_bucket,
      }
    );

    /* ----------
     *  Lambdas
     * -------- */
    const cdn = `https://${props.public_bucket.name}-${environment}.s3.${props.env?.region}.amazonaws.com`;

    // Create lambda that will the build bucket assets
    const lambda_function = new lambda.Function(
      this,
      `Nullstack-App-Lambda-${environment}`,
      {
        functionName: `nullstack-app-lambda-function-${environment}`,
        description: "Lambda function that runs nullstack and serves the app",
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromBucket(this.build_s3_bucket, "build.zip"),
        timeout: cdk.Duration.seconds(10),
        handler: "index.handler",
        memorySize: 512,
        environment: {
          NULLSTACK_WORKER_CDN: cdn,
          NULLSTACK_PUBLIC_CDN: cdn,
          ...app_env,
          LAMBDA: "true",
        },
      }
    );

    // Grating permission to read the bucket
    this.build_s3_bucket.grantReadWrite(lambda_function);

    /* ----------
     * API Gateway
     * --------- */

    // Create the API Gateway
    const api = new apigateway.CfnApi(
      this,
      `Nullstack-App-API-Gateway-API-${environment}`,
      {
        name: `nullstack-app-apigateway-${environment}`,
        description: "Nullstack lambda API Gateway",
        protocolType: "HTTP",
        corsConfiguration: {
          allowCredentials: false,
          allowHeaders: ["*"],
          allowMethods: ["*"],
          allowOrigins: ["*"],
          exposeHeaders: ["*"],
        },
      }
    );

    // Create the API Gateway integration
    const integration = new apigateway.CfnIntegration(
      this,
      `Nullstack-App-API-Gateway-Integration-${environment}`,
      {
        description: "Nullstack lambda API Gateway integration",
        payloadFormatVersion: "2.0",
        apiId: api.ref,
        integrationType: "AWS_PROXY",
        integrationUri: `arn:aws:apigateway:${cdk.Aws.REGION}:lambda:path/2015-03-31/functions/${lambda_function.functionArn}/invocations`,
        passthroughBehavior: "WHEN_NO_MATCH",
      }
    );

    // Create the API Gateway routes
    new apigateway.CfnRoute(
      this,
      `Nullstack-App-API-Gateway-Route-Root-${environment}`,
      {
        apiId: api.ref,
        routeKey: "ANY /",
        target: `integrations/${integration.ref}`,
      }
    );

    new apigateway.CfnRoute(
      this,
      `Nullstack-App-API-Gateway-Route-Proxy-${environment}`,
      {
        apiId: api.ref,
        routeKey: "ANY /{proxy+}",
        target: `integrations/${integration.ref}`,
      }
    );

    // Create the lambda function URL
    lambda_function.addFunctionUrl({
      cors: {
        allowCredentials: false,
        allowedHeaders: ["*"],
        allowedOrigins: ["*"],
        exposedHeaders: ["*"],
      },
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    // Add dependencies
    build_bucket_deployment.node.addDependency(this.build_s3_bucket);
    lambda_function.node.addDependency(
      build_bucket_deployment,
      public_bucket_deployment
    );
  }
}
