import * as cdk from 'aws-cdk-lib';
import { SecretValue } from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';
import { ServiceStack } from './service-stack';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PipelinesStack extends cdk.Stack {
  private readonly pipeline: Pipeline;
  private readonly cdkBuildOutput: Artifact;
  private readonly serviceBuildOutput: Artifact;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: 'Pipeline',
      restartExecutionOnUpdate: true

    });

    const cdkSourceOutput = new Artifact('SourceOutput');
    const serviceSourceOutput = new Artifact('ServiceOutput');
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
          output: serviceSourceOutput
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
          input: serviceSourceOutput,
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

  public addServiceStage(serviceStack: ServiceStack, stageName: string) {
    this.pipeline.addStage({
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
  }
}
