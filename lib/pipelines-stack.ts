import * as cdk from 'aws-cdk-lib';
import { SecretValue } from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PipelinesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: 'Pipeline',
      restartExecutionOnUpdate: true;

    });

    const cdkSourceOutput = new Artifact('SourceOutput');
    const serviceSourceOutput = new Artifact('ServiceOutput');
    const cdkBuildOutput = new Artifact('CDKBuildOutput');
    const serviceBuildOutput = new Artifact('ServiceBuildOutput');

    pipeline.addStage({
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

    pipeline.addStage({
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
          outputs: [cdkBuildOutput]
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
          outputs: [serviceBuildOutput]
        })
      ]
    });

    pipeline.addStage({
      stageName: 'PipelineUpdate',
      actions: [
        new CloudFormationCreateUpdateStackAction({
           actionName: 'PipelineUpdate',
           stackName: 'Pipeline-stack',
           templatePath: cdkBuildOutput.atPath('Pipeline.template.json'),
           adminPermissions: true
        })
      ]
    });
  }
}
