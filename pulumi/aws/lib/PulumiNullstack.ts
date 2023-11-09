/* ---------- External ---------- */
import { config, iam, lambda, s3 } from "@pulumi/aws";
import {
  ComponentResource,
  ComponentResourceOptions,
  asset,
  interpolate,
} from "@pulumi/pulumi";
import { createHash } from "crypto";
import { sync } from "glob";
import { join, resolve, sep } from "path";
import { existsSync } from "fs";
import * as mime from "mime";

/* ---------- Interfaces ---------- */
interface Props {
  /**
   * Built Nullstack application SSG directory
   *
   * Directory of the Nullstack application already built
   *
   * E.g: `path.join("..", "web", "ssg")`
   */
  nullstack_app_path: string;

  /**
   * Environment
   *
   * This is also used a suffix for the buckets and lambdas names
   *
   * Example: development, staging, production, etc.
   */
  environment: string;

  /**
   * Nullstack application enviroment variables
   */
  env: Record<string, string | undefined>;

  /**
   * Nullstack Build mode
   *
   * SSR | SSG | SPA
   */
  mode?: "ssr" | "spa" | "ssg";

  /**
   * Domain for static build types (names bucket after this)
   */
  domain?: string;
}

export class PulumiNullstack extends ComponentResource {
  bucket: s3.BucketV2;
  bucket_policy: s3.BucketPolicy;
  access_block: s3.BucketPublicAccessBlock;
  website?: s3.BucketWebsiteConfigurationV2;
  lambda_fn_role?: iam.Role;
  lambda_fn_policy?: iam.RolePolicy;
  lambda_fn?: lambda.Function;
  lambda_fn_url?: lambda.FunctionUrl;
  lambda_fn_invoke_permission?: lambda.Permission;

