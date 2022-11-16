import { Canary, Runtime, Schedule, Test } from "@aws-cdk/aws-synthetics-alpha";
import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { Code } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as fs from "fs";
import * as path from "path";


export interface ServiceHealthCanaryProps extends StackProps{
    apiEndpoint: string;
    canaryName: string;
}
export class ServiceHealthCanary extends Stack {
    constructor(scope: Construct, id: string, props: ServiceHealthCanaryProps) {
        super(scope, id, props);

        new Canary(this, props.canaryName, {
            runtime: Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_8,
            canaryName: props.canaryName,
            schedule: Schedule.rate(Duration.minutes(1)),
            environmentVariables: {
                API_ENDPOINT: props.apiEndpoint,
                DEPLOYMENT_TRIGGER: Date.now().toString()
            },
            test: Test.custom({
                code: Code.fromInline(
                    fs.readFileSync(
                        path.join(__dirname, "../../canary/canary.ts"),
                        "utf-8"
                    )
                ),
                handler: "index.handler"
            }),
            timeToLive: Duration.minutes(5)
        });
    }
}