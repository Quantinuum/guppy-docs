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

We can make use of modifiers inside a context manager using the `with` keyword.

Let's start with a simple example of a controlled single-qubit operation. We will realize this with the `control` modifier. 

```{code-cell} ipython3
from guppylang import guppy, array
from guppylang.std.builtins import control, output
from guppylang.std.quantum import qubit, h, measure

@guppy
def controlled_h() -> None:
    c = qubit()
    q = qubit()
    h(q)
    with control(c):
        h(q)
    bit_c = measure(c)
    bit_q = measure(q)
    output("result", array(bit_c.read(), bit_q.read()))

controlled_h.emulator(n_qubits=2).with_shots(100).run().collated_counts()
```
Here we can observe that the `h` operation is applied only when the control qubit `c` is in the $\ket{1}$ state.

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

Here we take the $S$ gate and modify it with control and dagger. The controlled and daggered version of the gate is synthetised by the compiler at compilation time, in fact since the gate is a unitary operation we can always produced its controlled-daggered version.
When applied, this function acts as a $CS^\dagger$ gate

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

