---
file_format: mystnb
kernelspec:
  name: python3
---

# Controlling and Daggering quantum operations

Modifiers transform a block of quantum operations.
They automatically produce controlled and inverse versions of quantum operations. They apply to a single gate, a block containing many gates, or a function, so you can write an operation once and reuse its controlled or daggered form. Guppy generates the transformed operations, freeing you from defining and maintaining each variant by hand.

The modifier changes the underlying gates. For example, controlling a block adds the control to every gate it produces; effectively, a function `f(q)` becomes a controlled operation `ctrl-f(c, q)` with an additional control-qubit input. A dagger block reverses the gate order and replaces each gate with its inverse.

## Syntax

Use modifiers in a `with` statement.

Start with the simplest form: a single modifier on a single operation.

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import control, output
from guppylang.std.quantum import qubit, x, h, measure

@guppy
def controlled_x() -> None:
    c = qubit()
    q = qubit()
    h(q)
    with control(c):
        x(q)
    bit_c =measure(c)
    bit_q = measure(q)
    output("result", array(bit_c.read(), bit_q.read()))

controlled_x.emulator(n_qubits=2).with_shots(100).run().collated_counts()
```
Here we can observe that the `x` operation is applied only when the control qubit `c` is in the $\ket{1}$ state.

```{code-cell} ipython3
from guppylang.std.builtins import output
from guppylang.std.quantum import angle, h, measure, qubit, rx

@guppy
def rotate_then_dagger() -> None:
    q = qubit()
    a = angle(1 / 4)
    rx(q, a)
    with dagger:
        rx(q, a)
    bit = measure(q)
    output("result", bit.read())
    

rotate_then_dagger.emulator(n_qubits=2).with_shots(100).run().collated_counts()
```
Since we are applying a rotation followed by its inverse, the qubit is always measured in the $\ket{0}$ state.

Multiple modifiers may also be combined or nested.

```{code-cell} ipython3
from guppylang.std.quantum import s, qubit

@guppy
def controlled_inverse(c: qubit, q: qubit) -> None:
    with control(c), dagger:
        s(q)


controlled_inverse.check()
```

Here we take the S gate and modify it with control and dagger. This gate has a known form of control and daggering, and the operations are compatible. Therefore, when we check the program (compile), the code passes. When applied, this function acts as a C-S^\dag gate

### Modifiers and variable scope

The body has access to variables from its enclosing scope, but it cannot take ownership of them. For instance, the following program is rejected:

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
This restriction prevents a modifier from discarding a qubit: daggering or controlling a discard operation in fact can lead to unexpected results.

Moreover, assignments in a modifier block are local to that block, including assignments that reuse an outer name. 
In the following example, `denominator` is not available outside the `with dagger:` block.

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
The reason for this restriction is that the assignment inside a controlled block is not controlled, so the denominator variable is always defined. Thus having such a variable available outside the block would lead to unexpected results, since it would be defined even if the control qubit is in the $\ket{0}$ state.

For a similar reason, in the next example, `outer_var` is not available outside the `with dagger:` block, even though it was assigned in the outer scope. The assignment inside the block in fact overwrites the scope of the outer variable.

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

## Control

`with control(c):` applies the operations in its body only when the control qubit `c` is in $\ket{1}$. With controls $c_1, \ldots, c_n$, it applies the operation when all controls are in $\ket{1}$:

$$
\operatorname{C}^n(U)\ket{c_0\ldots c_{n-1}}\ket{\psi} =
\begin{cases}
\ket{c_0\ldots c_{n-1}}U\ket{\psi} & \text{if } c_0 = \cdots = c_{n-1} = 1, \\
\ket{c_0\ldots c_{n-1}}\ket{\psi} & \text{otherwise.}
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

### Classical control

When a controlled block contains classical control flow, the control is pushed to every quantum operation produced by the branch or loop. Evaluating the classical condition and loop bounds is not controlled. For instance, the following two programs are equivalent:

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

### Classical assignments in control blocks

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

### Forbidden operations

Control blocks allow classical operations since they can be evaluated without affecting the quantum state. However, they cannot allocate, measure, reset, or discard qubits, since these operations have quantum effects, but they are not controllable.

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


## Dagger

`with dagger:` applies the inverse of its body. If the body performs $U_1$ followed by $U_2$, the dagger block performs $U_2^\dagger$ followed by $U_1^\dagger$.

```{code-cell} ipython3
from guppylang.std.quantum import s

