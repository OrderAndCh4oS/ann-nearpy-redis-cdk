import os
from nearpy import Engine
from nearpy.hashes import RandomBinaryProjections
from nearpy.filters import NearestFilter
from nearpy.storage import RedisStorage

def lambda_handler(event, context):
    # Get the cache host and port from the environment variables
    cache_host = os.environ["CACHE_HOST"]
    cache_port = os.environ["CACHE_PORT"]

    # Set up NearPy engine with Redis storage
    r = redis.Redis(host=cache_host, port=cache_port, decode_responses=True)
    storage = RedisStorage(r)
    rbp = RandomBinaryProjections('rbp', 10)
    engine = Engine(128, lshashes=[rbp], storage=storage)

    # Use the NearPy engine to index and query data
    engine.store_vector('my-vector')
    nearest = engine.neighbours('my-vector')
    print(nearest)

    return "Success"