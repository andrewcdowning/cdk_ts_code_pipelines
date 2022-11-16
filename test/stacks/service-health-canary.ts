import { App, Stack } from "aws-cdk-lib"
import { Template } from "aws-cdk-lib/assertions";
import { ServiceHealthCanary } from "../../lib/constructs/ServiceHealthCanary";

test('ServiceHealtCanary', () => {
    const app = new App();
    const stack = new Stack(app, 'testStack');

    new ServiceHealthCanary(stack, 'test', {
        canaryName: 'testCanary',
        apiEndpoint: 'test.com'
    });

    const template = Template.fromStack(stack)

    template.hasResourceProperties("AWS::Synthetics::Canary", {
        Runconfig: {
            EnvironmentVariables: {
                API_ENDPOINT: 'test.com'
            }
        }
    })
})