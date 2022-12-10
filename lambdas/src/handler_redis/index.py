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
r = redis.Redis(host=cache_host, port=cache_port, decode_responses=True)
storage = RedisStorage(r)
rbp = RandomBinaryProjections('rbp', 10)
dimension = 100
engine = Engine(dimension, lshashes=[rbp], storage=storage)
# engine.clean_all_buckets()

for index in range(100000):
    v = np.random.randn(dimension)
    engine.store_vector(v, 'data_%d' % index)

def handler(event, context):
    query = np.random.randn(dimension)
    nearest = engine.neighbours(query)

    return {
        "statusCode": 200,
        "body": json.dumps({"nearest": str(nearest)})
    }
