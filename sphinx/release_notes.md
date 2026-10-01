# Release notes

This page highlights changes in stable [guppylang](https://pypi.org/project/guppylang/) releases. It groups changes from pre-releases with the stable release that includes them. For the full release history, including pre-releases, see the [upstream guppylang changelog](https://github.com/Quantinuum/guppylang/blob/main/guppylang/CHANGELOG.md). The separate [guppylang-internals changelog](https://github.com/Quantinuum/guppylang/blob/main/guppylang-internals/CHANGELOG.md) covers compiler changes.

(guppy-release-1-1-2)=
## 1.1.2 — 30 September 2026

### Fixes
* Fixed local variables being incorrectly shadowed by global definitions of the same name. ([#2375](https://github.com/Quantinuum/guppylang/issues/2375)).
* Fixed compilation of generic functions called inside a `with control` block, where copyable generic captures could retain a stale `Inout` flag and cause the block signature to disagree with its CFG outputs. ([#2248](https://github.com/Quantinuum/guppylang/issues/2248)).
* Corrected the diagnostic span for a missing return statement when a `while` loop uses a walrus (`:=`) condition, so the error now highlights the whole loop and includes the "Consider adding a return statement" note. ([#1792](https://github.com/Quantinuum/guppylang/issues/1792))

See the [full changelog for 1.1.2](https://github.com/Quantinuum/guppylang/releases/tag/guppylang-v1.1.2).

(guppy-release-1-1-1)=
## 1.1.1 — 14 September 2026

Guppy 1.1 adds ways to structure programs, control compilation and emulation, and diagnose failures.

See the [full changelog for 1.1.1](https://github.com/Quantinuum/guppylang/releases/tag/guppylang-v1.1.1).

### Language and libraries

Added static methods and an `@inline` decorator to give libraries more ways to structure Guppy code. Extended modifier support so libraries can define their own implementations, which Guppy checks and compiles. Added reverse iteration for ranges and in-place reversal for arrays; ranges with a zero step now raise an error.

### Compilation and emulation

Added target platform configuration for optimization and emulation, and enabled the default optimization level without `pytket`. Expanded debugging with an optional `debug_mode` for `compile` and `emulator`, traces and metrics in `EmulatorResult`, and panic stack traces. The emulator builder also accepts bytes.

Raised the minimum `selene-hugr-qis-compiler` version to 0.5.0. This changes the default seeding behavior and may produce different emulator results. Pass `mode=legacy` when building the emulator to restore the previous behavior.

### Fixes and diagnostics

Fixed compilation of classical `array.take` calls and improved `@guppy.unitary` errors by rejecting unsupported statements in classes and hiding internal tracebacks from decorator errors.

(guppy-release-1-0-4)=
## 1.0.4 — 8 September 2026

Changed floating-point rounding to break exact ties toward the even number rather than away from zero. Updated to HUGR 0.18.6, TKET 0.15.8, and the QIS compiler 0.4.3 to improve compilation performance.

See the [full changelog for 1.0.4](https://github.com/Quantinuum/guppylang/releases/tag/guppylang-v1.0.4).

(guppy-release-1-0-3)=
## 1.0.3 — 1 September 2026

Adjusted dependency support by lowering the minimum NumPy version to 2.2.6 and raising the minimum TKET version to 0.15.7. Updated emulator documentation to show how to format arguments and warn about using `barrier` with `state_output`.

See the [full changelog for 1.0.3](https://github.com/Quantinuum/guppylang/releases/tag/guppylang-v1.0.3).

(guppy-release-1-0-2)=
## 1.0.2 — 27 August 2026

Expanded daggerable operations to include true division and improved errors for nested functions without a return annotation. Marked `power` as experimental in the docs.

See the [full changelog for 1.0.2](https://github.com/Quantinuum/guppylang/releases/tag/guppylang-v1.0.2).

(guppy-release-1-0-1)=
## 1.0.1 — 3 August 2026

Guppy v1 is the first stable release of the Guppy quantum programming language. It introduces several major new features alongside a number of breaking changes and new behaviours.

While new features will still be added in subsequent minor versions and there may be changes to the standard library, the core language is now considered stable, meaning there won't be any changes to the syntax and semantics of core language constructs.

These release notes provide an overview of major new features for Guppy v1. See the [language guide](language_guide/language_guide_index.md) for detailed feature documentation.

See the [full changelog for 1.0.1](https://github.com/Quantinuum/guppylang/releases/tag/guppylang-v1.0.1).

> To see just the breaking changes and instructions on how to update existing code, please see the [migration guide](v1_migration.md).

---

### New quantum constructs

#### A new `Measurement` type

Guppy has a new dedicated [`Measurement`](https://docs.quantinuum.com/guppy/api/generated/guppylang.std.quantum.measure.html) type. Values returned from measurement functions now have this type instead of returning a `bool` directly. See the [language guide section on measurements](https://docs.quantinuum.com/guppy/language_guide/measurement.html) for the design rationale behind this and the {ref}`Guppy v1 migration instructions <guppy-v1-measurement-migration>` for updating existing code.

#### Control and dagger modifiers

Gates, blocks of quantum operations, and functions can now be transformed automatically using modifiers. Control makes each operation controlled with an additional control qubit input. Dagger reverses gate order and replaces each gate with its inverse.

```python
from guppylang.decorator import guppy
from guppylang.std.quantum import s, qubit
from guppylang.std.builtins import control, dagger


@guppy
def controlled_inverse(c: qubit, q: qubit) -> None:
    with control(c), dagger:
        s(q)
```

See the [modifier guide](https://docs.quantinuum.com/guppy/language_guide/modifiers/modifiers_index.html) for usage details and examples.

### Extensions to the type system

#### Protocols

Protocols are a powerful way of constraining polymorphism: they let you define a set of required methods, and any type that implements all of them automatically satisfies the protocol.

```python
from typing import Self
from guppylang.std.quantum import Measurement


@guppy.protocol
class Measurable:
    @guppy.require
    def measure(self: Self) -> Measurement: ...
```

Guppy v1 also introduces some special built-in protocols, namely `Callable` (see the [migration guide](https://docs.quantinuum.com/guppy/v1_migration.html#new-function-type-in-guppy-replacing-callable-in-annotations) for what this means for previous use of `Callable`).

Read more about protocols in the [language guide](https://docs.quantinuum.com/guppy/language_guide/protocols.html).


#### Structs are now mutable

Structs are now mutable by default, also making them affine by default, see the relevant migration guide section [here](https://docs.quantinuum.com/guppy/v1_migration.html#guppy-structs-are-now-mutable-by-default).

#### Type aliases

Guppy now provides the ability to give an existing type another name using the `guppy.type_alias` function. Read more about type aliases in the [language guide](https://docs.quantinuum.com/guppy/language_guide/data_types/aliases.html).


### Comptime improvements

#### More support for generics

Generic variables can now be used in the type signature of comptime functions. However, explicitly specifying type arguments for both functions and structs is not supported yet.

Read more about [comptime](https://docs.quantinuum.com/guppy/language_guide/comptime.html) and [generics](https://docs.quantinuum.com/guppy/language_guide/static.html) in their respective language guide sections.

#### Python variables are now captured implicitly

The use of `comptime` (or `py`) is no longer required to pull in variables from Python code into Guppy code, these will be captured implicitly. Anything requiring any form of computation still requires the `comptime` keyword.

### Performance

#### A new optimisation interface

It is now possible to specify the level of optimization to be run on Guppy programs by calling `with_opt_level` on the entrypoint function. Read more about the different available optimization levels and defaults [here](https://docs.quantinuum.com/guppy/api/optimizer.html).

#### Runtime argument support in the emulator

When using the emulator, it is now possible to compile a program once and re-run it for different parameters by using runtime arguments. Find out more about this [here](https://docs.quantinuum.com/guppy/api/emulator.html).

### Changes to the Standard Library

Besides the additions and changes mentioned below, there are some deprecations and renames which are listed in the [migration guide](v1_migration.md).

#### `std.qsystem` is now split into `helios` and `sol`

Guppy v1 splits previous `std.qsystem` functionality into `std.qsystem.helios` and `std.qsystem.sol` modules, as well as adding compilation target platform configuration support. Read about the differences between the modules and how platform configuration affects emulator and compilation workflows in the [relevant documentation](https://docs.quantinuum.com/guppy/api/emulator.html).


#### A new `std.random` module

Alongside the platform random number generator (found in `std.qsystem.random`), Guppy now also offers a native implementation that stores state locally rather than globally. Read more about both forms of RNG in the [language guide](https://docs.quantinuum.com/guppy/language_guide/random.html).
