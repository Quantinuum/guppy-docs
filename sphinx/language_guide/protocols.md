---
file_format: mystnb
kernelspec:
  name: python3
---

# Protocols

Protocols were introduced to Guppy in version 1.0.

A protocol is a named set of typed methods that a type must implement. This was introduced to [Python](https://typing.python.org/en/latest/spec/protocol.html) to support "duck typing", wherein all that is required to call a method on a Python object is for it to implement the method at the right type.
## Defining a protocol
In Guppy, protocols are defined using a decorator around a Python class with no fields. The methods required by the protocol should be added to the class, wrapped with a `@guppy.require` decorator.
```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import nat, owned
from typing import Self

@guppy.protocol
class MyProto:
    @guppy.require
    def foo(self, nat) -> nat: ...
```
Note that all protocol methods must take a `self` arg - the class that implements the protocol - as a first argument.

Protocols can take type arguments, as can their required methods:
```{code-cell} ipython3
@guppy.protocol
class MyProto[T]:
    @guppy.require
    def foo[S, T](self, S) -> T: ...
```

### Implementing a protocol
Any Guppy type with implementations of all of a protocol's required methods implements the protocol.
No explicit syntax needs to be added to register a class as implementing a protocol. 
This flexibility is referred to as structural polymorphism.

For example:
```{code-cell} ipython3
@guppy.protocol
class Duck:
    @guppy.require
    def quack(self) -> str: ...
```
Any class that implements the `quack` method with the right type signature will then automatically implement the `Duck` protocol.
```{code-cell} ipython3
@guppy.struct(frozen=True)
class LittleGrebe:
    @guppy
    def quack(self) -> str:
        return "weet-weet-weet"
```
Here, since `LittleGrebe` implements all of the required methods of the `Duck` protocol with the right signature, we can pass it into any function requiring a `Duck`
```{code-cell} ipython3
@guppy
def consume_duck_and_quack[T: Duck](t: T) -> str:
    return t.quack()

@guppy
def main() -> str:
    return consume_duck_and_quack(LittleGrebe())

main.check()
```

#### Builtin methods
Protocol methods can be implemented by existing methods on built-in types too, including dunder methods. For example:
```{code-cell} ipython3
@guppy.protocol
class Addable:
    @guppy.require
    def __add__(self, other: Self) -> Self: ...
    @guppy.require
    def __radd__(self, other: Self) -> Self: ...

@guppy
def add_two[T: Addable](x: T, y: T) -> T:
    return x.__add__(y)

@guppy
def main() -> None:
    add_two(1.0, 2.0) # Works automatically for `float`
    add_two(3, 4) # Works automatically for `int`
```
```{note}
Unfortunately, this doesn't allow us to use the syntactic sugar `x + y` in `add_two`.
```

### Taking a protocol arguments
As shown above, protocols are written as bounds on type arguments using [type parameter syntax](type_arg_syntax.md).
Naturally this means we can add multiple protocol bounds to a type argument, like
```{code-cell} ipython3
---
tags: [skip-execution]
---
@guppy
def foo[T: (ProtoA, ProtoB, Copy, Drop)](t: T) -> ...
```

Single protocols can also be written in place of types as a form of syntax sugar, like
```{code-cell} ipython3
---
tags: [skip-execution]
---
@guppy
def foo(T: MyProto) -> ...
```
which will be translated by Guppy into

```{code-cell} ipython3
---
tags: [skip-execution]
---
@guppy
def foo[T: MyProto](t: T) -> ...
```

## Example: State Preparation
Let's see an example of using protocols to make an interface for the state preparation part of an experiment:

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import array, Function, nat, output, qubit
from guppylang.std.quantum import measure_array, x


@guppy.protocol
class StatePrep[N: nat]:
    @guppy.require
    def prep(self) -> array[qubit, N]: ...


@guppy
def process[N: nat](
    p: StatePrep[N], hadamard_test: Function[[array[qubit, N]], None]
) -> None:
    """Run the algorithm using the given state prep circuit."""
    qs = p.prep()
    hadamard_test(qs)
    b = measure_array(qs)[0]
    output("ancilla_measurement", b.read())


# A default state prep routine that does nothing to the qubits
@guppy.struct(frozen=True)
class DummyStatePrep[N: nat]:
    @guppy
    def prep(self) -> array[qubit, N]:
        return array(qubit() for _ in range(N))


@guppy.struct(frozen=True)
class MyStatePrep:
    @guppy
    def prep(self) -> array[qubit, 4]:
        qs: array[qubit, 4] = array(qubit() for _ in range(4))
        x(qs[0])
        x(qs[1])
        return qs


@guppy
def run_experiment(hadamard_test: Function[[array[qubit, 4]], None]) -> None:
    process(DummyStatePrep[4](), hadamard_test)
    process(MyStatePrep(), hadamard_test)


run_experiment.check()
```

## Callable
As of Guppy v1.0, the [`Callable`]((../api/generated/guppylang.std.builtins.callable.rst)) type in guppy is treated as an interface.
This means that taking a `Callable` argument in a function will have that function require a type parameter that implements the `Callable` protocol.

This protocol behaves differently to user-defined protocols because it's not currently possible in guppy to correctly write the type signature of `__call__`.

Thus, there are special cases for [guppy functions](../api/generated/guppylang.std.builtins.Function.rst) (e.g. which have type `Function[[A,B],C]`), and [modified](modifiers/modifiers_index.md) versions of those functions.
