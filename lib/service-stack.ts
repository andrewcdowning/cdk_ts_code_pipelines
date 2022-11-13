import { HttpApi, HttpIntegration } from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha"
import { Stack, StackProps } from "aws-cdk-lib";
import { CfnParametersCode, Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";

export class ServiceStack extends Stack {

    public serviceCode: CfnParametersCode;

    constructor(scope: Construct, id: string, props: StackProps){
        super(scope, id, props);

        this.serviceCode = Code.fromCfnParameters();

        const lambdaFunction = new Function(this, 'ServiceLambda', {
            runtime: Runtime.NODEJS_16_X,
            handler: 'src/lambda.jandler',
            code: this.serviceCode,
            functionName: 'ServiceLambda'
        });

        const proxyApi = new HttpApi(this, 'ServiceProxyApi', {
            defaultIntegration: new HttpLambdaIntegration('LambdaIntegration', lambdaFunction),
            apiName: "ServiceApi"
        });
    }
}