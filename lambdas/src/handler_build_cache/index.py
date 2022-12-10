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

    r = redis.Redis(host=cache_host, port=cache_port)

    storage = RedisStorage(r)
    config = storage.load_hash_configuration('WineSearch')
    lshash = RandomBinaryProjections('WineSearch', 10)
    engine = Engine(dimension, lshashes=[lshash], storage=storage)

    storage.store_hash_configuration(lshash)

    return {
        "statusCode": 204,
        "body": ""
    }
