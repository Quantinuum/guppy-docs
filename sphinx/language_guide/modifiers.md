---
file_format: mystnb
kernelspec:
  name: python3
---

# Modifiers

Modifiers transform a block of quantum operations. They make it possible to express controlled and inverse operations without defining a separate function for each variant.

## Syntax

Use modifiers in a `with` statement. Multiple modifiers may be combined or nested.

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import control, dagger
from guppylang.std.quantum import h, qubit

@guppy
def controlled_inverse(c: qubit, q: qubit) -> None:
    with control(c), dagger:
        h(q)

controlled_inverse.check()
```

The body has access to variables from its enclosing scope, but it cannot take ownership of them. Assignments in a modifier block are local to that block, including assignments that reuse an outer name.

```{code-cell} ipython3
from guppylang.std.quantum import angle, rx

@guppy
def local_assignment(q: qubit) -> None:
    denominator = 1
    with dagger:
        denominator = 2
        rx(q, angle(1 / denominator))
    # `denominator` is not available here.

local_assignment.check()
```

# Control

`with control(c):` applies the operations in its body only when the control qubit `c` is in $\ket{1}$. With controls $c_1, \ldots, c_n$, it applies the operation when all controls are in $\ket{1}$:

$$
\operatorname{C}^n(U)\ket{c_1\ldots c_n}\ket{\psi} =
\begin{cases}
\ket{c_1\ldots c_n}U\ket{\psi} & \text{if } c_1 = \cdots = c_n = 1, \\
\ket{c_1\ldots c_n}\ket{\psi} & \text{otherwise.}
\end{cases}
$$

Pass individual qubits, an array of qubits, or both. Array elements may also be controls.

```{code-cell} ipython3
from guppylang import array
from guppylang.std.quantum import x

@guppy
def cnx(controls: array[qubit, 2], target: qubit) -> None:
    with control(controls):
        x(target)

cnx.check()
```

Control blocks cannot allocate, measure, reset, or discard qubits. Every operation called in the block must be controllable.

# Dagger

`with dagger:` applies the inverse of its body. If the body performs $U_1$ followed by $U_2$, the dagger block performs $U_2^\dagger$ followed by $U_1^\dagger$.

```{code-cell} ipython3
from guppylang.std.quantum import s

@guppy
def undo_phase(q: qubit) -> None:
    s(q)
    with dagger:
        s(q)

undo_phase.check()
```

Dagger blocks have the same qubit-operation restrictions as control blocks and cannot contain control flow. Every operation called in the block must be daggerable. Two daggers cancel, so `with dagger, dagger:` has no effect.

## Conjugation box


# Function flags

Use function flags when a function may be called inside a modifier block:

```python
@guppy(controllable=True)
def controlled_operation(q: qubit) -> None: ...

@guppy(daggerable=True)
def invertible_operation(q: qubit) -> None: ...

@guppy(unitary=True)
def unitary_operation(q: qubit) -> None: ...
```

`controllable=True` permits controlled calls, `daggerable=True` permits inverse calls, and `unitary=True` permits both. The function body must meet the corresponding restrictions described above.

## Conjugation box with functions


# Complete example: QFT

The modifiers compose naturally: a controlled inverse QFT is written as a single modifier block around the QFT call.

```python
with control(control_qubit), dagger:
    qft(register)
```

# Loading from pytket

Loaded pytket circuits infer their modifier capabilities from their operations. A circuit containing only unitary gates is unitary, so it can be controlled and daggered. Measurements, resets, qubit creation, and qubit discard prevent the relevant capability from being inferred.

```{code-cell} ipython3
from pytket import Circuit

circuit = Circuit(1)
circuit.H(0)
hadamard = guppy.load_pytket("hadamard", circuit, use_arrays=False)

@guppy
def controlled_inverse_circuit(c: qubit, q: qubit) -> None:
    with control(c), dagger:
        hadamard(q)

controlled_inverse_circuit.check()
```
