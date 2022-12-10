import os
import redis
from nearpy import Engine
from nearpy.hashes import RandomBinaryProjections
from nearpy.filters import NearestFilter
from nearpy.storage import RedisStorage
import numpy as np

def handler(event, context):
    # Get the cache host and port from the environment variables
    cache_host = os.environ["CACHE_HOST"]
    cache_port = os.environ["CACHE_PORT"]

    # Set up NearPy engine with Redis storage
    r = redis.Redis(host=cache_host, port=cache_port, decode_responses=True)
    storage = RedisStorage(r)
    rbp = RandomBinaryProjections('rbp', 10)
    dimension = 100
    engine = Engine(dimension, lshashes=[rbp], storage=storage)

    for index in range(10000):
        v = np.random.randn(dimension)
        engine.store_vector(v, 'data_%d' % index)

    query = np.random.randn(dimension)

    nearest = engine.neighbours(query)
    print(nearest)

    return "Success"
