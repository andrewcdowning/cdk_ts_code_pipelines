import { HttpApi, HttpIntegration } from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha"
import { CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import { Statistic, TreatMissingData } from "aws-cdk-lib/aws-cloudwatch";
import { LambdaDeploymentConfig, LambdaDeploymentGroup } from "aws-cdk-lib/aws-codedeploy";
import { CfnOutcome } from "aws-cdk-lib/aws-frauddetector";
import { Alias, CfnParametersCode, Code, Function, Runtime, Version } from "aws-cdk-lib/aws-lambda";
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
            functionName: `ServiceLambda-${props.stageName}`,
            description: `Genrated on ${new Date().toISOString()}`
        });

        const alias = new Alias(this, 'LambdaAlias', {
            version: lambdaFunction.currentVersion,
            aliasName: `ServiceLambdaAlias${props.stageName}`
        })

        const proxyApi = new HttpApi(this, 'ServiceProxyApi', {
            defaultIntegration: new HttpLambdaIntegration('LambdaIntegration', alias),
            apiName: `ServiceApi-${props.stageName}`
        });

        if(props.stageName === 'prod') {
            new LambdaDeploymentGroup(this, 'DeploymentGroup', {
                alias: alias,
                deploymentConfig: LambdaDeploymentConfig.CANARY_10PERCENT_5MINUTES,
                autoRollback: {
                    deploymentInAlarm: true
                },
                alarms: [
                    proxyApi.metricServerError().with({
                        period: Duration.minutes(1),
                        statistic: Statistic.SUM
                    })
                    .createAlarm(this, 'ServiceErrorAlarm', {
                        threshold: 1,
                        alarmDescription: "Service is experiancing errors",
                        alarmName: 'ServiceAlarm',
                        evaluationPeriods: 1,
                        treatMissingData: TreatMissingData.NOT_BREACHING
                    })
                ]
            });
        };

        this.serviceEndpointOutput = new CfnOutput(this, 'ApiEndpointOutput', {
            exportName: `ServiceEndpoint${props.stageName}`,
            value: proxyApi.apiEndpoint,
            description: "API Endpoint"
        });
    }
}