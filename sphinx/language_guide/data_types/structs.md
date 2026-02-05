---
file_format: mystnb
kernelspec:
  name: python3
---


# Structs

## Introduction

In Guppy, structures (abbreviated as structs) provide a way for users to group related data.
 Structs are similar to tuples in that the data they store can can have different types. 
 But the data in a struct instance is accessed via the fields instead of tuple unpacking or indexing. Note that currently the fields of Guppy structs have to be immutable.
 We can also define methods on structs, just as we can on Python classes.

To define a Guppy struct we use the python `class` keyword together with the `@guppy.struct` decorator.

To illustrate how structs work in Guppy, let's define a `PauliString` struct that represents a tensor product of single-qubit Pauli operators. 

$$
P = p_0 \otimes p_1 \otimes ... \otimes p_{k-1}\,, \quad p_i \in \{I, \,X, \,Y, \,Z\}
$$

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import array
from guppylang.std.quantum import qubit

@guppy.struct
class PauliString:
    xs: array[bool, 3]
    zs: array[bool, 3]
```

In this struct we represent a Pauli string by two arrays of booleans indicating whether the Pauli string contains $X$ or $Z$ terms at a given location. 

So for the Pauli string $XZX$ the `xs` field would be `array(1, 0, 1)` and `zs` would be `array(0, 1, 0)`.
As $XZ=-iY$ we can represent the string $YXY$ with the arrays `xs = array(1, 1, 1)` and `zs = array(1, 0, 1)`. Note that in this simplified example we neglect the complex phase.

In this example we have hard-coded the length to be 3. We can generalize this struct later.

Once we have defined a struct, we can check it just as we would check a Guppy function.

```{code-cell} ipython3
PauliString.check()
```

## Methods on structs

Just like Python classes, Guppy structs can have associated methods which act on the data stored within the struct.

Note that currently structs do not allow an `__init__` method so it is not possible to define a custom initializer.

Let's first define a notion of equality with an `__eq__` method. We will test for equality between two Pauli strings $P_0$ and $P_1$ by checking if they have the same underlying `xs` and `zs` arrays.

As a first step we can define an `array_eq` helper function which returns `True` if two boolean arrays contain the same elements and returns `False` otherwise.

```{code-cell} ipython3
n = guppy.nat_var("n")

@guppy
def array_eq(a: array[bool, n], b: array[bool, n]) -> bool:
    for i in range(n):
        if a[i] != b[i]:
            return False
    return True

```

We can now use this helper function to define an `__eq__` method on the `PauliString` struct. Note that in Guppy, struct methods also require the `@guppy` decorator just like Guppy functions.

```{code-cell} ipython3
@guppy.struct
class PauliString:
    xs: array[bool, 3]
    zs: array[bool, 3]

    @guppy
    def __eq__(self: "PauliString", other: "PauliString") -> bool:
        return array_eq(self.xs, other.xs) and array_eq(self.zs, other.zs)
```

Given two of these Pauli strings it's often helpful to determine whether they commute with one another.

We say that two operators $P_0$ and $P_1$ commute if and only if

$$
[P_0, P_1] = P_0\, P_1 - P_1 \,P_0 = 0\,.
$$

A standard way to determine whether two Pauli strings commute is to compare them element by element. Two Pauli strings commute if and only if they anticommute pairwise in an even number of terms.

For example, $XXZ$ commutes with $XZX$ as $[X, X] = 0$, $[X, Z]\neq 0$ and $[Z, X]\neq 0$. 

In order to test whether two Pauli strings commute in our representation we will take the bitwise sum between the `xs` and `zs` arrays for both strings and then evaluate the parity of the resulting sum.
If the parity is even the two strings commute.


```{code-cell} ipython3
@guppy
def parity_sum(a: array[bool, n], b: array[bool, n]) -> bool:
    xor_arr = array(a[i] ^ b[i] for i in range(n))
    out = False
    for i in range(n):
        out ^= xor_arr[i]
    return out

