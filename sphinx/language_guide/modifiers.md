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

The body has access to variables from its enclosing scope, but it cannot take ownership of them. For instance, the following programs is rejected:

```{code-cell} ipython3
---
tags: [raises-exception]
---
from guppylang.std.builtins import owned
from guppylang.std.quantum import discard

@guppy.declare(daggerable=True)
def consume(q: qubit @ owned) -> None: ...

@guppy
def cannot_take_ownership(q: qubit) -> None:
    with dagger:
        consume(q)

cannot_take_ownership.check()
```


Moreover, assignments in a modifier block are local to that block, including assignments that reuse an outer name. In the following examples, `denominator` is not available outside the `with dagger:` block as well as `outer_var`, which is assigned outside the block but it is reassigned inside the block.

```{code-cell} ipython3
from guppylang.std.quantum import angle, rx

@guppy
def local_assignment(q: qubit) -> None:
    outer_var = 1
    with dagger:
        denominator = 4
        outer_var = 2
        rx(q, angle(outer_var / denominator))
    # `denominator` is not available here.
    rx(q, angle(1 / denominator))

local_assignment.check()
```
```{code-cell} ipython3
@guppy
def local_assignment(q: qubit) -> None:
    outer_var = 1
    with dagger:
        denominator = 4
        outer_var = 2
        rx(q, angle(outer_var / denominator))
    # `outer_var` is not available here either
    rx(q, angle(outer_var / 4))

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

You can pass individual qubits or an array of qubits. Array elements may also be controls.


```{code-cell} ipython3
from guppylang import array
from guppylang.std.quantum import x

@guppy
def c2x(controls0: qubit, controls1: qubit, target: qubit) -> None:
    with control(controls0, controls1):
        x(target)

@guppy
def cnx(controls: array[qubit, n], target: qubit) -> None:
    with control(controls):
        x(target)

@guppy
def main(c0: qubit, c1: qubit, t: qubit) -> None:
    
    c2x(c0, c1, t)

    controls = array([c0, c1])
    t2 = qubit()
    cnx(controls, t2)

cnx.check()
```

Control blocks cannot allocate, measure, reset, or discard qubits. Every operation called in the block must be controllable.

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def allocation_in_control(c: qubit) -> None:
    with control(c):
        q = qubit()

allocation_in_control.check()
```

```{code-cell} ipython3
---
tags: [raises-exception]
---
from guppylang.std.quantum import measure

@guppy
def measurement_in_control(c: qubit, q: qubit) -> None:
    with control(c):
        measure(q)

measurement_in_control.check()
```


# Dagger

`with dagger:` applies the inverse of its body. If the body performs $U_1$ followed by $U_2$, the dagger block performs $U_2^\dagger$ followed by $U_1^\dagger$.

```{code-cell} ipython3
from guppylang.std.quantum import s

@guppy
def undo_phase(q: qubit) -> None:
    with dagger:
        s(q)

undo_phase.check()
```

Dagger blocks have the same qubit-operation restrictions as control blocks and cannot contain control flow. Moreover, control flow is not allowed inside a dagger context.

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def branch_in_dagger(q: qubit, flag: bool) -> None:
    with dagger:
        if flag:
            h(q)

branch_in_dagger.check()
```

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def loop_in_dagger(q: qubit) -> None:
    with dagger:
        for _ in range(2):
            h(q)

loop_in_dagger.check()
```



## Conjugation box


# Function flags
If we try to call a function inside a modifier block, we need to ensure that the function body meets the corresponding restrictions: a function that allocates or discard qubits cannot be called inside a control block and a function that contains control flow cannot be called inside a dagger block.
To state that a function is safe to call inside a modifier block and ask the type checker to verify it, we can use function flags.
There are three flags: `controllable=True` permits controlled calls, `daggerable=True` permits inverse calls, and `unitary=True` permits both.

```python
@guppy(controllable=True)
def controlled_operation(q: qubit) -> None: ...


@guppy(daggerable=True)
def invertible_operation(q: qubit) -> None: ...


@guppy(unitary=True)
def unitary_operation(q: qubit) -> None: ...
```

 The function body must meet the corresponding restrictions described above.

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
