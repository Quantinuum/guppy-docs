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

## Guppy functions are first-class values

Guppy functions are first-class, meaning that we can treat them in our program like a value. For instance, we can bind a function to a variable and pass it around in our program.

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

By default, the Guppy compiler will try to track the identity of a function value at compile time through its type.
Consider the following program:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def b_function(n: int) -> int:
    return 2 * n
    
@guppy
def call_a_or_b(flag: bool) -> None:
    if flag:
        f = a_function
    else:
        f = b_function
    f(100)

call_a_or_b.check()
```

Here, we tried to assign either ``a_function`` or ``b_function`` to the variable ``f``, but the compiler tells us that these values have different types.
This is because the default type assigned to a function value statically tracks the corresponding definition it came from.
These are the ``def a_function(n: int) -> int`` and ``def b_function(n: int) -> int`` types that showed up in the error message above.
To fix this, we can follow the compiler's suggestion and annotate ``f`` with a ``Function`` type.
``Function`` is a built-in type that can be imported from the standard library:

```{code-cell} ipython3
from guppylang.std.builtins import Function
```

``Function`` denotes an *opaque* function value that is not known at compile-time.
Its syntax is similar to the ``Callable`` protocol [available in Python](https://typing.python.org/en/latest/spec/callables.html).
For example, ``Function[[int], int]`` denotes an opaque function that takes and returns an ``int``.
The concrete function definition types ``def a_function(n: int) -> int`` and ``def b_function(n: int) -> int`` types that the compiler assigned to our functions above automatically coerce to the same ``Function`` type:

```{code-cell} ipython3
from guppylang.std.builtins import Function

@guppy
def call_a_or_b(flag: bool) -> None:
    if flag:
        f: Function[[int], int] = a_function
    else:
        f: Function[[int], int] = b_function
    f(100)

call_a_or_b.check()
```

Now, both branches assign the same type to ``f``, so the function is accepted.
By adding the ``Function`` annotation, we have effictively told the compiler that we are willing to give up the static knowledge of which function ``f`` corresponds to and are fine with treating it as an opaque function value instead.


## Guppy functions can be higher-order functions

Since Guppy treats functions as values, we can also define function that take other functions as arguments or return a function as a result.
These are known as *higher-order functions*.
The preferred method to take functions as arguments is via the ``Callable`` protocol already available in Python:

```{code-cell} ipython3
from collections.abc import Callable
```

For example, in the Guppy snippet below, we define a higher-order function ``any`` that checks if a given function ``f`` returns ``True`` for any elements in an array:

```{code-cell} ipython3
from guppylang.std.builtins import array

@guppy
def any(f: Callable[[int], bool], xs: array[int, 3]) -> bool:
    for i in range(3):
        if f(i):
            return True
    return False
```

We can test our ``any`` function by passing in different Guppy functions:

```{code-cell} ipython3
@guppy
def is_even(n: int) -> bool:
    return n % 2 == 0

@guppy
def is_positive(n: int) -> bool:
    return n > 0
    
@guppy
def test_any() -> bool:
    xs = array(1, 2, 3)
    return any(is_even, xs) and any(is_positive, xs)

test_any.check()
```

Of course, we are only allowed to pass functions with the correct signature:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def misuse_any() -> int:

    def wrong_types(n: int) -> tuple[str, int]:
        return ("Hello", n)

    return any(wrong_types, array(1, 2, 3))

misuse_any.check()
```

The main limintation of ``Callable`` values is that is currently not possible to annotate a function return type as ``Callable``:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def return_callable() -> Callable[[int], bool]:
    return is_even

return_callable.check()
```

We want to lift this restriction in a future version of Guppy, however, for now the best work around is to use the ``Function`` type introduced in the previous section instead of ``Callable``:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def return_function() -> Function[[int], bool]:
    return is_even

return_callable.check()
```

The main downside of using ``Function`` over ``Callable`` is that ``Function`` is only valid for actual function definitions, whereas ``Callable`` is intended to accept any argument that can be called.
Examples of callable values that are not functions include possible future language features like [closures](https://en.wikipedia.org/wiki/Closure_(computer_programming)) or [partial function applications](https://en.wikipedia.org/wiki/Partial_application).


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
