---
file_format: mystnb
kernelspec:
  name: python3
---

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
from guppylang import array, guppy
from guppylang.std.builtins import control, nat
from guppylang.std.quantum import h, qubit, x


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
