import { App, StackSynthesizer } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { BillingStack } from "../lib/BillingStack";
import { PipelinesStack } from "../lib/pipelines-stack";
import { ServiceStack } from "../lib/service-stack";

test('Pipeline', () => {
    const app = new App();
    const stack = new PipelinesStack(app, 'PipelineTestStack')

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();

});

test('Adding service stage', () => {
    const app = new App();
    const serviceStack = new ServiceStack(app, 'ServiceStack', {
        stageName: 'test'
    });
    const pipelineStack = new PipelinesStack(app, 'PipelineStack');

    pipelineStack.addServiceStage(serviceStack, 'testStack');

    const template = Template.fromStack(pipelineStack);
    expect(template.hasResourceProperties("AWS::CodePipeline::Pipeline", {
        "Stages": [
            {}, {}, {},
            {
                "Name": 'testStack'
            }
        ]
    }));
});


test('Adding billing stake to stage', () => {
    const app = new App();
    const serviceStack = new ServiceStack(app, 'ServiceStack', {
        stageName: 'test'
    });
    const pipelineStack = new PipelinesStack(app, 'PipelineStack');
    const billingStack = new BillingStack(app, 'billingTest', {
        amount: 5,
        emailAddress: 'test@test.com',
        threshold: 5
    })

    const stage = pipelineStack.addServiceStage(serviceStack, 'testStack');
    pipelineStack.addBillingStackToStage(billingStack, stage)

    const template = Template.fromStack(pipelineStack);
    expect(template.hasResourceProperties("AWS::CodePipeline::Pipeline", {
        "Stages": [
            {}, {}, {},
            {
                "Actions": [
                    {},
                    {"Name": "BillingStack"}
                    
                ]
            }
        ]
    }));
});
