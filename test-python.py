# Python test file for tokenizer
"""
This is a module docstring
with multiple lines
"""

import os
from typing import List, Optional

# Constants
DEBUG = True
MAX_SIZE = 100

class Calculator:
    """A simple calculator class"""

    def __init__(self, name: str):
        self.name = name
        self.value = 0

    def add(self, x: int, y: int) -> int:
        """Add two numbers"""
        return x + y

    @staticmethod
    def multiply(a: float, b: float) -> float:
        # Multiply two numbers
        result = a * b
        return result

def main():
    calc = Calculator("MyCalc")

    # String tests
    message = 'Hello, World!'
    formatted = f"The result is: {calc.add(5, 3)}"
    raw_string = r"C:\Users\path"
    byte_string = b"bytes"

    # Number tests
    decimal = 42
    floating = 3.14
    hex_num = 0xFF
    binary = 0b1010
    octal = 0o755
    complex_num = 3 + 4j

    # Built-in functions
    numbers = [1, 2, 3, 4, 5]
    total = sum(numbers)
    print(f"Total: {total}")

    # Operators
    x = 10
    y = x ** 2
    z = y // 3

    if x > 5 and y < 200:
        print("Condition met")

    return calc

if __name__ == "__main__":
    main()