parity_sum.check()
```

Now we can define a `commutes_with` method on the `PauliString` struct as follows

```{code-cell} ipython3
@guppy.struct
class PauliString:
    xs: array[bool, 3]
    zs: array[bool, 3]

    @guppy
    def __eq__(self: "PauliString", other: "PauliString") -> bool:
        return array_eq(self.xs, other.xs) and array_eq(self.zs, other.zs)

    @guppy
    def commutes_with(self: "PauliString", other: "PauliString") -> bool:
        return parity_sum(self.xs, other.zs) ^ parity_sum(self.zs, other.xs)

PauliString.check()
```

## Generic structs

In our `PauliString` example so far, we have hard-coded the length of the string to be three Pauli terms. We can generalize this struct using the following generic syntax.

```{code-cell} ipython3
from typing import Generic

n = guppy.nat_var("n")

@guppy.struct
class PauliString(Generic[n]):
    xs: array[bool, n]
    zs: array[bool, n]

    @guppy
    def __eq__(self: "PauliString[n]", other: "PauliString[n]") -> bool:
        return array_eq(self.xs, other.xs) and array_eq(self.zs, other.zs)

    @guppy
    def commutes_with(self: "PauliString[n]", other: "PauliString[n]") -> bool:
        return parity_sum(self.xs, other.zs) ^ parity_sum(self.zs, other.xs)

PauliString.check()
```

Note how we have to specify the generic type in both the struct definition and the method signatures.

## Testing our `PauliString` struct

Now that we have defined a struct to represent an $n$ qubit Pauli string with 2 arrays of $n$ bits, let's test that the struct methods perform as expected.

We will define instances of the struct representing the $XII$, $ZII$, $XXZ$ and $XZX$ Pauli strings. We can then use these string to test the equality and commutation methods.


```{code-cell} ipython3
from guppylang.std.builtins import result

@guppy.comptime
def main() -> None:
    pauli_X0 = PauliString(
        array(True, False, False), array(False, False, False)
    )  # Pauli string XII
    pauli_Z0 = PauliString(
        array(False, False, False), array(True, False, False)
    )  # Pauli string ZII

    pauli_XXZ = PauliString(
        array(True, True, False), array(False, False, True)
    )  # Pauli string XXZ
    pauli_XZX = PauliString(
        array(True, False, True), array(False, True, False)
    )  # Pauli string XZX

    result("[XII == ZII?", pauli_X0 == pauli_Z0) # Expect 0 (False)

    result("[XII, ZII] == 0?", pauli_X0.commutes_with(pauli_Z0))
    result("[ZII, XII] == 0?", pauli_Z0.commutes_with(pauli_X0))
    result("[XXZ, XZX] == 0?", pauli_XXZ.commutes_with(pauli_XZX))
    result("[XZX, XXZ] == 0?", pauli_XZX.commutes_with(pauli_XXZ))
```


```{code-cell} ipython3
print("Testing PauliString.__eq__() and PauliString.commutes_with()...")
for shot in main.emulator(1).run().results:
    for entry in shot:
        name, res = entry
        print(f"{name}, {bool(res)}")
```



## Structs with linear fields are linear

As discussed in the section on [linearity](../ownership.md#linear-types), objects of linear types cannot be copied and must be used once and only once.

Consider the following struct which represents a single logical qubit comprising seven physical qubits. The physical qubits are stored in the `physical_qs` field as an array of seven qubits.

```{code-cell} ipython3
from guppylang.std.quantum import qubit

@guppy.struct
class SteaneQubit:
    physical_qs: array[qubit, 7]
```

Qubits are a linear resource, meaning that they cannot be copied or implicitly discarded. Therefore if a struct has a linear field, the struct itself is treated as linear and must conform to ownership rules.

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def leak_qs() -> None:
    steane_qs = SteaneQubit(array(qubit() for _ in range(7)))

leak_qs.check()
```

Note that the above error is given because the seven qubits within the struct are leaked. The qubits must either be returned to outer scope or consumed via a measurement or discard to avoid a linearity violation.

Note that the `PauliString` struct we defined previously will be affine as its fields are arrays of (non-linear) types.
