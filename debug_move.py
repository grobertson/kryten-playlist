#!/usr/bin/env python3
"""Debug script to understand KrytenClient move_media behavior."""

import inspect

from kryten import KrytenClient


def main():
    # Check the move_media method signature
    print("KrytenClient.move_media signature:")
    print(inspect.signature(KrytenClient.move_media))

    # Check if there are any docstrings
    print("\nDocstring:")
    print(KrytenClient.move_media.__doc__ or "No docstring available")

if __name__ == "__main__":
    main()
