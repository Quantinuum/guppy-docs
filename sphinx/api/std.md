# Standard Library

Welcome to the Guppy standard library. The Standard library provides a toolbox of functions and data structures to be used in Guppy programs. 
Standard library builtins are to be used within Guppy [functions](../language_guide/functions.md) or [structs](../language_guide/data_types/structs.md) annotated with the [@guppy](decorator.md) decorator.
 This distinguishes the `guppylang.std` module from other Guppy modules like [guppy.emulator](emulator.md) and [guppy.definition](defs.md) which define classes and functions to be used in the outer Python scope.

```{eval-rst}
.. currentmodule:: guppylang.std
.. autosummary::
    :template: autosummary/module.rst
    :toctree: generated
    :recursive:
    :nosignatures:

    angles
    array
    bool
    builtins
    lang
    collections
    debug
    either
    futures
    iter
    list
    mem
    num
    option
    platform
    qsystem
    quantum
    random
    reflection
    string
    err
```