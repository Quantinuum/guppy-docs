---
file_format: mystnb
kernelspec:
  name: python3
---

# Static compilation and typing

## Introduction


While Guppy functions mostly look like regular Python functions (just annotated with the `@guppy` decorator), the code they contain is processed differently compared to Python code. You can normally run Python programs directly on your machine, whereas we want to be able to run Guppy programs with a variety of simulators and quantum hardware. 

In order to achieve this, programs are statically compiled into an intermediate representation called [HUGR](https://github.com/quantinuum/hugr?tab=readme-ov-file).  An intermediate representation allows us to optimise programs before further converting them to code that can actually be executed on the desired target. 

A big advantage of compilation is that it helps us catch errors earlier than runtime. For example, the compiler ensures that variables are definitely defined before they are used.

```{code-cell} ipython3
---
tags: [raises-exception]
---
from guppylang import guppy

@guppy
def bad_function(b: bool) -> int:
    if b:
        x = 2 # x not defined if b is False
    return x

bad_function.check() # Check fails!
```
However it also has implications on the information we have to provide in the program, in particular about types. 

## Type checking

You may be familiar with type hints in Python.

```{code-cell} ipython3
def python_function(x: float) -> str: # float and str are type annotations
    return f"The value of x is {x}"
```

Python type hints are an optional feature and not enforced at runtime, they are for static analysis only. Guppy however is strongly typed - code must type-check at compile-time, and ill-typed programs will be rejected by the compiler. For example, observe the error when trying to compile the program below.

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def bad_function(x: int) -> int:
    # Return incorrect type
    return (x, x)

bad_function.check() # Check fails!
```

It also means variables must have a unique type when they are used:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def bad_function(b: bool) -> int:
    if b:
        x = 4
    else:
        x = True
    return int(x)  # x has different types depending on b

bad_function.check() # Check fails!
```

Type annotations are only required for function definitions, otherwise Guppy infers types most of the time. A particularly useful feature of the Guppy type system when it comes to qubits are linear types, which you can read more about in the [section on linearity](ownership.md#linear-types).


## Generics

Another interesting aspect of the type system is polymorphism. In our case, polymorphism means we can have generic function definitions - functions that depend on parameters, either types or natural numbers.

 Unlike normal function parameters which are passed at runtime, type-level parameters are resolved at compile-time. They are placeholders for types, as opposed to data - this distinction is particularly important to keep in mind with natural numbers as not everything that can be done with a function parameter can be done with a type parameter. 

Consider for example the identity function which works for inputs of any type. In Python this would work implicitly, as the type would only be determined at runtime:

```{code-cell} ipython3
def identity(x):
    return x
```

In Guppy however, we need to explicitly state that the type is a generic parameter to make the function polymorphic:

```{code-cell} ipython3
T = guppy.type_var("T")

@guppy
def identity(x: T) -> T:
    return x
```

An example of parameters representing natural numbers are functions that are generic over the length of arrays:

```{code-cell} ipython3
from guppylang.std.builtins import array

T = guppy.type_var("T")
n = guppy.nat_var("n")

@guppy
def apply_identity(a: array[T, n]) -> None:
    for i in range(n):
        identity(a[i])
```

This function now works for arrays of any length and type! This is possible because the compiler turns each instantiation of a generic function into a concrete instance with specific types in a process called monomorphisation.

```{code-cell} ipython3
@guppy
def main() -> None:
    arr1 = array(1, 2)
    apply_identity(arr1)

    arr2 = array(1.5, 2.5, 3.5, 4.5)
    apply_identity(arr2)

main.check() # Check succeeds :)
```

Normally determining the specific type is done automatically through type inference, but it is also possible to explicitly apply type arguments if needed.
```{code-cell} ipython3
n = guppy.nat_var("n")

@guppy
def foo(x: array[int, n]) -> int: 
    return n

@guppy
def main() -> int:
    return foo[0](array()) + foo[2](array(1, 2))

main.check()
```

Generics can be particularly useful for parameterising quantum programs by an arbitrary number of qubits:

```{code-cell} ipython3
from guppylang.std.quantum import qubit, cx, measure_array

@guppy
def rep_code(q: array[qubit, n]) -> array[bool, n]:
    a = array(qubit() for _ in range(n))
    for i in range(n - 1):                
        cx(q[i], a[i])
        cx(q[i + 1], a[i])
    return measure_array(a)

rep_code.check()
```