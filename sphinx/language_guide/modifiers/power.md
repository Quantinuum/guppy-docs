---
file_format: mystnb
kernelspec:
  name: python3
language_info:
  name: python
---

# Power

`with power(n):` repeats its body `n` times. If the body implements $U$, the block implements $U^n$. The exponent can be a non-negative integer literal or a Guppy expression of type `nat` evaluated at runtime. When `n` is zero, the body is skipped.

In Guppy 1.2.1, enable experimental features to type-check these examples. Executing power blocks requires the compiler from the [power implementation branch](https://github.com/Quantinuum/guppylang/tree/na/2456-enable-power).

```{code-cell} ipython3
from guppylang import enable_experimental_features

enable_experimental_features()
```

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import nat, power
from guppylang.std.quantum import h, qubit, s

@guppy
def repeat_hs(q: qubit, n: nat) -> None:
    with power(n):
        h(q)
        s(q)

repeat_hs.check()
```

For `n = 2`, the gates run in the order $H, S, H, S$. Each repetition starts with the qubit in the state left by the previous one.

## Classical variables in a power block

Each repetition can read values from the enclosing scope and define its own local variables. For example, this block computes the same rotation angle on each repetition.

```{code-cell} ipython3
from guppylang.std.quantum import angle, rz

@guppy
def repeat_rotation(q: qubit, quarters: int) -> None:
    with power(2):
        theta = angle(quarters / 4)
        rz(q, theta)

repeat_rotation.check()
```

Assignments are local to each repetition. Guppy rejects the following block because `quarters += 1` reads the incoming value of `quarters` and assigns to the same name. Use a `for` loop when a classical value needs to carry over to the next iteration.

```python
@guppy
def increasing_rotation(q: qubit, quarters: int) -> None:
    with power(2):
        quarters += 1
        rz(q, angle(quarters / 4))
```

## Combining power with other modifiers

Powers can be nested. A `power(n)` block around a `power(m)` block repeats the inner body $n m$ times. On its own, `power` allows classical control flow and calls to ordinary Guppy functions. When you combine it with [control](control.md) or [dagger](dagger.md), the restrictions of those modifiers apply.

```{code-cell} ipython3
from guppylang.std.builtins import control, dagger

@guppy
def controlled_inverse_hs(c: qubit, q: qubit, n: nat) -> None:
    with control(c), power(n), dagger:
        h(q)
        s(q)

controlled_inverse_hs.check()
```

When the control qubit is in $\ket{1}$, each repetition applies $S^\dagger$ followed by $H$ to `q`. When the control is in $\ket{0}$, the target is unchanged.

## Nested powers

Read the qubits in `a, b, c` order. A right rotation moves their values from `(a, b, c)` to `(c, a, b)`.

```{code-cell} ipython3
from guppylang import array
from guppylang.std.builtins import output
from guppylang.std.mem import mem_swap
from guppylang.std.quantum import measure, x

@guppy
def rotate(a: qubit, b: qubit, c: qubit) -> None:
    mem_swap(b, c)
    mem_swap(a, b)

@guppy
def four_rotations() -> None:
    a, b, c = qubit(), qubit(), qubit()
    x(a)
    with power(2), power(2):
        rotate(a, b, c)
    output("abc", array(measure(a).read(), measure(b).read(), measure(c).read()))

four_rotations.check()
```

Both powers form one modifier chain on the single call to `rotate`. Their exponents multiply. Starting from $\ket{100}$, three rotations return to $\ket{100}$ and the fourth gives $\ket{010}$. On the power implementation branch, run one shot to see the result.

```python
four_rotations.emulator(n_qubits=3).with_shots(1).run().collated_counts()
# Counter({(('abc', '010'),): 1})
```

```{note}
With two exponents of `2**32` on the same chain, the expected state is also $\ket{010}$ because `2**64 % 3 == 1`. The power branch's resolver multiplies in 64 bits, so the count wraps to zero and leaves the state at $\ket{100}$.
```

A power on a different call has its own exponent. Here `step` rotates three times and then flips `a`.

```{code-cell} ipython3
from guppylang.std.quantum import x as flip

@guppy
def step(a: qubit, b: qubit, c: qubit) -> None:
    with power(3):
        rotate(a, b, c)
    flip(a)

@guppy
def twice(a: qubit, b: qubit, c: qubit) -> None:
    with power(2):
        step(a, b, c)

twice.check()
```

The outer power repeats the whole step. Three rotations and a flip run first, then three rotations and another flip. The exponent on the inner call to `rotate` stays three.
