---
file_format: mystnb
kernelspec:
  name: python3
---

# Migrating to Guppy Version 1.0

Guppy v1 is the first stable release of the Guppy quantum programming language. It introduces several major new features alongside a number of breaking changes and new behaviours.

Guppy v1 requires Python 3.12 or later: support for Python 3.10 and 3.11 has been removed.

This guide details the key code changes needed to migrate to Guppy v1 from the 0.x series and explains the rationale for the changes. For a summary of all of the new features available in Guppy v1, see the [changelog](../sphinx/guppylang/guppylang/CHANGELOG.md).


## The `std.quantum.measure` function now returns a `Measurement` rather than a `bool`

A major change in Guppy v1 is that the [measure](api/generated/guppylang.std.quantum.measure.rst) function no longer returns a `bool` indicating $\lvert0\rangle$ or $\rvert1\rangle$. Instead, it returns a [Measurement](api/generated/guppylang.std.quantum.Measurement.rst) object. This can be resolved to a boolean
 by using the {py:meth}`~guppylang.std.quantum.Measurement.read` method.

`````{grid} 2

````{grid-item-card} Guppy v0.x

```python
@guppy
def f(a: array[qubit, 6] @owned) -> None:
    for q in a:
        result("t", measure(q))
```
````

````{grid-item-card} Guppy v1.0
```python
@guppy
def f(a: array[qubit, 6] @owned) -> None:
    for q in a:
        output("t", measure(q).read())
```
`````



The motivation behind this change is to emphasise that the moment when a measurement is forced has a significant effect on a program's performance.
 In Selene and Quantinuum systems it is recommended to use the value of measurements as late as possible to allow more opportunities for parallelism during the runtime of the program. Resolving measurements with the {py:meth}`~guppylang.std.quantum.Measurement.read` method makes the behaviour more explicit and allows us to avoid accidentally forcing a sequence of quantum gates to be performed earlier than necessary.

The [project_z](api/generated/guppylang.std.quantum.project_z.rst) function also now returns a [Measurement](api/generated/guppylang.std.quantum.Measurement.rst) object. 

For more on how measurements work in Guppy v1, consult the [measurements section](language_guide/measurement.md) of the language guide.



## Guppy structs are now mutable by default

In Guppy v1, structs are now mutable and affine by default. Prior to the v1 release, all Guppy structs were immutable, meaning that the fields of a struct had fixed values when the struct was initialized.

* Mutable - The values of struct fields can be modified after the struct is initialized.
* Affine - A mutable struct value can be used at most once. Guppy's type system only allows a single reference to mutable objects.


