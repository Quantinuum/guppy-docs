---
file_format: mystnb
kernelspec:
  name: python3
---

## Dagger

`with dagger:` applies the inverse of its body. If the body performs $U_1$ followed by $U_2$, the dagger block performs $U_2^\dagger$ followed by $U_1^\dagger$.

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.builtins import control, dagger
from guppylang.std.quantum import h, qubit, s, x

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

```
sdg q;
h q;
```

<!-- 
TODO: till more classical op are allowed inside dagger blocks, we 
do not need this in docs

see (https://github.com/Quantinuum/guppy-docs/issues/194)

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
<!--  ADD A comment here -->

<!-- ```
a = 4;
theta = 1 / a;
a /= 2;
phi = 1 / a;
rz(-phi) q;
rx(-theta) q;
``` -->

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