  public constructor(
    name: string,
    props: Props,
    opts?: ComponentResourceOptions
  ) {
    super(`nullstack-sls:nullstack-app:${name}`, name, {}, opts);

    const { environment, env, nullstack_app_path, mode = "ssr" } = props;

    const zip_path = join(
      __dirname,
      "nullstack-build",
      nullstack_app_path.split(sep).reverse()[0],
      "build.zip"
    );

    if (mode === "ssr" && (!zip_path || !existsSync(zip_path)))
      throw new Error("SSR Missing zip path");

    this.bucket = new s3.BucketV2(
      `${name}-bucket-${environment}`,
      {
        forceDestroy: true,
        bucket: mode === "ssr" ? undefined : props.domain,
      },
      { parent: this }
    );

    this.access_block = new s3.BucketPublicAccessBlock(
      `${name}-bucket-public-access-${environment}`,
      {
        bucket: this.bucket.id,
        blockPublicAcls: false,
        blockPublicPolicy: false,
        ignorePublicAcls: false,
        restrictPublicBuckets: false,
      },
      { parent: this, dependsOn: [this.bucket] }
    );

    this.bucket_policy = new s3.BucketPolicy(
      `${name}-bucket-policy-${environment}`,
      {
        bucket: this.bucket.id,
        policy: {
          Version: "2012-10-17",
          Statement: [
            {
              Sid: `public-${name}-${environment}`,
              Effect: "Allow",
              Principal: "*",
              Action: ["s3:ListBucket", "s3:GetObject", "s3:PutObject"],
              Resource: [this.bucket.arn, interpolate`${this.bucket.arn}/*`],
            },
          ],
        },
      },
      {
        parent: this,
        dependsOn: [this.bucket, this.access_block],
      }
    );

    new s3.BucketCorsConfigurationV2(
      `${name}-bucket-cors-${environment}`,
      {
        bucket: this.bucket.id,
        corsRules: [
          {
            allowedHeaders: ["*"],
            allowedMethods: ["PUT", "POST", "DELETE"],
            allowedOrigins: ["*"],
            exposeHeaders: [],
          },
        ],
      },
      { parent: this, dependsOn: [this.bucket] }
    );

    const files = sync(
      mode === "ssr"
        ? "{public/**,.production/client.css,.production/client.js}"
        : `${mode}/**`,
      {
        cwd: resolve(nullstack_app_path),
        dot: true,
        nodir: true,
        follow: true,
      }
    );

    for (const file of files) {
      const hex = computeHexHash(file);

      // Add all files to the same level /
      const ssr_key = (
        file.startsWith("public")
          ? file
          : `public/${file.split("/").slice(1).join("/")}`
      ).replace("public/", "");

      const key =
        mode === "ssr"
          ? ssr_key
          : ssr_key.replace("public/", "").replace(`${mode}/`, "");

      new s3.BucketObject(
        `${name}-bucket-object-${environment}-${hex}`,
        {
          bucket: this.bucket.id,
          key,
          source: new asset.FileAsset(resolve(nullstack_app_path, file)),
          contentType: mime.getType(file) || undefined,
        },
        { parent: this, dependsOn: [this.bucket_policy, this.bucket] }
      );
    }

    if (mode !== "ssr") {
      this.website = new s3.BucketWebsiteConfigurationV2(
        `${name}-website-${environment}`,
        {
          bucket: this.bucket.id,
          indexDocument: { suffix: "index.html" },
        },
        { dependsOn: [this.bucket, this.bucket_policy, this.access_block] }
      );

      return;
    }

    this.lambda_fn_role = new iam.Role(
      `${name}-server-function-role-${environment}`,
      {
        assumeRolePolicy: iam.assumeRolePolicyForPrincipal({
          Service: "lambda.amazonaws.com",
        }),
        managedPolicyArns: [iam.ManagedPolicies.AWSLambdaBasicExecutionRole],
      },
      { parent: this }
    );

    this.lambda_fn_policy = new iam.RolePolicy(
      `${name}-server-function-policy-${environment}`,
      {
        role: this.lambda_fn_role,
        policy: {
          Statement: [
            {
              Action: [
                "s3:GetObject*",
                "s3:GetBucket*",
                "s3:List*",
                "s3:DeleteObject*",
                "s3:PutObject",
                "s3:PutObjectLegalHold",
                "s3:PutObjectRetention",
                "s3:PutObjectTagging",
                "s3:PutObjectVersionTagging",
                "s3:Abort*",
              ],
              Effect: "Allow",
              Resource: [this.bucket.arn, interpolate`${this.bucket.arn}/*`],
            },
          ],
          Version: "2012-10-17",
        },
      },
      { parent: this, dependsOn: [this.bucket, this.lambda_fn_role] }
    );

    this.lambda_fn = new lambda.Function(
      `${name}-server-function-${environment}`,
      {
        code: new asset.FileArchive(zip_path || ""),
        role: this.lambda_fn_role.arn,
        handler: "index.handler",
        memorySize: 512,
        runtime: "nodejs18.x",
        timeout: 10,
        environment: {
          variables: {
            NULLSTACK_WORKER_CDN: interpolate`https://${this.bucket.bucket}.s3.${config.region}.amazonaws.com`,
            NULLSTACK_PUBLIC_CDN: interpolate`https://${this.bucket.bucket}.s3.${config.region}.amazonaws.com`,
            ...env,
          },
        },
      },
      { parent: this, dependsOn: [this.lambda_fn_policy, this.bucket] }
    );

    this.lambda_fn_url = new lambda.FunctionUrl(
      `${name}-server-url-${environment}`,
      {
        functionName: this.lambda_fn.arn,
        authorizationType: "NONE",
      },
      { parent: this }
    );

    this.lambda_fn_invoke_permission = new lambda.Permission(
      `${name}-server-function-invoke-permission-${environment}`,
      {
        action: "lambda:InvokeFunctionUrl",
        function: this.lambda_fn.arn,
        principal: "apigateway.amazonaws.com",
      },
      { parent: this }
    );
  }
}

function computeHexHash(s: string) {
  return createHash("sha256").update(s).digest("hex");
}
