#!/usr/bin/env python3

"""Output the profile token from the JWT token returned by the server.

One way to use it is to pipe the result of curl to this tool.
Note that this needs Python 3.
"""

# This is a python script because this must be easily copiable, have no
# dependency, and easily runnable in most environments. To handle JWT token we
# need these bits of functionality:
# - Base64 decoding
# - JSON parsing
# Python is therefore an obvious choice for this specific task.

import fileinput
import sys
import base64
import json


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


def handle_input_line(line):
    """This handles one line of input, that should be a JWT token.

    This will first split the token in its 3 components, base64 decode the 2nd
    one that's the payload, json-parse it, and finally print the key
    "profileToken" from that JSON payload.
    """
    _header, payload, _signature = line.strip().split(".")

    decoded_str = jwt_base64_decode(payload)
    json_payload = json.loads(decoded_str)
    token = json_payload['profileToken']
    return token


if sys.version_info[0] < 3:
    raise Exception("This tool only works with Python 3.")

# Execute it only when run directly
if __name__ == '__main__':
    for line in fileinput.input(sys.argv[1:]):
        print(handle_input_line(line))