Users can indicate that a struct should be immutable by specifying the `frozen=True` keyword argument in the `@guppy.struct` decorator (as in [Python dataclasses](https://docs.python.org/3/library/dataclasses.html)).


When migrating to Guppy v1, users will need to add this frozen keyword argument to keep the v0.x behaviour of their structs.


`````{grid} 2

````{grid-item-card} Guppy v0.x

```python
# Grid is immutable by default
@guppy.struct
class Grid:
    shape: array[int, 2]
    n_filled_sites: int
```
````

````{grid-item-card} Guppy v1.0
```python
# Use frozen=True
# to make Grid immutable
@guppy.struct(frozen=True)
class Grid:
    shape: array[int, 2]
    n_filled_sites: int
```
`````

 Allowing mutable structs means that Guppy users can define certain data structures in a much more streamlined fashion. For example, a mutable struct can be used to define a "counter" structure to track the number of gates applied during the runtime of the program.

 Note that because structs are now affine by default, they cannot be implicitly copied. 

 Here is an example of an implicit struct copy which would type check with Guppy 0.x but gives a type error with Guppy v1.

 ```{code-cell} ipython3
---
tags: [raises-exception]
---

from guppylang import guppy

@guppy.struct
class MyStruct:
    x: int
    y: float

    @guppy
    def add(self) -> float:
        return self.x + self.y

@guppy
def main() -> None:
    s0 = MyStruct(7, 1.4)
    s1 = s0
    s0.add() # Copy violation as we are using s0 after a move

main.check() # Fails type check in v1, valid in 0.x
```

This code above gives an error in Guppy v1. However if we specified `@guppy.struct(frozen=True)` then this code would type check as `s1` would be an immutable copy of `s0` instead of a reference to `s0`.


## Standard library breakages

1. Internal fields of `collections` types are now private

Guppy has a [collections](api/generated/guppylang.std.collections.rst) module with useful `Stack`, `Queue` and `PriorityQueue` containers. These containers are now implemented as mutable Guppy structs with corresponding methods. The struct methods are the idiomatic way to program with these collections so the struct fields are now private. 

2. The deprecated `quantum_functional` module has been removed

The `quantum_functional` module no longer exists in Guppy v1. Functional quantum operations can be found in the [guppylang.std.quantum.functional](api/generated/guppylang.std.quantum.functional.rst) module instead.


## New `Function` type in Guppy replacing `Callable` in annotations

In Guppy 0.x, the `Callable` type could be used to annotate Guppy functions passed in type signatures. Guppy v1 has its own `Callable` type which is a Guppy protocol.
 The new Guppy [Function](api/generated/guppylang.std.builtins.Function.rst) type implements this `Callable` protocol.
 
 This means that these functions are now considered generic. Note that generic functions can't be compiled directly in guppy v1. In order to write a non-generic function that takes a function argument, use the new [Function](api/generated/guppylang.std.builtins.Function.rst) type
 
This is a breaking change as functions with `Callable` in their signatures will no longer compile in Guppy v1.
 Usage of `Callable` for functions should be replaced with the new [Function](api/generated/guppylang.std.builtins.Function.rst) type as shown below.

`````{grid} 2

````{grid-item-card} Guppy v0.x

```python
from typing import Callable

@guppy
def prepare_choi_state(
    unitary: Callable[[array[qubit, N]], None],
) -> array[array[qubit, N], 2]:
    ...
```
````

````{grid-item-card} Guppy v1.0
```python
from guppylang.std.builtins import Function

@guppy
def prepare_choi_state(
    unitary: Function[[array[qubit, N]], None],
) -> array[array[qubit, N], 2]:
    ...
```
`````



## The `result` function has been renamed to `output`

In Guppy 0.x the [result](api/generated/guppylang.std.platform.result.rst) function was used for tagging values returned from Selene and QSystem execution. This function has now been deprecated and [output](api/generated/guppylang.std.platform.output.rst) should be used in its place. 

The reason for this change is that the term "result" was overloaded with other distinct classes such as [EmulatorResult](api/generated/guppylang.emulator.EmulatorResult) and [std.err.Result](api/generated/guppylang.std.err.Result.rst). 

Note that the [result](api/generated/guppylang.std.platform.result.rst) function hasn't been removed and will still work. The use of [output](api/generated/guppylang.std.platform.output.rst) is encouraged for clarity.

This change also applies to the [state_result](api/generated/guppylang.std.debug.state_result.rst) function which is used
 to get a statevector printout during the simulation of a quantum program. Now [state_result](api/generated/guppylang.std.debug.state_result.rst) is deprecated and [state_output](api/generated/guppylang.std.debug.state_output.rst) should be used instead.


## Changes to Guppy libraries

Introduced in Guppy v0.21.13, Guppy libraries provide a way to group Guppy functions and structs into a single compilable unit. With the new Guppy v1 release, there are two breakages to Guppy libraries. For up-to-date information on how libraries work in Guppy, refer to the [libraries section](language_guide/libraries.md) of the Guppy language guide.

1. Guppy libraries are now created with {py:meth}`guppylang.library.GuppyLibrary.from_members`

In Guppy 0.21, a {py:class}`~guppylang.library.GuppyLibrary` was created using the `guppy.library` API. In Guppy v1, a {py:class}`~guppylang.library.GuppyLibrary` is instead created using the {py:meth}`~guppylang.library.GuppyLibrary.from_members` method.

`````{grid} 2

````{grid-item-card} Guppy v0.x

```python
# Create a GuppyLibrary from
# three function definitions
lib = guppy.library(
    first_func,
    second_func,
    third_func,
)
```
````

````{grid-item-card} Guppy v1.0
```python

# Create a GuppyLibrary from
# three function definitions
lib = GuppyLibrary.from_members(
    first_func,
    second_func,
    third_func,
)
```
`````

This change is motivated by the fact that methods on `guppy` symbol are most often used to create a single Guppy definition. A {py:class}`~guppylang.library.GuppyLibrary` refers to a collection of Guppy definitions. 

2. `link_name` is now its own decorator

Guppy libraries can also be used to link function declarations against function calls, by associating a `link_name` with a function definition. In Guppy 0.21, this was accomplished by specifying `link_name` as a keyword argument in the `@guppy` decorator. In Guppy v1, {py:func}`~guppylang.library.link_name` is its own decorator. 
This was changed to keep the keyword arguments to `@guppy` related to compilation and to provide better error messages to the user.



`````{grid} 2

````{grid-item-card} Guppy v0.x

```python
@guppy(link_name="my.lib.func")
def my_func() -> None:
    pass
```
````

````{grid-item-card} Guppy v1.0
```python
@guppy
@link_name("my.lib.func")
def my_func() -> None:
    pass
```
`````
