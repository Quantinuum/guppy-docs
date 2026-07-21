---
file_format: mystnb
kernelspec:
  name: python3
---

## Function flags

For a [control](control.md) block, calls to classical functions need no flag: they are evaluated normally and are not controlled. A call involving qubits must instead be marked `controllable=True`.

```{code-cell} ipython3
import math

from guppylang import array, guppy
from guppylang.std.builtins import control, dagger, nat, output
from guppylang.std.quantum import angle, h, measure, qubit, rx, s, x, z

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



This is different for [dagger](dagger.md) blocks: since they change the order of quantum operations, every called function, including a classical one, must be `daggerable=True`; this prevents a function from silently allocating or measuring a qubit. 

For example, an unflagged classical call is rejected in a dagger block:

```{code-cell} ipython3
---
tags: [raises-exception]
---
@guppy
def classical_helper() -> int:
    return 0

@guppy
def unflagged_call_in_dagger(qs: array[qubit, 2]) -> None:
    a = angle(1 / 4)
    with dagger:
        i = classical_helper()
        rx(qs[i], a)

unflagged_call_in_dagger.check()
```

Marking it `daggerable=True` makes the call valid:

```{code-cell} ipython3
@guppy(daggerable=True)
def daggerable_classical_helper() -> int:
    return 0

@guppy
def flagged_call_in_dagger(qs: array[qubit, 2]) -> None:
    a = angle(1 / 4)
    with dagger:
        i = daggerable_classical_helper()
        rx(qs[i], a)

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
def get_index() -> int:
    return 0

@guppy(unitary=True)
def unitary_fun(qs: array[qubit, 2], a: angle) -> None:
    i = get_index()
    rx(qs[i], a)

unitary_fun.check()
```

### Function flags with compile-time functions

Function flags can also be used with [`guppy.comptime` functions](../comptime.md). Here, since the control flow is evaluated at compile time, no restrictions are enforced and the function can be called inside a dagger block.

<!--  Say that this is possible only thank to comptime -->
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


## Higher-order functions

We can use modifiers also with higher-order functions. Higher-order functions are functions that take other functions as arguments. The modifier applies to the body of the higher-order function, so it can be used to control or dagger the function argument.
To be able to modify the function argument, we need special function types that ensure that the function argument can be modified. These types are `Controllable`, `Daggerable`, and `Unitary`. They describe functions that can be called in a [control](control.md) block, a [dagger](dagger.md) block, or both, respectively.
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



<!-- ### Grover search with higher-order functions

<!-- todo: recall here the  -->
<!-- The oracle can be supplied as a higher-order argument. Declaring it as `Unitary` ensures that every oracle used by the search has the capabilities needed by a Grover iteration.

```{code-cell} ipython3
---
tags: [remove-cell]
---
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
```

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
``` -->

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

## Next steps

- [Overview](main_page.md) — introduction to modifiers and variable scope rules.
- [Control](control.md) — add a control qubit to a block of operations.
- [Dagger](dagger.md) — reverse a block of operations and replace each gate with its inverse.
- [Examples](example.md) — worked examples including conjugation patterns and Grover search.

