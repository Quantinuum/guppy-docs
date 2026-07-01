---
file_format: mystnb
kernelspec:
  name: python3
---

# Functions

## Introduction


Functions in Guppy are one of the fundamental departures from the traditional circuit model of quantum computation. Conceptually, functions can be used like in most other modern programming languages: to decompose larger programs into smaller, reusable subroutines that are easier to reason about and can be used to reduce repetition.

Guppy functions can be defined much like normal Python functions:

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.quantum import qubit, h, x, measure

@guppy
def my_subroutine(q: qubit) -> None:
    h(q)
    x(q)
```

With the exception that the `@guppy` decorator is required, as are type annotations (covered in our section on [type checking](static.md#type-checking)).

### Entrypoint functions

Any Guppy function that doesn't take arguments can be the execution entrypoint for the program, it can be compiled directly in to an executable package.

```{code-cell} ipython3
@guppy
def entrypoint() -> None:

    q1 = qubit()
    q2 = qubit()

    my_subroutine(q1)
    my_subroutine(q2)

    measure(q1)
    measure(q2)

my_hugr_program = entrypoint.compile()
```

### Built-in functions

Guppy defines a standard library of functions that can be imported and used in your programs.

For a full list of these please review the guppylang [Standard Library Reference](../api/std.md).

```{code-cell} ipython3
# Import quantum operation functions from the guppylang standard library
from guppylang.std.quantum import measure, h, qubit
```

## Guppy functions are first-class functions

Guppy functions are first-class, meaning that we can treat them in our program like a value. For instance, we can bind a function to a value and pass it around in our program.

```{code-cell} ipython3
@guppy
def a_function(n: int) -> int:
    return n + 1
    
@guppy
def function_is_a_value() -> None:
    # bind a variable to our function
    my_function = a_function
    
    my_function(100)

function_is_a_value.check()
```

## Guppy functions can be higher-order functions

Guppy functions can take function(s) as arguments and/or return a function as a result. A functions with one of these two properties is known as a higher-order function.

To define a higher-order function, we can use the `Function` type from Guppy to provide the type annotation.

```{code-cell} ipython3
from guppylang.std.builtins import Function

@guppy
def my_function(f: Function[[int], bool]) -> Function[[int], bool]:
    # Takes a callable `f` that accepts an integer and returns a boolean.
    return f

@guppy
def use_my_function() -> None:

    def is_even(n: int) -> bool:
        return n % 2 == 0
    
    # # Apply our higher order function `my_function` to `is_even`
    my_function_composition = my_function(is_even)
    
    my_function_composition(42)
    

use_my_function.check()
```

Ill-typed application of higher-order functions will fail at compile time.

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def misuse_my_function() -> None:

    def wrong_types(n: int) -> tuple[str, int]:
        return ("Hello", n)

    my_function(wrong_types)(42)
    

misuse_my_function.check() # Compilation fails :^(
```

Note that using higher-order function features to implement [closures](https://en.wikipedia.org/wiki/Closure_(computer_programming)) or [partial function application](https://en.wikipedia.org/wiki/Partial_application) is not supported at present.

## Function overloading & static dispatch

Function overloading is the ability to create multiple functions with the same name but with different implementations.

Any language that supports function overloading must have a way of selecting which function implementation to use (or dispatch). Guppy uses the form of static dispatch, which means that this selection is resolved at compile time.

```{code-cell} ipython3
@guppy
def plus_state() -> qubit:
    q = qubit()
    h(q)
    return q


@guppy
def apply_h(q: qubit) -> None:
    h(q)

@guppy.overload(plus_state, apply_h)
def apply_h_to_something(): ...

@guppy
def use_overloaded_function() -> None:

    q = qubit()
    
    # compiler dispatches apply_h() to be used here
    apply_h_to_something(q)

    # compiler dispatches plus_state() to be used here
    other_q = apply_h_to_something()

    measure(q)
    measure(other_q)

use_overloaded_function.check()
```

Another example of static dispatch in Guppy is discussed in our section on [Generics](static.md#generics).
