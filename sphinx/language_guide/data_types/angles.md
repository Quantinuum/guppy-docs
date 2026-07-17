---
file_format: mystnb
kernelspec:
  name: python3
---

# Angles

Guppy has a dedicated [`angle`](../../api/generated/guppylang.std.angles.html) type. It allows exact representation of angles for gates in the Clifford hierarchy, which can be useful for optimization.

An angle represents a rotation by a number of half-turns, where a half-turn is equivalent to $\pi$ radians. For example, `angle(1/2)` is equivalent to $\pi/2$. The built-in constant `pi` equals `angle(1)`, so it is useful for converting between angles and radians, as performing arithmetic on it also results in an angle.

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.angles import angle, pi
from guppylang.std.quantum import qubit, rz

@guppy
def rotate_twice(q: qubit, r: float) -> None:
    # Both angle constructions and therefore rotations are equivalent.
    a = pi * r
    rz(q, a)
    a = angle(r)
    rz(q, a)

rotate_twice.check()
```

Note that the angle values do not wrap or identify with themselves modulo any number of complete turns, so for example, `angle(2)` does not equal `angle(0)`.