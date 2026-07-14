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
---
tags: [raises-exception]
---
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
---
tags: [raises-exception]
---
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
from guppylang.std.builtins import nat


@guppy
def c2x(controls0: qubit, controls1: qubit, target: qubit) -> None:
    with control(controls0, controls1):
        x(target)

@guppy
def cnx[n: nat](controls: array[qubit, n], target: qubit) -> None:
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

## Control flow

When a controlled block contains control flow, the control is pushed to every quantum operation produced by the branch or loop. Evaluating the classical condition and loop bounds is not controlled. For instance, the following two programs are equivalent:

```{code-cell} ipython3
@guppy
def control_if(c: qubit, q: qubit, flag: bool) -> None:
    with control(c):
        if flag:
            h(q)
        else:
            x(q)
control_if.check()
```
```{code-cell} ipython3
@guppy
def pushed_control_if(c: qubit, q: qubit, flag: bool) -> None:
    if flag:
        with control(c):
            h(q)
    else:
        with control(c):
            x(q)

pushed_control_if.check()
```

The same applies to loops:

```{code-cell} ipython3
@guppy
def control_loop(c: qubit, q: qubit) -> None:
    with control(c):
        for _ in range(2):
            h(q)

@guppy
def pushed_control_loop(c: qubit, q: qubit) -> None:
    for _ in range(2):
        with control(c):
            h(q)

control_loop.check()
pushed_control_loop.check()
```

## Classical assignments in control blocks

Classical assignments are ignored by the control modifier: no controlled operation is generated for them. Thus the following programs are equivalent.

```{code-cell} ipython3
from guppylang.std.quantum import angle, rx

@guppy
def control_assignment(c: qubit, q: qubit) -> None:
    with control(c):
        theta = angle(1 / 4)
        rx(q, theta)

@guppy
def pushed_control_assignment(c: qubit, q: qubit) -> None:
    theta = angle(1 / 4)
    with control(c):
        rx(q, theta)

control_assignment.check()
pushed_control_assignment.check()
```

## Forbidden operations

Control blocks allows classical operations since they can be evaluated without affecting the quantum state. However, they cannot allocate, measure, reset, or discard qubits, since these operations have quantum effects, but they are not controllable.

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


# Dagger

`with dagger:` applies the inverse of its body. If the body performs $U_1$ followed by $U_2$, the dagger block performs $U_2^\dagger$ followed by $U_1^\dagger$.

```{code-cell} ipython3
from guppylang.std.quantum import s

@guppy
def sdg(q: qubit) -> None:
    with dagger:
        s(q)

sdg.check()
```



## Classical assignments in dagger blocks

Similar to the control modifier, dagger reverses only the quantum computation. Classical assignments keep their source order, while the quantum operations are inverted and reversed.

```{code-cell} ipython3
@guppy
def invert_two_gates(q: qubit) -> None:
    with dagger:
        h(q)
        s(q)

invert_two_gates.check()
```

The resulting quantum operations are equivalent to:

```qasm
sdag q;
h q;
```

Classical operations remain in order even though the quantum operations are reversed:

```{code-cell} ipython3
from guppylang.std.quantum import rz

@guppy
def invert_rotations(q: qubit) -> None:
    with dagger:
        a = 4
        theta = angle(1 / a)
        rx(q, theta)
        a /= 2
        phi = angle(1 / a)
        rz(q, phi)

invert_rotations.check()
```

```qasm
a = 4;
theta = 1 / a;
a /= 2;
phi = 1 / a;
rz(-phi) q;
rx(-theta) q;
```

## Forbidden operations in dagger blocks

Dagger blocks have the same qubit-operation restrictions as control blocks and cannot contain control flow. Moreover, control flow is not allowed inside a dagger context, since reverting control flow is not trivial and not always possible.

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
## Combining dagger and controls

Modifiers compose. This example is a doubly controlled inverse of `h` followed by `s`:

```{code-cell} ipython3
@guppy
def doubly_controlled_inverse(c0: qubit, c1: qubit, q: qubit) -> None:
    with control(c0):
        with dagger:
            with control(c1):
                h(q)
                s(q)

doubly_controlled_inverse.check()
```

