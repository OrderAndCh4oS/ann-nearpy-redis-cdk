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

dimension = 100

if config is None:
    lshash = RandomBinaryProjections('WineSearch', 10)
    engine = Engine(dimension, lshashes=[lshash], storage=storage)
    for index in range(5000):
        v = np.random.randn(dimension)
        engine.store_vector(v, 'data_%d' % index)
else:
    lshash = RandomBinaryProjections(None, None)
    lshash.apply_config(config)
    engine = Engine(dimension, lshashes=[lshash], storage=storage)


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        return json.JSONEncoder.default(self, obj)


def handler(event, context):
    query = np.random.randn(dimension)
    nearest = engine.neighbours(query)

    storage.store_hash_configuration(lshash)

    return {
        "statusCode": 200,
        "body": json.dumps({"nearest": nearest}, cls=NumpyEncoder)
    }
