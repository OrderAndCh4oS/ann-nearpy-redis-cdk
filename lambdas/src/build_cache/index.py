import os
import json
import redis
import numpy as np
from nearpy import Engine
from nearpy.hashes import RandomBinaryProjections
from nearpy.filters import NearestFilter
from nearpy.storage import RedisStorage

def handler(event, context):
    cache_host = os.environ["CACHE_HOST"]
    cache_port = os.environ["CACHE_PORT"]
    cache_name = os.environ["CACHE_NAME"]
    cache_dimension = int(os.environ["CACHE_DIMENSION"])

    r = redis.Redis(host=cache_host, port=cache_port)

    storage = RedisStorage(r)

    # Todo: `'search-cache'` should be provided as an environment variable
    config = storage.load_hash_configuration(cache_name)
    lshash = RandomBinaryProjections(cache_name, 10)
    engine = Engine(cache_dimension, lshashes=[lshash], storage=storage)

    storage.store_hash_configuration(lshash)

    return {
        "statusCode": 204,
        "body": ""
    }