@guppy
def sx_dg(q: qubit) -> None:
    with dagger:
        s(q)
        x(q)

sx_dg.check()
```



### Classical assignments in dagger blocks

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
sdg q;
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

### Forbidden operations in dagger blocks

Dagger blocks have the same qubit-operation restrictions as control blocks and cannot contain control flow. They also cannot perform observable classical effects such as `output`, `panic`, or `exit`: reversing the quantum operations must not change when those effects occur.

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

```{code-cell} ipython3
---
tags: [raises-exception]
---
from guppylang.std.builtins import output

@guppy
def output_in_dagger(q: qubit) -> None:
    with dagger:
        output("value", True)

output_in_dagger.check()
```
### Combining dagger and controls

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
Resolve dagger:      ctrl @ sdg c1, q;      ctrl @ h c1, q;
Push control c0:     ctrl(2) @ sdg c0, c1, q;
                     ctrl(2) @ h c0, c1, q;
```



### Conjugation pattern

Many unitaries have a compute--action--uncompute form:

$$
U = V A V^\dagger.
$$

The first part computes a basis change, `A` performs the action, and the final part uncomputes the basis change. This is a conjugation box.

For a controlled conjugation, only the central action $A$ needs to be controlled:

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

#### Conjugation box with Pauli gadget

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



## Function flags

For a control block, calls to classical functions need no flag: they are evaluated normally and are not controlled. A call involving qubits must instead be marked `controllable=True`.


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
def controlled_classical_call(c: qubit, q: qubit) -> None:
    with control(c):
        denominator = classical_step(2)
        rx(q, angle(1 / denominator))

controlled_classical_call.check()
```



This is different for dagger blocks: since they change the order of quantum operations, every called function, including a classical one, must be `daggerable=True`; this prevents a function from silently allocating or measuring a qubit. 

For example, an unflagged classical call is rejected in a dagger block:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def classical_helper(n: int) -> int:
    return n * 2

@guppy
def unflagged_call_in_dagger(q: qubit) -> None:
    with dagger:
        rx(q, angle(1 / classical_helper(2)))

unflagged_call_in_dagger.check()
```

Marking it `daggerable=True` makes the call valid:

```{code-cell} ipython3
@guppy(daggerable=True)
def daggerable_classical_helper(n: int) -> int:
    return n * 2

@guppy
def flagged_call_in_dagger(q: qubit) -> None:
    with dagger:
        rx(q, angle(1 / daggerable_classical_helper(2)))

flagged_call_in_dagger.check()
```

A call valid inside both `control` and `dagger` must be `unitary=True`.
Declaring a function with `@guppy(unitary=True)` or with `@guppy(daggerable=True, controllable=True)` is equivalent.


```{code-cell} ipython3
@guppy(unitary=True)
def unitary_gate(q: qubit) -> None:
    h(q)

@guppy(daggerable=True, controllable=True)
def dagger_and_controllable_gate(q: qubit) -> None:
    h(q)

@guppy
def explicit_controlled_dagger_call(c: qubit, q: qubit) -> None:
    with control(c), dagger:
        unitary_gate(q)
        dagger_and_controllable_gate(q)

explicit_controlled_dagger_call.check()
```



When a flag is declared on a function, Guppy verifies the function body, ensuring that it adheres to the constraints imposed by the flag.


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



The `unitary` flag also requires dagger constraints, so every classical function called inside a `unitary` function must be at least `daggerable=True`.


```{code-cell} ipython3
@guppy(daggerable=True)
def rotation_denominator(n: int) -> int:
    return n * 2

@guppy(unitary=True)
def rotation_with_helper(q: qubit) -> None:
    rx(q, angle(1 / rotation_denominator(2)))

rotation_with_helper.check()
```

### Function flags with compile-time functions

Function flags can also be used with [`guppy.comptime` functions](comptime.md). Here, since the control flow is evaluated at compile time, no restrictions are enforced and the function can be called inside a dagger block.

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


