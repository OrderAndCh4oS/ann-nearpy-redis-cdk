import os
import json
import redis
import numpy as np
from nearpy import Engine
from nearpy.hashes import RandomBinaryProjections
from nearpy.filters import NearestFilter
from nearpy.storage import RedisStorage

# Todo: Test endpoint to build cache and engine
# Todo: Test endpoint to add embedding, data should be key to dynamoDb row.
# Todo: Test endpoint to search embedding, should return a list of dynamoDb keys and accuracy
# Todo: Test endpoint to clear cache
# Todo: Create endpoint to rebuild cache. Embeddings need to be stored in dynamoDb and rebuild should batch inserts reading from a kinesis stream.

cache_host = os.environ["CACHE_HOST"]
cache_port = os.environ["CACHE_PORT"]

dimension = 1024

r = redis.Redis(host=cache_host, port=cache_port)

storage = RedisStorage(r)
config = storage.load_hash_configuration('search-cache')
lshash = RandomBinaryProjections(None, None)
lshash.apply_config(config)
engine = Engine(dimension, lshashes=[lshash], storage=storage)

def handler(event, context):
    body = json.loads(event["body"])
    print(body)

    errors = []
    if not body["embedding"]:
        errors.append('Missing embedding parameter')
    if not body["pk"]:
        errors.append('Missing pk parameter')
    if not body["sk"]:
        errors.append('Missing sk parameter')

    print(f"Errors: {errors}")

    if(len(errors)):
        return {
           "statusCode": 400,
           "body": json.dumps(errors)
       }

    embedding = np.array(body["embedding"])
    data = json.dumps({"pk": body["pk"], "sk": body["sk"]})

    print(body["embedding"])
    print(data)

    engine.store_vector(embedding, data)

    storage.store_hash_configuration(lshash)

    return {
        "statusCode": 204,
        "body": ""
    }
