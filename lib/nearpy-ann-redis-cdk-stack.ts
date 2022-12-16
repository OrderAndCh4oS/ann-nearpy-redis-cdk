import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as cache from 'aws-cdk-lib/aws-elasticache';
import {Architecture} from "aws-cdk-lib/aws-lambda";
import * as path from "path";
import {Duration} from 'aws-cdk-lib';
import {Cors, LambdaIntegration, RestApi} from 'aws-cdk-lib/aws-apigateway';

export class NearpyAnnRedisCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const dimension = '384'
    const cacheName = 'all-MiniLM-L6-v2'

    // Create a VPC
    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2
    });

    // Create a security group for the Redis cache
    const cacheSecurityGroup = new ec2.SecurityGroup(this, 'AnnCacheSecurityGroup', {
      vpc
    });

    // Allow incoming traffic on the Redis port
    cacheSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(6379), 'allow incoming traffic on Redis port');

    const cacheSubnetGroup = new cache.CfnSubnetGroup(this, 'AnnCacheSubnetGroup', {
      subnetIds: vpc.privateSubnets.map(ps => ps.subnetId),
      description: 'RedisSubnetGroup Private Subnets'
    });

    // Create a Redis cache
    const redisCache = new cache.CfnCacheCluster(this, 'AnnCacheRedis', {
      engine: 'redis',
      cacheNodeType: 'cache.t3.micro',
      numCacheNodes: 1,
      vpcSecurityGroupIds: [cacheSecurityGroup.securityGroupId],
      cacheSubnetGroupName: cacheSubnetGroup.ref
    });

    redisCache.addDependsOn(cacheSubnetGroup);

    // Create a security group for the Lambda function
    const lambdaSecurityGroup = new ec2.SecurityGroup(this, 'AnnCacheLambdaSecurityGroup', {
      vpc
    });

    // Grant the Lambda function access to the Redis cache
    cacheSecurityGroup.addIngressRule(lambdaSecurityGroup, ec2.Port.tcp(6379), 'grant access to Redis cache');

    const buildCacheHandler = new lambda.DockerImageFunction(this, 'BuildAnnCacheLambdaFunction', {
      code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, '../lambdas'),
          {
            cmd: ["build_cache.index.handler"]
          }
      ),
      memorySize: 1024,
      timeout: Duration.seconds(30),
      architecture: Architecture.ARM_64,
      securityGroups: [lambdaSecurityGroup],
      vpc,
      environment: {
        CACHE_HOST: redisCache.attrRedisEndpointAddress,
        CACHE_PORT: redisCache.attrRedisEndpointPort,
        CACHE_DIMENSION: dimension,
        CACHE_NAME: cacheName
      },
    });

    const clearCacheHandler = new lambda.DockerImageFunction(this, 'ClearAnnCacheLambdaFunction', {
      code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, '../lambdas'),
          {
            cmd: ["clear_cache.index.handler"]
          }
      ),
      memorySize: 256,
      timeout: Duration.seconds(3),
      architecture: Architecture.ARM_64,
      securityGroups: [lambdaSecurityGroup],
      vpc,
      environment: {
        CACHE_HOST: redisCache.attrRedisEndpointAddress,
        CACHE_PORT: redisCache.attrRedisEndpointPort,
        CACHE_DIMENSION: dimension,
        CACHE_NAME: cacheName
      },
    });

    const addToCacheHandler = new lambda.DockerImageFunction(this, 'AddAnnCacheLambdaFunction', {
      code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, '../lambdas'),
          {
            cmd: ["add_embedding.index.handler"]
          }
      ),
      memorySize: 256,
      timeout: Duration.seconds(3),
      architecture: Architecture.ARM_64,
      securityGroups: [lambdaSecurityGroup],
      vpc,
      environment: {
        CACHE_HOST: redisCache.attrRedisEndpointAddress,
        CACHE_PORT: redisCache.attrRedisEndpointPort,
        CACHE_DIMENSION: dimension,
        CACHE_NAME: cacheName
      },
    });

    const searchCacheHandler = new lambda.DockerImageFunction(this, 'QueryAnnCacheLambdaFunction', {
      code: lambda.DockerImageCode.fromImageAsset(
          path.join(__dirname, '../lambdas'),
          {
            cmd: ["search_embeddings.index.handler"]
          }
      ),
      memorySize: 256,
      timeout: Duration.seconds(3),
      architecture: Architecture.ARM_64,
      securityGroups: [lambdaSecurityGroup],
      vpc,
      environment: {
        CACHE_HOST: redisCache.attrRedisEndpointAddress,
        CACHE_PORT: redisCache.attrRedisEndpointPort,
        CACHE_DIMENSION: dimension,
        CACHE_NAME: cacheName
      },
    });

    const api = new RestApi(this, 'AnnCache_Api', {
      defaultCorsPreflightOptions: {
        allowHeaders: Cors.DEFAULT_HEADERS,
        allowMethods: Cors.ALL_METHODS,
        allowOrigins: Cors.ALL_ORIGINS
      },
    });

    const cacheResource = api.root.addResource('cache');
    const buildCacheResource = cacheResource.addResource('build');
    buildCacheResource.addMethod('post', new LambdaIntegration(buildCacheHandler));
    const clearCacheResource = cacheResource.addResource('clear');
    clearCacheResource.addMethod('put', new LambdaIntegration(clearCacheHandler))
    const addToResource = cacheResource.addResource('add');
    addToResource.addMethod('post', new LambdaIntegration(addToCacheHandler))
    const searchResource = api.root.addResource('search');
    searchResource.addMethod('post', new LambdaIntegration(searchCacheHandler))
  }
}
