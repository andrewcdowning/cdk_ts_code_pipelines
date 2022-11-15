import * as cdk from 'aws-cdk-lib';
import { SecretValue } from 'aws-cdk-lib';
import { BuildEnvironmentVariableType, BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, IStage, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, CodeBuildActionType, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { EventField, RuleTargetInput } from 'aws-cdk-lib/aws-events';
import { SnsTopic } from 'aws-cdk-lib/aws-events-targets';
import { Topic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Construct } from 'constructs';
import { BillingStack } from './BillingStack';
import { ServiceStack } from './service-stack';


export class PipelinesStack extends cdk.Stack {
  private readonly pipeline: Pipeline;
  private readonly cdkBuildOutput: Artifact;
  private readonly serviceBuildOutput: Artifact;
  private readonly serviceSourceOutput: Artifact;
  public readonly pipelineNotificationTopic: Topic;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: 'Pipeline',
      restartExecutionOnUpdate: true
    });

    this.pipelineNotificationTopic = new Topic(this, 'PipelineNotificationTopic', {
      topicName: 'PipelineNotificationTopic'
    });
    this.pipelineNotificationTopic.addSubscription(new EmailSubscription('andrew.c.downing@gmail.com'));

    const cdkSourceOutput = new Artifact('SourceOutput');
    this.serviceSourceOutput = new Artifact('ServiceOutput');
    this.cdkBuildOutput = new Artifact('CDKBuildOutput');
    this.serviceBuildOutput = new Artifact('ServiceBuildOutput');

    this.pipeline.addStage({
      stageName: 'Source',
      actions: [
        new GitHubSourceAction({
          owner: 'andrewcdowning',
          repo: 'cdk_ts_code_pipelines',
          branch: 'main',
          actionName: 'PipelineSource',
          oauthToken: SecretValue.secretsManager('code-pipeline-token'),
          output: cdkSourceOutput
      
        }),
        new GitHubSourceAction({
          owner: 'andrewcdowning',
          repo: 'express_lambda_cdk_pipelines',
          branch: 'main',
          actionName: 'ServiceSource',
          oauthToken: SecretValue.secretsManager('code-pipeline-token'),
          output: this.serviceSourceOutput
        })
      ]
    });

    this.pipeline.addStage({
      stageName: 'Build',
      actions: [
        new CodeBuildAction({
          actionName: 'SourceBuild',
          input: cdkSourceOutput,
          project: new PipelineProject(this, 'PipelineProject', {
            buildSpec: BuildSpec.fromSourceFilename('./build-specs/cdk-buildspec.yml'),
            environment: {
              buildImage: LinuxBuildImage.STANDARD_6_0
            }
          }),
          outputs: [this.cdkBuildOutput]
        }),
        new CodeBuildAction({
          actionName: 'ServiceBuild',
          input: this.serviceSourceOutput,
          project: new PipelineProject(this, 'ServiceBuildProject', {
            buildSpec: BuildSpec.fromSourceFilename('./build-specs/service-buildspec.yml'),
            environment: {
              buildImage: LinuxBuildImage.STANDARD_6_0
            }
          }),
          outputs: [this.serviceBuildOutput]
        })
      ]
    });

    this.pipeline.addStage({
      stageName: 'PipelineUpdate',
      actions: [
        new CloudFormationCreateUpdateStackAction({
           actionName: 'PipelineUpdate',
           stackName: 'Pipeline-stack',
           templatePath: this.cdkBuildOutput.atPath('Pipeline.template.json'),
           adminPermissions: true
        })
      ]
    });

  }

  public addServiceStage(serviceStack: ServiceStack, stageName: string): IStage {
    return this.pipeline.addStage({
      stageName: stageName,
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: 'ServiceUpdate',
          stackName: serviceStack.stackName,
          templatePath: this.cdkBuildOutput.atPath(`${serviceStack.stackName}.template.json`),
          adminPermissions: true,
          parameterOverrides: {
            ...serviceStack.serviceCode.assign(this.serviceBuildOutput.s3Location)
          },
          extraInputs: [this.serviceBuildOutput]
       })
      ]
    })
  };

  public addBillingStackToStage(billingStack: BillingStack, stage: IStage) {
    stage.addAction( new CloudFormationCreateUpdateStackAction({
      actionName: 'BillingStack',
      stackName: billingStack.stackName,
      templatePath: this.cdkBuildOutput.atPath(`${billingStack.stackName}.template.json`),
      adminPermissions: true
    }))
  };

  public addServiceIntegrationTest(stage: IStage, serviceEndpoint: string){
    const action = new CodeBuildAction({
      actionName: "IntegrationTests",
      input: this.serviceSourceOutput,
      project: new PipelineProject(this, "ServiceIntegrationTests", {
        environment: {
          buildImage: LinuxBuildImage.STANDARD_6_0
        },
        buildSpec: BuildSpec.fromSourceFilename("build-specs/integ-test-build-spec.yml")
      }),
      environmentVariables: {
        SERVICE_ENDPOINT: {
          value: serviceEndpoint,
          type: BuildEnvironmentVariableType.PLAINTEXT
        }
      },
      type: CodeBuildActionType.TEST,
      runOrder: 2
    });

    stage.addAction(action)
    action.onStateChange('FailedTest', new SnsTopic(this.pipelineNotificationTopic, {
      message: RuleTargetInput.fromText(
        `Integration test failed.  ${EventField.fromPath('$.detail.execution-result.external-execution-url')}`
        )}
      ),
      {
        ruleName: 'IntegrationTestFailed',
        eventPattern: {
          detail: {
            state: ['FAILED']
          }
        },
        description: "Integration test has failed"
      }
    )
  };
}
