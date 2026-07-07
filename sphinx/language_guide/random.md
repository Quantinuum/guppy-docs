---
file_format: mystnb
kernelspec:
  name: python3
---

# Random Number Generation

Guppy provides two implementations of the `PCG32` pseudo-random number generator. ``guppylang.std.random.PCG32`` is a native Guppy implementation, while ``guppylang.std.qsystem.random.RNG`` lowers to calls to a platform RNG. 

Both implement the same `PCG32` algorithm. The main distinction between the two implementations is how the state of the RNG is stored. The native Guppy RNG stores the state locally, while the `qsystem` RNG state is stored globally. This difference has implications in programs with multiple RNGs, as the global nature of the `qsystem` RNG state means that each RNG cannot be treated as completely independent.

## Native Guppy RNG

An instance of the native Guppy RNG can be initialised using ``guppylang.std.random.seeded_pcg32`` by providing a `seed`. The RNG provides the following methods:

- `next_int()` returns a signed 32-bit integer.
- `next_int_bounded(bound)` returns a value in `[0, bound)`, where `bound` is strictly positive.

The following code snippet demonstrates usage of the RNG:

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.random import seeded_pcg32
from guppylang.std.num import nat

@guppy
def native_rng() -> None:
    rng = seeded_pcg32(nat(123))
    a = rng.next_int()
    b = rng.next_int_bounded(nat(10))
    c = rng.next_int()

native_rng.check()
```

Note that the native RNG does not need to be discarded at the end of the program.

## qsystem RNG

To instantiate a qsystem RNG, use ``guppylang.std.qsystem.random.RNG`` by providing an initial `seed`.  

- `random_int()` returns a signed 32-bit integer.
- `random_int_bounded(bound)` returns a value in `[0, bound)`.

Use of the qsystem RNG is similar to the native RNG. However, as the RNG is backed by a platform RNG, it must be discarded at the end of the program. 

```{code-cell} ipython3
from guppylang.std.qsystem.random import RNG

@guppy
def qsystem_rng() -> None:
    rng = RNG(123)
    x = rng.random_int()
    y = rng.random_int_bounded(10)
    rng.discard()

qsystem_rng.check()
```

Note that the platform RNG must be discarded at the end of the program.

Additional helper functions are also provided by the qsystem RNG:

- `random_angle()`: returns a random angle in the range `[-pi, pi)`.
- `random_clifford_angle()`: returns a multiple of `pi / 2`.
- `random_float()`: returns a random float in the range `[0, 1)`.
- `random_advance(delta)`: advances (or backtracks) the RNG state by `delta` steps.
- `shuffle(array)`: shuffles an array in-place using Fisher-Yates shuffle.

### Discrete distributions

Guppy also includes functionality to define a weighted distribution over the values `0, 1, ..., N - 1` using ``guppylang.std.qsystem.random.make_discrete_distribution`` from which samples can be drawn using the qsystem RNG.

Below is an example of a weighted distribution over `0, 1, 2` with weights `1.0, 2.0, 7.0`:

```{code-cell} ipython3
from guppylang.std.builtins import array
from guppylang.std.qsystem.random import make_discrete_distribution

@guppy
def weighted_choice() -> None:
    weights = array(1.0, 2.0, 7.0)
    dist = make_discrete_distribution(weights)
    rng = RNG(123)
    choice = dist.sample(rng)
    rng.discard()

weighted_choice.check()
```

## RNG state is mutable

RNGs are stateful objects; sampling mutates state, and each draw depends on past draws. Therefore, they should be handled like other mutable Guppy state and passed around wherever a shared stream is required.

In the case of `guppylang.std.qsystem.random.RNG`, the RNG is also a linear resource and should be explicitly discarded with `rng.discard()` when you are done.

## Which implementation to use?

Both the native and qsystem RNGs implement the same `PCG32` algorithm. However, there may be scenarios in which one should be preferred. If you are not sure, the qsystem (``guppylang.std.qsystem.random``) RNG is recommended as it provides a broader range of functionality.

The native RNG may be useful if:

- You require multiple, independent RNG instances.
- You want access to, or control of, the internal state of the RNG.
