""" Molotov-based test.

This test will generate some load for the shorten and expand endpoints of the
profiler server.

Note that Bitly will rate-limit us after a few tries. Still this test is useful
to test how our own server behaves.
"""
import os
from molotov import scenario, setup, global_setup, teardown, global_teardown

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

# This is a production code deployment configured with a sandbox storage.
# _API = 'https://stage.firefoxprofiler.nonprod.cloudops.mozgcp.net'

# This is a profile URL that we want to shorten. By using always the same one
# bitly won't create a new one.
_LONG_URL = 'https://profiler.firefox.com/public/00cbf186938d721bf168ad036930c09cf641eb40/calltree/?globalTrackOrder=0&invertCallstack&localTrackOrderByPid=5898-0-1~&search=const&thread=0&v=4'  # noqa: E501


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

    Here we configure the API endpoint we'll use in the tests.
    """
    setup_api_endpoint()


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


async def shorten(session):
    input = dict(longUrl=_LONG_URL)
    async with session.post(_API + '/shorten', json=input) as resp:
        assert resp.status == 200
        res = await resp.json()

    short_url = res['shortUrl']
    return short_url


async def expand(session, short_url):
    input = dict(shortUrl=short_url)
    async with session.post(_API + '/expand', json=input) as resp:
        assert resp.status == 200
        res = await resp.json()

    long_url = res['longUrl']
    return long_url


# Each scenario has a weight. Molotov uses it to determine how often the
# scenario is picked.
# Here we have only one scenario so we don't use it.
@scenario(1)
async def shorten_and_expand(session):
    short_url = await shorten(session)
    long_url = await expand(session, short_url)
    assert long_url == _LONG_URL