Resolving one modifier at a time gives this sequence:

```text
Source:              h q;                    s q;
Push control c1:     ctrl @ h c1, q;         ctrl @ s c1, q;
Resolve dagger:      ctrl @ sdag c1, q;      ctrl @ h c1, q;
Push control c0:     ctrl(2) @ sdag c0, c1, q;
                     ctrl(2) @ h c0, c1, q;
```



## Conjugation box

Many unitaries have a compute--action--uncompute form:

$$
U = V A V^\dagger.
$$

The first part computes a basis change, `A` performs the action, and the final part uncomputes the basis change. This is a conjugation box.

For a controlled conjugation box, only the central action needs to be controlled:

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

### Conjugation box with Pauli gadget

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



# Function flags
When using a function inside a modifier block we need to distinguish between functions with quantum effects and functions that, from the modifier point of view, are equivalent to a block of classical computation. The former are subject to the same restrictions as a modifier block, while the latter are not.


```{code-cell} ipython3
from guppylang.std.quantum import measure

@guppy
def classical_step(n: int) -> int:
    q = qubit()
    h(q)
    if measure(q):
        n = n + 1
    return n

@guppy
def modified_call(c: qubit, q: qubit) -> None:
    with control(c), dagger:
        denominator = classical_step(2)
        rx(q, angle(1 / denominator))

modified_call.check()
```

A classical function containing quantum operations can be called inside a modifier block, even if the current body of the function contains measurements or qubit allocations. In fact the modifier will not enter the function body and no restrictions will be enforced. 
Instead, If we try to call a function that operate on qubits inside a modifier block, we need to ensure that the function body meets the corresponding restrictions: a function that allocates or discard qubits cannot be called inside a control block and a function that contains control flow cannot be called inside a dagger block.
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

When a flag is declared on top of a function, Guppy verifies the function body, and checks that a call inside a modifier has the required flag. Flags are not inferred for Guppy functions.

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy(daggerable=True)
def flagged_branch(q: qubit, flag: bool) -> None:
    if flag:
        h(q)

flagged_branch.check()
```

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy(controllable=True)
def flagged_allocation() -> None:
    q = qubit()
    measure(q)

flagged_allocation.check()
```

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy(unitary=True)
def flagged_loop(q: qubit) -> None:
    for _ in range(2):
        h(q)

flagged_loop.check()
```
## Function flags with compile-time functions

Function flags can be used also with [`guppy.comptime` functions](comptime.md). Here since the control flow is evaluated at compile time, no restrictions are enforced and the function can be called inside a dagger block.

```{code-cell} ipython3
@guppy.comptime(unitary=True)
def choose_gate(q: qubit, flag: bool) -> None:
    if flag:
        h(q)
    else:
        x(q)

@guppy
def modified_comptime_call(c: qubit, q: qubit) -> None:
    with control(c), dagger:
        choose_gate(q, True)

modified_comptime_call.check()
```

Qubit allocation or measurement remains forbidden in a flagged compile-time function:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy.comptime(daggerable=True)
def allocating_comptime_function() -> None:
    q = qubit()
    h(q)
    measure(q)

allocating_comptime_function.compile()
```


## Conjugation box with functions

Now we can recall the [previous example](#conjugation-box-with-pauli-gadget) using functions. 

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


# A complete example: Grover search

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

# Loading from pytket

Loaded pytket circuits infer their modifier capabilities from their operations. A circuit containing only unitary gates is unitary, so it can be controlled and daggered. 

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

If the circuit contains measurements, resets, or discards, it is not unitary and cannot be controlled or daggered.

```{code-cell} ipython3
---
tags: [raises-exception]
---
from pytket import Circuit

circuit = Circuit(1)
circuit.H(0)
circuit.measure_all()
measured_circuit = guppy.load_pytket("measured_circuit", circuit, use_arrays=False)

@guppy
def modify_measured_circuit(c: qubit, q: qubit) -> None:
    with control(c), dagger:
        measured_circuit(q)

modify_measured_circuit.check()
```
