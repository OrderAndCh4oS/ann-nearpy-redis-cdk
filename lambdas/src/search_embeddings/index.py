import os
import json
import redis
import numpy as np
from nearpy import Engine
from nearpy.hashes import RandomBinaryProjections
from nearpy.filters import NearestFilter
from nearpy.storage import RedisStorage

cache_host = os.environ["CACHE_HOST"]
cache_port = os.environ["CACHE_PORT"]
cache_name = os.environ["CACHE_NAME"]
cache_dimension = int(os.environ["CACHE_DIMENSION"])

r = redis.Redis(host=cache_host, port=cache_port)

storage = RedisStorage(r)
config = storage.load_hash_configuration(cache_name)
lshash = RandomBinaryProjections(None, None)
lshash.apply_config(config)
engine = Engine(cache_dimension, lshashes=[lshash], storage=storage)

def handler(event, context):
    body = json.loads(event["body"])
    print(body)

    errors = []
    if not body["query"]:
        errors.append('Missing query parameter')

    print(f"Errors: {errors}")

    if(len(errors)):
        return {
           "statusCode": 400,
           "body": json.dumps(errors)
       }

    nearest = engine.neighbours(np.array(body["query"]))

    storage.store_hash_configuration(lshash)

    return {
        "statusCode": 200,
        "body": json.dumps([{"key": nearest[i][1], "accuracy": nearest[i][2]} for i in range(len(nearest))])
    }
