import { HttpApi, HttpIntegration } from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha"
import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { CfnOutcome } from "aws-cdk-lib/aws-frauddetector";
import { CfnParametersCode, Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";


export interface ServiceStackProps extends StackProps{
    stageName: string;
}

export class ServiceStack extends Stack {

    public serviceCode: CfnParametersCode;
    public serviceEndpointOutput: CfnOutput;

    constructor(scope: Construct, id: string, props: ServiceStackProps){
        super(scope, id, props);

        this.serviceCode = Code.fromCfnParameters();

        const lambdaFunction = new Function(this, 'ServiceLambda', {
            runtime: Runtime.NODEJS_16_X,
            handler: 'src/lambda.handler',
            code: this.serviceCode,
            functionName: `ServiceLambda-${props.stageName}`
        });

        const proxyApi = new HttpApi(this, 'ServiceProxyApi', {
            defaultIntegration: new HttpLambdaIntegration('LambdaIntegration', lambdaFunction),
            apiName: `ServiceApi-${props.stageName}`
        });

        this.serviceEndpointOutput = new CfnOutput(this, 'ApiEndpointOutput', {
            exportName: `ServiceEndpoint${props.stageName}`,
            value: proxyApi.apiEndpoint,
            description: "API Endpoint"
        });
    }
}