### Conjugation pattern with functions

Now we can revisit the [previous example](#conjugation-box-with-pauli-gadget) using functions. 

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


## Higher-order functions

We can use modifiers also with higher-order functions. Higher-order functions are functions that take other functions as arguments. The modifier applies to the body of the higher-order function, so it can be used to control or dagger the function argument.
To be able to modify the function argument, we need special function types that ensure that the function argument can be modified. These types are `Controllable`, `Daggerable`, and `Unitary`. They describe functions that can be called in a control block, a dagger block, or both, respectively.
This lets the type checker verify the required capability when the function is passed.


```{code-cell} ipython3
from guppylang.std.builtins import Controllable, Daggerable, Unitary

@guppy
def apply_controlled(op: Controllable[[qubit], None], c: qubit, q: qubit) -> None:
    with control(c):
        op(q)

@guppy
def apply_dagger(op: Daggerable[[qubit], None], q: qubit) -> None:
    with dagger:
        op(q)

@guppy
def apply_controlled_dagger(op: Unitary[[qubit], None], c: qubit, q: qubit) -> None:
    with control(c), dagger:
        op(q)

@guppy(controllable=True)
def controllable_x(q: qubit) -> None:
    x(q)

@guppy(daggerable=True)
def daggerable_s(q: qubit) -> None:
    s(q)

@guppy(unitary=True)
def unitary_h(q: qubit) -> None:
    h(q)

@guppy
def use_modifiable_functions(c: qubit, q: qubit) -> None:
    apply_controlled(controllable_x, c, q)
    apply_dagger(daggerable_s, q)
    apply_controlled_dagger(unitary_h, c, q)

use_modifiable_functions.check()
```

The higher-order function itself can be called inside a modifier block. It must declare the capability required by that block; its function argument then carries the same requirement.

```{code-cell} ipython3
@guppy(unitary=True)
def apply_unitary(op: Unitary[[qubit], None], q: qubit) -> None:
    op(q)

@guppy
def modify_higher_order_call(c: qubit, q: qubit) -> None:
    with control(c), dagger:
        apply_unitary(unitary_h, q)

modify_higher_order_call.check()
```

The annotation is checked at the call site. A function with insufficient capabilities is rejected:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy(daggerable=True)
def only_daggerable(q: qubit) -> None:
    s(q)

@guppy
def need_controllable(c: qubit, q: qubit) -> None:
    apply_controlled(only_daggerable, c, q)

need_controllable.check()
```

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy(controllable=True)
def only_controllable(q: qubit) -> None:
    x(q)

@guppy
def need_daggerable(q: qubit) -> None:
    apply_dagger(only_controllable, q)

need_daggerable.check()
```

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy(daggerable=True)
def not_unitary(q: qubit) -> None:
    s(q)

@guppy
def need_unitary(c: qubit, q: qubit) -> None:
    apply_controlled_dagger(not_unitary, c, q)

need_unitary.check()
```



### Grover search with higher-order functions

The oracle can be supplied as a higher-order argument. Declaring it as `Unitary` ensures that every oracle used by the search has the capabilities needed by a Grover iteration.

```{code-cell} ipython3
@guppy(unitary=True)
def grover_step_with_oracle[n: nat](
    oracle: Unitary[[array[qubit, n], qubit], None],
    controllers: array[qubit, n],
    target: qubit,
) -> None:
    oracle(controllers, target)
    diffuse(controllers, target)

@guppy.comptime
def grover_with_oracle(
    oracle: Unitary[[array[qubit, 2], qubit], None],
) -> None:
    controllers = array(qubit(), qubit())
    target = qubit()
    apply_hadamards(controllers)
    h(target)

    iterations = round(math.pi * math.sqrt(2 ** (len(controllers) + 1)) / 4)
    for _ in range(iterations):
        grover_step_with_oracle(oracle, controllers, target)

    q0, q1 = controllers
    output("result", array(measure(q0).read(), measure(q1).read(), measure(target).read()))

@guppy
def run_grover_101() -> None:
    grover_with_oracle(mark_10_01)

run_grover_101.emulator(n_qubits=3).with_shots(1000).run().collated_counts()
```

## Loading from pytket

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
