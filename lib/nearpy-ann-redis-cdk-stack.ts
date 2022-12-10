import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cache from 'aws-cdk-lib/aws-elasticache';
import {Architecture} from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import {Duration} from 'aws-cdk-lib';

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

    const cacheSubnetGroup = new cache.CfnSubnetGroup(this, 'RedisSubnetGroup', {
      subnetIds: vpc.privateSubnets.map(ps => ps.subnetId),
      description: 'RedisSubnetGroup Private Subnets'
    });

    // Create a Redis cache
    const redisCache = new cache.CfnCacheCluster(this, 'RedisCache', {
      engine: 'redis',
      cacheNodeType: 'cache.t3.small',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [cacheSecurityGroup.securityGroupId],
      cacheSubnetGroupName: cacheSubnetGroup.ref
    });

    redisCache.addDependsOn(cacheSubnetGroup);

    // Create a security group for the Lambda function
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'LambdaSecurityGroup', {
      vpc
    });

    // Grant the Lambda function access to the Redis cache
    cacheSecurityGroup.addIngressRule(lambdaSecurityGroup, ec2.Port.tcp(6379), 'grant access to Redis cache');

    new lambda.DockerImageFunction(this, 'RedisLambdaFunction', {
      code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, '../lambdas'),
          {
            cmd: ["handler_redis.index.handler"]
          }
      ),
      memorySize: 512,
      timeout: Duration.seconds(12),
      architecture: Architecture.ARM_64,
      securityGroups: [lambdaSecurityGroup],
      vpc,
      environment: {
        CACHE_HOST: redisCache.attrRedisEndpointAddress,
        CACHE_PORT: redisCache.attrRedisEndpointPort
      },
    });
  }
}
