# Migrating to Guppy Version 1.0

Guppy v1 is the first stable release of the Guppy quantum programming language. It introduces several major new features alongside a number of breaking changes and new behaviour. Guppy v1 also requires Python 3.12 or later; support for Python 3.10 and 3.11 has been removed.

This guide details the key code changes needed to migrate to Guppy v1 from the 0.x series and explains the rationale for the changes. For a summary of all of the new features available in Guppy v1, see the [extended changelog](../sphinx/guppylang/guppylang/CHANGELOG.md).


## The `std.quantum.measure` function now returns a `Measurement` rather than a `bool`

A major change in Guppy v1 is that the [measure](api/generated/guppylang.std.quantum.measure.rst) function no longer returns a `bool` indicating $|0\rangle$ or $|1\rangle$ but rather returns a [Measurement](api/generated/guppylang.std.quantum.Measurement.rst) object. A [Measurement](api/generated/guppylang.std.quantum.Measurement.rst) can be resolved to a Boolean by using the `Measurement.read` method.

The motivation behind this change is to clarify how measurements impact the performance of a program.
 In Selene and Quantinuum systems it is recommended to use the value of measurements as late as possible to allow more opportunities for parallelism during the runtime of the program. 
 Prior to Guppy v1, using the value of a [measure](api/generated/guppylang.std.quantum.measure.rst) call would block the execution of the program until the value was available. Resolving measurements with the `read` method makes the behaviour more explicit to the user and means the user is less likely to accidentally force a sequence of quantum gates to be performed earlier than necessary.

The [project_z](api/generated/guppylang.std.quantum.project_z.rst) function also now returns a [Measurement](api/generated/guppylang.std.quantum.Measurement.rst) object. 

For more on how measurements work in Guppy v1, consult the [measurements section](language_guide/measurement.md) of the language guide.



## Guppy structs are now mutable by default

In Guppy v1, structs are now mutable and affine by default. Prior to the v1 release, all Guppy structs were immutable meaning that the fields of a struct had fixed values when the struct was initialized.

* Mutable - The values of struct fields can be modified after the struct is initialized.
* Affine - A mutable struct value can only be used at most once. Guppy's type system only allows a single reference to mutable objects.


Users can now indicate whether a struct should be immutable by specifying the `frozen=True` kwarg in the `@guppy.struct` decorator, exactly the same as [Python dataclasses](https://docs.python.org/3/library/dataclasses.html).


When migrating to Guppy v1, users will need to add this frozen kwarg to ensure that their structs remain immutable.


```{eval-rst}
.. tabs::

   .. code-tab:: python v1

    # Use frozen=True to make Grid immutable
    @guppy.struct(frozen=True)
    class Grid:
        shape: array[int, 2]
        n_filled_sites: int


   .. code-tab:: python pre-v1

    # Grid is immutable by default
    @guppy.struct
    class Grid:
        shape: array[int, 2]
        n_filled_sites: int
```


 Allowing mutable structs means that Guppy users can define certain data structures in a much more streamlined fashion. An example of a useful mutable struct include defining a `Counter` collection which could track the number of gates applied during the runtime of the program.


## Internal fields of `collections` types are now private

## The deprecated `quantum_functional` and `prelude` modules have been removed

The `quantum_functional` module no longer exists in Guppy v1. Functional quantum operations can be found in the [guppylang.std.quantum.functional](api/generated/guppylang.std.quantum.functional.rst) module instead.


## There is now a `Function` type in Guppy replacing `Callable` in annotations

## The `result` function has been renamed to `output`

In Guppy 0.x the [result](api/generated/guppylang.std.platform.result.rst) function was used for tagging values returned from Selene and QSystem execution. This function has now been renamed to [output](api/generated/guppylang.std.platform.output.rst). 

The reason for this change is that the term "result" was overloaded with other distinct classes such as [EmulatorResult](api/generated/guppylang.emulator.EmulatorResult) and [std.err.Result](api/generated/guppylang.std.err.Result.rst). 

Note that the [result](api/generated/guppylang.std.platform.result.rst) function hasn't been removed and will still work. The use of [output](api/generated/guppylang.std.platform.output.rst) is encouraged for clarity.



## Guppy libraries are now created with `GuppyLibrary.from_members`

## `link_name` is now its own decorator

In previous versions of Guppy

