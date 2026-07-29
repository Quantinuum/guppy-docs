---
file_format: mystnb
kernelspec:
  name: python3
---


# Type Aliases

Guppy provides the ability to define a *type alias* that gives an existing type another name.
They are declared via the ``guppy.type_alias`` function like so:

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import array

Vec3 = guppy.type_alias("Vec3", "array[float, 3]")
```

This defines ``Vec3`` as an alias for the type ``array[float, 3]``.
Importantly, the type passed to ``guppy.type_alias`` must be given as a string.

Now, ``Vec3`` can be used as a type wherever it is in scope:

```{code-cell} ipython3
@guppy
def l1_norm(v: Vec3) -> float:
    return abs(v[0]) + abs(v[1]) + abs(v[2])

l1_norm.check()
```

Guppy's type aliases are *transparent*, meaning that wherever a ``Vec3`` is expected, we are allowed to pass an ``array[float, 3]`` and vice versa.


## Generic Type Aliases

Type aliases can also refer to type variables which make them generic:

```{code-cell} ipython3
from guppylang.std.quantum import qubit

n = guppy.nat_var("n")

QArray = guppy.type_alias("QArray", "array[qubit, n]")
```

For example, ``QArray[10]`` will refer to an array of 10 qubits.
If a type alias refers to multiple type variables, they will be ordered by first appearance in the type.
Alternatively, a specific ordering can be chosen via the optional ``params`` argument of ``guppy.type_alias``:

```{code-cell} ipython3
T = guppy.type_var("T")
U = guppy.type_var("U")

Pair = guppy.type_alias("Pair", "tuple[T, U]")

# Equivalent to
Pair = guppy.type_alias("Pair", "tuple[T, U]", params=[T, U])
```


## Restrictions

Type aliases are not allowed to refer to themselves:

```{code-cell} ipython3
---
tags: [raises-exception]
---
InfiniteInts = guppy.type_alias("InfiniteInts", "tuple[int, InfiniteInts]")

@guppy
def make_infinite_ints() -> InfiniteInts:
    return (0, make_infinite_ints())

make_infinite_ints.check()
```
