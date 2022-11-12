import * as cdk from 'aws-cdk-lib';
import { SecretValue } from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkTsCodePipelinesStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName: 'Pipeline',

    });

    const sourceOutput = new Artifact('SourceOutput');
    const cdkBuildOutput = new Artifact('CDKBuildOutput');

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new GitHubSourceAction({
          owner: 'andrewcdowning',
          repo: 'cdk_ts_code_pipelines',
          branch: 'main',
          actionName: 'PipelineSource',
          oauthToken: SecretValue.secretsManager('code-pipeline-token'),
          output: sourceOutput
        })
      ]
    });

    pipeline.addStage({
      stageName: 'Build',
      actions: [
        new CodeBuildAction({
          actionName: 'SourceBuild',
          input: sourceOutput,
          project: new PipelineProject(this, 'PipelineProject', {
            buildSpec: BuildSpec.fromSourceFilename('./build-specs/cdk-buildspec.yml'),
            environment: {
              buildImage: LinuxBuildImage.STANDARD_6_0
            }
          }),
          outputs: [cdkBuildOutput]
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
    })
  }
}
