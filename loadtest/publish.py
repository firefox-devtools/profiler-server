""" Molotov-based test.

This load test will generate some loads against the publishing and deleting
endpoints of the profiler server.
"""
import json
import os
import base64
from molotov import scenario, setup, global_setup, teardown, global_teardown
from molotov import set_var, get_var

_API = None

# This is the server endpoint to run the load tests against.
# Please uncomment the right line before running this file or define it with
# the environment variable API_ENDPOINT.
# We don't specify a default server so that the user has to consciously decide
# the server to hit.

# This is your local server.
# _API = 'http://localhost:5252'

# This is the staging server.
# _API = 'https://dev.firefoxprofiler.nonprod.cloudops.mozgcp.net'

# This is the various file sizes we'll generate in the global setup.
_FILE_SIZES = (512, 1024, 5 * 1024, 20 * 1024)


def setup_api_endpoint():
    """Sets up the _API global that we use in all scenarii.
    """
    global _API

    endpoint_from_env = os.getenv('API_ENDPOINT')
    if endpoint_from_env is not None:
        # The environment always wins over what's defined in the file.
        _API = endpoint_from_env

    if _API is None:
        raise ValueError(
                'Please define one API endpoint before running the test file, '
                'either uncommenting the right line in the file or specifying '
                'the env variable API_ENDPOINT.'
                )

    if _API[-1] == '/':
        # Remove trailing slash if present.
        _API = _API[:-1]

    print(f"We'll run tests against the endpoint {_API}.")


@global_setup()
def test_starts(args):
    """ This functions is called before anything starts.

    Notice that it's not a coroutine.

    Here we configure various things:
    * we configure the API endpoint we'll use in the tests.
    * we generate the various files to be sent in the tests.
    """
    setup_api_endpoint()
    files = {x: os.urandom(x * 1024) for x in _FILE_SIZES}
    set_var("files", files)


@setup()
async def worker_starts(worker_id, args):
    """ This function is called once per worker.

    If it returns a mapping, it will be used with all requests.

    You can add things like Authorization headers for instance,
    by setting a "headers" key.
    """
    headers = dict(Accept='application/vnd.firefox-profiler+json;version=1')
    return dict(headers=headers)


@teardown()
def worker_ends(worker_id):
    """ This functions is called when the worker is done.

    Notice that it's not a coroutine.
    """
    pass


@global_teardown()
def test_ends():
    """ This functions is called when everything is done.

    Notice that it's not a coroutine.
    """
    pass


# This is copied from decode_jwt_payload.py
def get_profile_token_from_jwt(jwt):
    """This handles one line of input, that should be a JWT token.

    This will first split the token in its 3 components, base64 decode the 2nd
    one that's the payload, json-parse it, and finally print the key
    "profileToken" from that JSON payload.
    """
    _header, payload, _signature = jwt.strip().split(".")

    decoded_str = jwt_base64_decode(payload)
    json_payload = json.loads(decoded_str)
    token = json_payload['profileToken']
    return token


def jwt_base64_decode(payload):
    """Decode a Base64 encoded string from a JWT token.

    JWT encodes using the URLSafe base64 algorithm and then removes the
    padding. This function does the opposite: adds the padding back and then
    uses the URLSafe base64 algorithm to decode the string.
    """
    # Thanks Simon Sapin
    # (https://stackoverflow.com/questions/2941995/python-ignore-incorrect-padding-error-when-base64-decoding)
    missing_padding = len(payload) % 4
    if missing_padding:
        payload += "=" * (4 - missing_padding)

    decoded_bytes = base64.urlsafe_b64decode(payload)
    decoded_str = decoded_bytes.decode("utf-8")
    return decoded_str


async def publish(session, data_size):
    """Publishes a profile with the passed data size
    """

    files = get_var('files')
    if data_size not in files:
        raise ValueError(
                f"The data size {data_size} isn't part of the "
                f"precomputed files. Available sizes are {list(files)}."
                )

    data = get_var('files')[data_size]
    # By adding some random bytes, the content will change for each test and
    # therefore the filename too. This prevents google from erroring while we
    # stress test.
    data = data + os.urandom(10)

    async with session.post(_API + '/compressed-store', data=data) as resp:
        assert resp.status == 200
        # when you read the body, don't forget to use await
        jwt_token = await resp.text()
        assert jwt_token != ''

    return jwt_token


async def delete(session, jwt_token):
    """Deletes a profile using the provided jwt token
    """

    profile_token = get_profile_token_from_jwt(jwt_token)

    async with session.delete(
            _API + '/profile/' + profile_token,
            headers=dict(Authorization='Bearer ' + jwt_token)
            ) as resp:
        assert resp.status == 200


# Each scenario has a weight. Molotov uses it to determine how often the
# scenario is picked.
@scenario(1)
async def publish_and_delete(session):
    jwt_token = await publish(session=session, data_size=512)
    await delete(session=session, jwt_token=jwt_token)


@scenario(2)
async def publish_512(session):
    await publish(session=session, data_size=512)


@scenario(2)
async def publish_1024(session):
    await publish(session=session, data_size=1024)


@scenario(1)
async def publish_larger(session):
    await publish(session=session, data_size=5*1024)


@scenario(1)
async def publish_largest(session):
    await publish(session=session, data_size=20*1024)
