---
file_format: mystnb
kernelspec:
  name: python3
---

# Guppy Version 1.0 Changelog

Guppy v1 is the first stable release of the Guppy quantum programming language. It introduces several major new features alongside a number of breaking changes and new behaviours.

While new features will still be added in subsequent minor versions and there may be changes to the standard library, the core language is now considered stable, meaning there won't be any changes to the syntax and semantics of core language constructs.

This extended changelog intends to provide a convenient overview of major new features in this release, see the [changelog](../sphinx/guppylang/guppylang/CHANGELOG.md) for a detailed list of all changes and the [language guide](language_guide/language_guide_index.md) for detailed feature documentation.


```{note}
If you just want to see the breaking changes and instructions on how to update your existing code, please see the [migration guide](v1_migration.md).
```

## New quantum constructs

### A new `Measurement` type

Guppy has a new dedicated [`Measurement`](../api/generated/guppylang.std.quantum.Measurement.rst) type. Values returned from measurement functions now have this type instead of returning a `bool` directly. See the [language guide section on measurements](language_guide/measurement.md) for the design rationale behind this and the relevant migration guide section [here](v1_migration.md#the-stdquantummeasure-function-now-returns-a-measurement-rather-than-a-bool).

### Control and dagger modifiers

You can now transform gates, blocks of quantum operations, and functions automatically using modifiers. 

```{code-cell} ipython3
from guppylang.decorator import guppy
from guppylang.std.quantum import s, qubit
from guppylang.std.builtins import control, dagger

@guppy
def controlled_inverse(c: qubit, q: qubit) -> None:
    with control(c), dagger:
        s(q)


controlled_inverse.check()
```

See the [modifier guide](TODO) for usage details and examples.

## Extensions to the type system

### Protocols

Protocols are a powerful way of constraining polymorphism: they let you define a set of required methods, and any type that implements all of them automatically satisfies the protocol.

```{code-cell} ipython3
from typing import Self
from guppylang.std.quantum import Measurement

@guppy.protocol
class Measurable:
    @guppy.require
    def measure(self: Self) -> Measurement: ...

Measurable.check()
```

Guppy v1 also introduces some special built-in protocols, namely `Callable` (see the [migration guide](v1_migration.md#new-function-type-in-guppy-replacing-callable-in-annotations) for what this means for previous use of `Callable`).

Read more about protocols in the [language guide](TODO).



### Structs are now mutable

Structs are now mutable by default, also making them affine by default, see the relevant migration guide section [here](v1_migration.md#guppy-structs-are-now-mutable-by-default).

### Type aliases

Guppy now provides the ability to give an existing type another name using the `guppy.type_alias` function. Read more about type aliases in the [language guide](TODO).


## Comptime improvements

### More support for generics

You can now use generic variables in the type signature of comptime functions. However, explicitly specifying type arguments for both functions and structs is not supported yet.

Read more about [comptime](language_guide/comptime.md) and [generics](language_guide/static.md) in their respective language guide sections.

### Python variables are now captured implicitly

You no longer need to use `comptime` (or `py`) to pull in variables from Python code into your Guppy code, these will be captured implicitly. Anything requiring any form of computation still requires the use of the `comptime` keyword.

## Performance

### A new optimisation interface

It is now possible to specify the level of optimization to be run on Guppy programs by calling `with_opt_level` on your entrypoint function. Read more about the different available optimization levels and defaults [here](TODO).

### Runtime argument support in the emulator

When using the emulator, it is now possible to compile a program once and re-run it for different parameters by using runtime arguments. Find out more about this [here](TODO).

## Changes to the Standard Library

Besides the additions and changes mentioned below, there are some deprecations and renames which are listed in the [migration guide](v1_migration.md).

### `std.qsystem` is now split into `helios` and `sol`

Guppy v1 splits previous `std.qsystem` functionality into `std.qsystem.helios` and `std.qsystem.sol` modules, as well as adding platform configuration support. Read about the differences between the modules and how platform configuration affects emulator and compilation workflows in the [relevant documentation](TODO).


### A new `std.random` module

Alongside the platform random number generator (found in `std.qsystem.random`), Guppy now also offers a native implementation that stores state locally rather than globally. Read more about both forms of RNG in the [language guide](language_guide/random.md).
