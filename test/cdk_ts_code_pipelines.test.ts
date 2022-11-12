import { App, StackSynthesizer } from "aws-cdk-lib";
import { Template } from "aws-cdk-lib/assertions";
import { PipelinesStack } from "../lib/pipelines-stack";

test('Pipeline', () => {
    const app = new App();
    const stack = new PipelinesStack(app, 'PipelineTestStack')

    const template = Template.fromStack(stack);
    expect(template.toJSON()).toMatchSnapshot();

});
