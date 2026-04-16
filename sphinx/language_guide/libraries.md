---
file_format: mystnb
kernelspec:
  name: python3
---

# Libraries

Introduced in ``v0.21.12``.

## Introduction

A Guppy *library* comprises a collection of functions that act as a single compilable unit.
As opposed to compiling a single function and its dependees, compiling a library may result in a compilation product (a HUGR package) with multiple functions acting as entrypoints.
These functions may take arguments, and have non-``None`` return types.
Libraries can be used for separating compilation of multiple parts of your codebase (thus allowing reuse of unchanged definitions), distributing packages that are highly optimized, and much more.

A library can be created with the ``guppy.library(...)`` function as follows:
```{code-cell} ipython3
from guppylang import guppy
from hugr.package import Package

@guppy
def my_func() -> None:
    pass

@guppy
def another_func(x: int) -> None:
    pass

@guppy
def a_third_func(x: int) -> int:
    return x + 1

# Creates the library object, but does not compile it
lib = guppy.library(
    my_func,
    another_func,
    a_third_func,
)
# Compiles the library to a HUGR package
lib_pkg: Package = lib.compile()
```
In the resulting ``lib_pkg``, all three functions are included with public visibility, as they act as the libraries entrypoints.
Any additional functions used by these entrypoints are also included in the package (similar to dependees of a single function compilation), but with private visibility.
The visibility of a function affects whether it is available for linking, explained [below](#linking-and-visibility).

## Using Libraries and Stubs

To allow programming against the interface of the library, the library developer needs to expose a series of stubs, mirroring the entrypoint functions the library was created with.
In Guppy, a stub can be created as a function declaration with the ``@guppy.declare`` decorator.

For the introductory example, the stubs could look as follows:
```{code-cell} ipython3
from guppylang import guppy

@guppy.declare
def my_func() -> None: ...

@guppy.declare
def another_func(x: int) -> None: ...

@guppy.declare
def a_third_func(x: int) -> int: ...
```
Currently, creation of these stubs is a manual process; it is currently not possible to automatically generate stubs for a library or validate that definitions faithfully implement their corresponding stubs.

The end-user may then use these stubs as part of their regular Guppy source, and compile their code independently of the library:
```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import result
from hugr.package import Package

# --- SNIP ---
# Taken from the declarations, usually you would import this symbol
@guppy.declare
def my_func() -> None: ...

@guppy.declare
def a_third_func(x: int) -> int: ...
# --- SNIP ---

@guppy
def consumer_func() -> None:
    my_func()
    result("library_call", a_third_func(5))

@guppy
def main() -> None:
    consumer_func()

user_pkg: Package = main.compile()
```
Here, the end-user aims to create an executable package: The compilation product is a HUGR package with a single, argument-less entrypoint.
However, the ``user_pkg`` is incomplete, as it lacks the function definitions corresponding to the used function declarations.
This may cause issues when further processing of the package (at last when the contents of the package should be executed using e.g. a simulator), so the library package containing the definitions has to be *linked* in to provide them.

## Linking and Visibility

Once a library HUGR package is created, it may be distributed to end-users using arbitrary mechanisms.
As of `hugr-py>=0.16.0`, it is possible to *link* packages, replacing calls to function declarations with calls to the corresponding function definitions, if they are available:
```python3
from hugr.package import Package

# --- SNIP ---
# Created as above
lib_pkg: Package = ...
user_pkg: Package = ...
# --- SNIP ---

combined_pkg: Package = user_pkg.link(user_pkg)
```
The order in which the packages are linked does not matter, and linking multiple packages can be done all at once, or in several calls.
It is also not required that, after linking, there are no remaining calls to (unrelated) function declarations.
If that is the case, the package may remain as unexecutable, and further linking has to be performed to fill those declarations.

Functions inside the package receive a visibility that is either public or private.
Only public functions are available for linking, where private functions are completely ignored.
While function declarations are always public, a function definition is public if and only if it was included as an entrypoint to the library.

Furthermore, functions inside the package will receive a *name*, with a default scheme based on the module that the Guppy function was defined in as well as the original name of the Guppy function.
For the introductory example, assuming the functions reside in a file at `src/mylib/foo/bar.py`, the names assigned to the functions in the package will be:
- ``mylib.foo.bar.my_func``
- ``mylib.foo.bar.another_func``
- ``mylib.foo.bar.a_third_func``

To be able to link the corresponding declarations and the functions together, they need to have the same name inside the HUGR package.
This 

## Structs and Enums in the Interface
