/* ---------- External ---------- */
import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as s3deployment from "aws-cdk-lib/aws-s3-deployment";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as apigateway from "aws-cdk-lib/aws-apigatewayv2";
import { Construct } from "constructs";

/* ---------- Interfaces ---------- */
interface Props extends cdk.StackProps {
  build_bucket_name: string;
  public_bucket_name: string;
  environment: string;
}

export class NullstackAppStack extends cdk.Stack {
  /* ---------- Helpers ---------- */
  getBucket(
    { name, bucket_name }: { name: string; bucket_name: string },
    props: cdk.aws_s3.BucketProps
  ): s3.IBucket {
    try {
      // Try to import the existing bucket
      return s3.Bucket.fromBucketName(this, name, bucket_name);
    } catch (error) {
      // If importing fails, create a new bucket
      return new s3.Bucket(this, name, props);
    }
  }

  constructor(scope: Construct, id: string, props: Props) {
    super(scope, id, props);

    /* ---------- Constants ---------- */
    const { environment, build_bucket_name, public_bucket_name } = props;
    const { asset } = s3deployment.Source;

    /* ----------
     * Buckets
     * --------- */

    // Public assets (cdn)
    const public_bucket = this.getBucket(
      {
        bucket_name: public_bucket_name,
        name: `Nullstack-App-Public-Bucket-${environment}`,
      },
      {
        bucketName: `${public_bucket_name}-${environment}`,
        publicReadAccess: true,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        versioned: true,
      }
    );

    // Build assets (nullstack app)
    const build_bucket = this.getBucket(
      {
        bucket_name: build_bucket_name,
        name: `Nullstack-App-Build-Bucket-${environment}`,
      },
      {
        bucketName: `${build_bucket_name}-${environment}`,
        removalPolicy: cdk.RemovalPolicy.RETAIN,
        blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
        versioned: true,
      }
    );

    /* ----------
     * Buckets deployment
     * -------- */

    // Deploy public assets
    new s3deployment.BucketDeployment(
      this,
      `Nullstack-App-Public-Deployment-${environment}`,
      {
        sources: [
          // Getting nullstack public folder
          asset(`../lambda/public`),

          // Getting client.js and client.css
          asset(`../lambda/.production`, {
            exclude: [
              "client.css.map",
              "client.js.map",
              "server.js.map",
              "server.js",
            ],
          }),
        ],
        destinationBucket: public_bucket,
      }
    );

    // Deploy build assets
    new s3deployment.BucketDeployment(
      this,
      `Nullstack-App-Build-Deployment-${environment}`,
      {
        sources: [asset(`../lambda/nullstack-build.zip`)],
        destinationBucket: build_bucket,
      }
    );

    /* ----------
     *  Lambdas
     * -------- */

    // Create lambda that will the build bucket assets
    const lambda_function = new lambda.Function(
      this,
      `Nullstack-App-Lambda-${environment}`,
      {
        functionName: `nullstack-app-lambda-function-${environment}`,
        description: "Lambda function that runs nullstack and serves the app",
        runtime: lambda.Runtime.NODEJS_18_X,
        code: lambda.Code.fromBucket(build_bucket, "build.zip"),
        timeout: cdk.Duration.seconds(10),
        handler: "index.handler",
        memorySize: 512,
        environment: {
          NULLSTACK_PROJECT_NAME: "[dev] Web",
          NULLSTACK_PROJECT_COLOR: "#D22365",
          NULLSTACK_WORKER_CDN: public_bucket.bucketWebsiteUrl,
          LAMBDA: "true",
        },
      }
    );

    // Grating permission to read the bucket
    build_bucket.grantReadWrite(lambda_function);

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
  }
}
