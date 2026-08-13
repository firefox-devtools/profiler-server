# Load tests for the profiler server

This documentation explains how to run the load tests for the profiler server.
We'll see how to install the main dependency [molotov](https://molotov.readthedocs.io/en/latest/)
and then how to use it to run the tests.

See also the script in `tools/load-testing-before-deployment.sh` that runs this
automatically.

## Install dependencies

The library we use depends on Python 3.

We strongly suggest using a virtual environment to encapsulate this project's
dependencies. There are two ways to set this up: [uv](https://docs.astral.sh/uv/)
(option A, recommended), or the standard library `venv` module (option B). Both
create a `venv` directory that is entered the same way afterwards.

### Option A: Using uv (recommended)

uv manages both the Python interpreter and the dependencies, so this works even
if you don't have a matching Python 3 installed system-wide.

Create the virtual environment. Any recent Python 3 works; we ask for a specific
version explicitly so that uv downloads it when it's missing:

```
uv venv --python 3.13 venv
```

Enter it:

```
source venv/bin/activate
```

Note: to exit the virtual environment, just run `deactivate`.

Install molotov. Note that uv virtual environments are seedless (they don't
include `pip`), so we use `uv pip` instead of plain `pip`:

```
uv pip install -r requirements.txt
```

Upgrading later, when `requirements.txt` changes, is done like this:

```
uv pip install -U -r requirements.txt
```

### Option B: Using the standard library `venv`

This option uses [pip](https://pypi.org/project/pip/) to manage the python
dependencies. This is usually already installed with Python.

Create the virtual environment:

```
python3 -m venv venv
```

Note: if your `python3` is itself a uv-managed standalone build, the resulting
environment links back to uv's managed interpreter, so it breaks whenever uv
updates or removes that interpreter. You'll then see an error like
`No such file or directory: '.../venv/bin/python3'`. Use option A instead, or
re-create the environment when this happens.

Enter it:

```
source venv/bin/activate
```

Note: to exit the virtual environment, just run `deactivate`.

Install molotov:

```
pip install -r requirements.txt
```

Upgrading later, when `requirements.txt` changes, is done like this:

```
pip install -U -r requirements.txt
```

## Running

Enter the virtual environment if that's not done yet:

```
source venv/bin/activate
```

Entering the virtual environment isn't strictly necessary but makes things
easier. It's also possible to run the molotov executable directly.

You'll need to decide what endpoint you want to run the tests against. The
simplest way is to uncomment the right line in the file. But you can also use
the environment variable `API_ENDPOINT`.

Molotov has several modes.

To let molotov do its magic and run all tests in a file, this is how we run it:

```
molotov --sizing publish.py
```

Be careful that this will likely create more than 1000 objects in the bucket.
Please clean up afterwards :-)

To run only one test:

```
molotov --max-runs 1 --single-mode <scenario_name> -v publish.py
```

Notice `-v` enables verbose mode, which outputs errors. This is especially
useful while finalizing a specific scenario.

It's also possible to run all scenarios in one specific file:

```
molotov --single-run -v publish.py
```

To run only one test, but with several workers in parallel:

```
molotov -v --single <scenario_name> -w <parallel_workers> --max-runs 1 publish.py
```

By running this command with `time` it's possible to accurately measure how the
server behaves with a lot of parallel calls.

To run the scenarios during 5 seconds, with 50 workers, this is how we can do it:

```
molotov -d 5 -w 50 -v publish.py
```

You can also use `--ramp-up` so that all workers do not start in the same time.

There are more options that you can find with `molotov --help`.

## Developer information

[Molotov documentation is available online](https://molotov.readthedocs.io/en/stable/fixtures/).
The [documentation for aiohttp](https://aiohttp.readthedocs.io/en/stable/client_reference.html)
is also very useful because this is the underlying module used to actually
handle queries.

## Docker support

We provide a Dockerfile to build a docker image out of these scripts.

### Building the image

Run the command:

```
docker build -t profiler-server-molotov:dev .
```

### Running the image

By default the image will run `molotov -c --sizing publish.py`. There's no default
endpoint so you need to provide one:

```
docker run -e API_ENDPOINT=http://172.17.0.1:5252 profiler-server-molotov:dev
```

You can specify other parameters, eg:

```
docker run -e API_ENDPOINT=http://172.17.0.1:5252 profiler-server-molotov:dev --sizing shorten.py
```

Note that `-c` will be always added, to force the simple console output of molotov.

And run bash, to debug the image:

```
docker run -t -i --entrypoint bash profiler-server-molotov:dev
```

### Finding the right IP

If you want to hit your localhost, because docker runs off a network bridge,
you'll need to find the right IP to use from the docker container. This works
only if the server on the host listens to all addresses instead of only
127.0.0.1.

On MacOS and Windows, you can just use `host.docker.internal`. The same is true
for Linux if you use docker v20 with the option `--add-host
host.docker.internal:host-gateway`.

On Linux with earlier docker versions, from the host, you can use the following
command:

```
/sbin/ifconfig docker0
```

This command will give you the IP inside the bridge docker0, that you can use to
access the host from the container.

## Appendix

To delete all objects in a Google Storage Bucket, here is the useful command:

```
gcloud storage rm 'gs://<bucket-name>/**'
```
