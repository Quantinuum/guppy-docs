---
file_format: mystnb
kernelspec:
  name: python3
---

# Guppy Version 1.0

Guppy v1 is the first stable release of the Guppy quantum programming language. It introduces several major new features alongside a number of breaking changes and new behaviours.

While new features will still be added in consequent minor versions and their may be changes to the standard library, the core language is now considered stable, meaning there won't be any changes to the syntax and semantics of core language constructs. 

This extended changelog intends to provide a convenient overview of major new features in this release, see the [changelog](../sphinx/guppylang/guppylang/CHANGELOG.md) for a detailed list of all changes and the [language guide](language_guide/language_guide_index.html) for detailed feature documentation.


```{note}
If you just want to see the breaking changes and instructions on how to update your existing code, please see the [migration guide](v1_migration.md)
```

## New quantum constructs

### A new `Measurement` type

Guppy has a new dedicated [`Measurement`](../api/generated/guppylang.std.quantum.Measurement.rst) type. Values returned from measurement functions now have this type instead of returning  a `bool` directly. See the [language guide section on measurements](language_guide/measurement.md) for the design rationale behind this and the relevant migration guide section [here](TODO).

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


TODO:
- what's the deal with power?
- any other things worth mentioning here?
- link to `Unitary`, `Controllable`, `Daggerable` protocols below?

## Extensions to the type system

### Protocols

Protocols are a powerful way of constraining polymorphism: they let you define a set of required methods, and any type that implements all of them automatically satisfies the protocol.

```{code-cell} ipython3
from typing import Self

@guppy.protocol
class Measurable:
    @guppy.require
    def measure_and_read(self: Self) -> bool: ...

@guppy.struct
class ParityCheck[N]:
    
    qs: array[qubit, N]

    @guppy
    def measure_and_read(self: Self) -> bool:
        bits = collect_measurements(measure_array(self.qs))
        result = False
        for b in bits:
            result ^= b
        return result

@guppy.struct
class QubitWrapper:

    q: qubit

    @guppy
    def measure_and_read(self: Self) -> bool:
        return measure(q).read()
```

Guppy v1 also introduces some special builtin protocols, namely `Callable` (see [migration guide section](TODO)) and `Unitary`, `Controllable`, and `Daggerable` protocols related to the modifiers mentioned above.

Read more about protocols in the [language guide](TODO).

TODO:
- check example + consider shorter/less convoluted example?
- expand on the special protocols (why are they special, what methods to they require?)

### Structs are now mutable

Struct are now mutable by default, also making them affine by default, see the relevant migration guide section [here](TODO).

### Type aliases

Guppy now provides the ability to give an existing type another name using the `guppy.type_alias` function. Read more about type aliases in the [language guide](TODO).


## Comptime improvements

### More support for generics

TODO:
- what exactly is now supported that wasn't before, and what still isn't (will it be in the future)?

Read more about [comptime](language_guide/comptime.md) and [generics](language_guide/static.md) in their respective language guide sections.

### Python variables are now captured implicitly

You no longer need to use `comptime` (or `py`) to pull in variables from Python code into your Guppy code, these will be captured implicitly. Anything requiring any form of computation still requires the use of the `comptime` keyword.

## Performance

### A new optimisation interface

TODO:
- code snippet of setting optimisation
- mention the default level
- link to documentation

### Runtime argument support in the emulator

TODO:
- what is this and why is it useful

## Changes to the Standard Library

TODO:
- are there any more major changes?

### `std.qsystem` is now split into `helios` and `sol`

TODO:
- how to configure platform?
- link to documentation

### A new `std.random` module

TODO:
- just mention that there is a new native RNG and link to it and the documentation
