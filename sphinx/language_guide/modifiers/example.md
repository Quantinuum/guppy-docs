---
file_format: mystnb
kernelspec:
  name: python3
---

# Modifier examples

This page collects worked examples that combine the control and dagger modifiers.

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import control, dagger
from guppylang.std.quantum import angle, cx, h, qubit, rx, rz
```

## Conjugation pattern

Many unitaries have a compute--action--uncompute form:

$$
U = V A V^\dagger.
$$

The first part computes a basis change, `A` performs the action, and the final part uncomputes the basis change. This is a conjugation pattern.


For a controlled conjugation, only the central action $A$ needs to be controlled:
This avoids controlling every operation in $V$ and can substantially reduce the number of controlled, entangling gates.  

$$
C[U] = (I \otimes V)\, C[A]\, (I \otimes V^\dagger).
$$

This avoids controlling every operation in `V` and can substantially reduce the number of controlled, entangling gates.

```{code-cell} ipython3
from guppylang.std.quantum import rz

@guppy
def controlled_conjugation(c: qubit, q: qubit) -> None:
    # Compute V
    h(q)
    # Controlled action A
    with control(c):
        rz(q, angle(1 / 4))
    # Uncompute V†
    with dagger:
        h(q)

controlled_conjugation.check()
```

### Conjugation pattern with Pauli exponential

A Pauli gadget for $P = Z \otimes Z \otimes Y \otimes X$ has this form: basis changes and a CNOT parity network compute $V$, a single `rz` is the action, and the dagger block uncomputes $V^\dagger$. The control is needed only for the central rotation.

```{code-cell} ipython3
from guppylang.std.quantum import angle, cx, rx

@guppy
def controlled_pauli_zzyx(
    c: qubit,
    qz0: qubit,
    qz1: qubit,
    qy: qubit,
    qx: qubit,
    theta: angle,
) -> None:
    # Compute the ZZYX parity onto qx.
    rx(qy, angle(1 / 2))
    h(qx)
    cx(qz0, qx)
    cx(qz1, qx)
    cx(qy, qx)

    with control(c):
        rz(qx, theta)

    # Uncompute the parity and basis changes.
    with dagger:
        rx(qy, angle(1 / 2))
        h(qx)
        cx(qz0, qx)
        cx(qz1, qx)
        cx(qy, qx)

controlled_pauli_zzyx.check()
```

### Conjugation pattern with functions

Now we can revisit the [previous example](#conjugation-pattern-with-pauli-exponential) using functions.

```{code-cell} ipython3
@guppy(unitary=True)
def compute_zzyx_parity(qz0: qubit, qz1: qubit, qy: qubit, qx: qubit) -> None:
    rx(qy, angle(1 / 2))
    h(qx)
    cx(qz0, qx)
    cx(qz1, qx)
    cx(qy, qx)

@guppy(unitary=True)
def pauli_action(qx: qubit, theta: angle) -> None:
    rz(qx, theta)

@guppy
def controlled_pauli_zzyx_with_functions(
    c: qubit,
    qz0: qubit,
    qz1: qubit,
    qy: qubit,
    qx: qubit,
    theta: angle,
) -> None:
    compute_zzyx_parity(qz0, qz1, qy, qx)
    with control(c):
        pauli_action(qx, theta)
    with dagger:
        compute_zzyx_parity(qz0, qz1, qy, qx)

controlled_pauli_zzyx_with_functions.check()
```

## A complete example: Grover search

This Grover search marks $\ket{101}$ in a three-qubit register. The loop-containing helpers are compile-time unitary functions, so they can be used inside dagger blocks.

```{code-cell} ipython3
import math

from guppylang.std.builtins import array, control, dagger, nat, output
from guppylang.std.quantum import h, measure, qubit, x, z

@guppy.comptime(unitary=True)
def apply_hadamards[n: nat](register: array[qubit, n]) -> None:
    for q in register:
        h(q)

@guppy.comptime(unitary=True)
def apply_bit_flips[n: nat](register: array[qubit, n]) -> None:
    for q in register:
        x(q)

@guppy.comptime(unitary=True)
def flip_nonleading_controllers[n: nat](controllers: array[qubit, n]) -> None:
    for i in range(1, n):
        x(controllers[i])

@guppy(unitary=True)
def phase_flip_all_ones[n: nat](controllers: array[qubit, n], target: qubit) -> None:
    with control(controllers):
        z(target)

@guppy(unitary=True)
def mark_10_01[n: nat](controllers: array[qubit, n], target: qubit) -> None:
    flip_nonleading_controllers(controllers)
    phase_flip_all_ones(controllers, target)
    with dagger:
        flip_nonleading_controllers(controllers)

@guppy(unitary=True)
def diffuse[n: nat](controllers: array[qubit, n], target: qubit) -> None:
    apply_hadamards(controllers)
    h(target)
    apply_bit_flips(controllers)
    x(target)
    phase_flip_all_ones(controllers, target)
    with dagger:
        apply_hadamards(controllers)
        h(target)
        apply_bit_flips(controllers)
        x(target)

@guppy(unitary=True)
def grover_step[n: nat](controllers: array[qubit, n], target: qubit) -> None:
    mark_10_01(controllers, target)
    diffuse(controllers, target)

@guppy.comptime
def grover_101() -> None:
    controllers = array(qubit(), qubit())
    target = qubit()
    apply_hadamards(controllers)
    h(target)

    iterations = round(math.pi * math.sqrt(2 ** (len(controllers) + 1)) / 4)
    for _ in range(iterations):
        grover_step(controllers, target)

    q0, q1 = controllers
    output("result", array(measure(q0).read(), measure(q1).read(), measure(target).read()))

grover_101.emulator(n_qubits=3).with_shots(1000).run().collated_counts()
```
