# Load tests for the profiler server

This documentation explains how to run the load tests for the profiler server.
We'll see how to install the main dependency [molotov](https://molotov.readthedocs.io/en/latest/)
and then how to use it to run the tests.

## Install dependencies

The library we use depends on Python 3.

This tool uses [pip](https://pypi.org/project/pip/) to manage its python dependencies.
This is usually already installed with Python.

We also strongly suggest to use virtualenv to encapsulate this project's
dependencies.

### Create a virtualenv for this project
```
virtualenv --python python3 venv
```

### Enter the virtualenv
```
source venv/bin/activate
```
Note: to exit the virtualenv, just run `deactivate`.

### Install molotov
```
pip install -r requirements.txt
```

## Running

Enable the virtualenv if that's not done yet:
```
source venv/bin/activate
```
Enabling the virtualenv isn't strictly necessary but makes things easier. It's
also possible to run the molotov executable directly.

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
molotov --max-runs 1 --single-mode <name of scenario> -v publish.py
```
Notice `-v` enables verbose mode, which outputs errors. This is especially
useful while finalizing a specific scenario.

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

## Appendix

To delete all objects in Google Storage Bucket, here is the useful command:
```
gsutil -m rm gs://<bucket-name>/*
``
