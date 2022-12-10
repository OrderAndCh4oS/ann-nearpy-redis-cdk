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

r = redis.Redis(host=cache_host, port=cache_port)

storage = RedisStorage(r)
config = storage.load_hash_configuration('WineSearch')
lshash = RandomBinaryProjections(None, None)
lshash.apply_config(config)
engine = Engine(dimension, lshashes=[lshash], storage=storage)

def handler(event, context):
    engine.clean_all_buckets()

    storage.store_hash_configuration(lshash)

    return {
        "statusCode": 204,
        "body": ""
    }
