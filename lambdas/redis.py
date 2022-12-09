import os
import redis

def lambda_handler(event, context):
    # Get the cache host and port from the environment variables
    cache_host = os.environ["CACHE_HOST"]
    cache_port = os.environ["CACHE_PORT"]

    # Connect to the Redis cache
    r = redis.Redis(host=cache_host, port=cache_port, decode_responses=True)

    # Use the Redis cache
    r.set("my-key", "my-value")
    value = r.get("my-key")
    print(value)

    return "Success"