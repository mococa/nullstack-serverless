/* ---------- External ---------- */
import * as pulumi from "@pulumi/pulumi";
import { getRegion, apigatewayv2, lambda } from "@pulumi/aws";

/* ---------- Interfaces ---------- */
export interface ServerlessAppProps {
  /**
   * Lambda function that will be proxied in ApiGateway
   *
   * Example: PulumiNullstack lambda function
   */
  lambda_fn?: lambda.Function;

  /**
   * Environment
   *
   * This is also used a suffix for the buckets and lambdas names
   *
   * Example: development, staging, production, etc.
   */
  environment: string;

  /**
   * Hostname
   *
   * If provided, the hostname will be used instead of the default hostname
   *
   * Example: www.example.com
   */
  hostname?: pulumi.Output<string>;

  /**
   * Certificate ARN
   *
   * If provided, the certificate will be used instead of the default certificate
   *
   * Example: 0000000000000000000000000000000000:certificate/000000000000000000-00000000000000000
   */
  certificate_arn?: pulumi.Output<string>;
}

export class ServerlessApp extends pulumi.ComponentResource {
  api_url: pulumi.Output<string>;
  stage: apigatewayv2.Stage;
  apigateway: apigatewayv2.Api;
  invoke_url: pulumi.Output<string>;
  public_hostname: pulumi.Output<string>;
  apigateway_domain_name: apigatewayv2.DomainName | undefined;
  apigateway_hostname: pulumi.Output<string>;

  constructor(name: string, props: ServerlessAppProps, opts?: pulumi.ResourceOptions) {
    super(`lambda-express:serverless-app:${name}`, name, {}, opts);

    if (!props.lambda_fn) throw new Error("Missing lambda function");

    // Create an API Gateway REST API
    this.apigateway = new apigatewayv2.Api(
      `${name}-gateway-${props.environment}`,
      {
        // ...apiGatewayOptions,
        protocolType: "HTTP",
      },
      { parent: this }
    );

    this.invoke_url = props.hostname
      ? pulumi.interpolate`https://${props.hostname}`
      : pulumi.interpolate`${this.apigateway.apiEndpoint}`;

    const region = pulumi.output(getRegion({}, { parent: this }));
    this.apigateway_hostname = pulumi.interpolate`${this.apigateway.id}.execute-api.${region.name}.amazonaws.com`;

    this.public_hostname = props.hostname
      ? pulumi.output(props.hostname)
      : this.apigateway_hostname;

    new lambda.Permission(
      `${name}-permission-${props.environment}`,
      {
        action: "lambda:InvokeFunction",
        principal: "apigateway.amazonaws.com",
        function: props.lambda_fn,
        sourceArn: pulumi.interpolate`${this.apigateway.executionArn}/*/*`,
      },
      {
        dependsOn: [this.apigateway, props.lambda_fn],
        parent: this,
      }
    );

    const integration = new apigatewayv2.Integration(
      `${name}-integration-${props.environment}`,
      {
        apiId: this.apigateway.id,
        integrationType: "AWS_PROXY",
        integrationUri: props.lambda_fn.arn,
      },
      { parent: this }
    );

    const route = new apigatewayv2.Route(
      `${name}-route-${props.environment}`,
      {
        apiId: this.apigateway.id,
        routeKey: "ANY /{proxy+}",
        target: pulumi.interpolate`integrations/${integration.id}`,
      },
      { parent: this }
    );

    this.stage = new apigatewayv2.Stage(
      `${name}-gateway-stage`,
      {
        apiId: this.apigateway.id,
        name: "$default",
        routeSettings: [],
        autoDeploy: true,
      },
      { dependsOn: [route], parent: this }
    );

    if (props.hostname) {
      if (!props.certificate_arn) {
        throw new pulumi.ResourceError(
          "Must specify apiGatewayCertificateArn if desiredHostname is set",
          this
        );
      }
      this.apigateway_domain_name = new apigatewayv2.DomainName(
        `${name}-apigateway-domain-${props.environment}`,
        {
          domainName: props.hostname,
          domainNameConfiguration: {
            certificateArn: props.certificate_arn,
            endpointType: "REGIONAL",
            securityPolicy: "TLS_1_2",
          },
        },
        { parent: this }
      );

      new apigatewayv2.ApiMapping(
        `${name}-api-mapping-${props.environment}`,
        {
          apiId: this.apigateway.id,
          domainName: this.apigateway_domain_name.id,
          stage: this.stage.name,
        },
        { parent: this }
      );
    }

    this.api_url = this.invoke_url;

    this.registerOutputs({
      invoke_url: this.invoke_url,
      public_hostname: this.public_hostname,
      apigateway_hostname: this.apigateway_hostname,
    });
  }
}
