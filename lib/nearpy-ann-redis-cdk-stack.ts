import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cache from 'aws-cdk-lib/aws-elasticache';

export class NearpyAnnRedisCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create a VPC
    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2
    });

    // Create a security group for the Redis cache
    const cacheSecurityGroup = new ec2.SecurityGroup(this, 'CacheSecurityGroup', {
      vpc
    });

    // Allow incoming traffic on the Redis port
    cacheSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(6379), 'allow incoming traffic on Redis port');

    // Create a Redis cache
    const redisCache = new cache.CfnCacheCluster(this, 'RedisCache', {
      engine: 'redis',
      cacheNodeType: 'cache.m3.medium',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [cacheSecurityGroup.securityGroupId]
    });

    // Create a security group for the Lambda function
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc
    });

    // Grant the Lambda function access to the Redis cache
    cacheSecurityGroup.addIngressRule(lambdaSecurityGroup, ec2.Port.tcp(6379), 'grant access to Redis cache');

    // Create a Lambda function
    const lambdaFn = new lambda.Function(this, 'RedisFunction', {
      runtime: lambda.Runtime.PYTHON_3_9,
      handler: 'lambda_function.lambda_handler',
      code: lambda.Code.fromAsset('lambda_function'),
      securityGroups: [lambdaSecurityGroup],
      vpc,
      environment: {
        CACHE_HOST: redisCache.attrRedisEndpointAddress,
        CACHE_PORT: redisCache.attrRedisEndpointPort
      }
    });
  }
}
