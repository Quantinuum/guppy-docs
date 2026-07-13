---
file_format: mystnb
kernelspec:
  name: python3
---

# Random Number Generation

Guppy provides two implementations of the [PCG32](https://www.pcg-random.org/) pseudo-random number generator (RNG). ``guppylang.std.qsystem.random`` lowers to calls to a platform RNG, while ``guppylang.std.random`` is a native Guppy implementation.

The main distinction between the two implementations is how the state of the RNG is stored. The native Guppy RNG stores the state locally, while the platform RNG state is stored globally. This difference has implications for programs with multiple RNGs, as the global nature of the platform RNG state means that each RNG cannot be treated as completely independent.

## Platform RNG

If you are unsure which RNG to use, the platform RNG is recommended due to its broader range of available features. To create an instance of the platform RNG in Guppy, use [guppylang.std.qsystem.random.RNG](../api/generated/guppylang.std.qsystem.random.RNG.rst) with an initial `seed`. The RNG offers two basic methods for generating random integers:

- `random_int()` returns a signed 32-bit integer.
- `random_int_bounded(bound)` returns a value in `[0, bound)`.

The example below demonstrates the platform RNG. It is initialised with the seed `123`, then used to draw a random integer and a bounded integer. Finally, the RNG instance must be discarded.

```{code-cell} ipython3
from guppylang import guppy
from guppylang.std.qsystem.random import RNG

@guppy
def qsystem_rng() -> None:
    rng = RNG(123)
    x = rng.random_int()
    y = rng.random_int_bounded(10)
    rng.discard()

qsystem_rng.check()
```

Additional helper functions for specific scenarios are also available when using the platform RNG:

- `random_angle()`: returns a random angle in the range `[-pi, pi)`.
- `random_clifford_angle()`: returns a multiple of `pi / 2`.
- `random_float()`: returns a random float in the range `[0, 1)`.
- `random_advance(delta)`: advances (or backtracks) the RNG state by `delta` steps.
- `shuffle(array)`: shuffles an array in-place using Fisher-Yates shuffle.

While it is possible to create multiple platform RNG instances in a single program, it is not recommended as they cannot be treated as completely independent. For programs that require multiple independent streams of randomness, the [native Guppy RNG](#native-rng) is recommended.

### Discrete distributions

Guppy also includes functionality for defining a weighted distribution over the values `0, 1, ..., N - 1` using ``guppylang.std.qsystem.random.make_discrete_distribution``. Samples can then be drawn using the platform RNG.

Below is an example of a weighted distribution over `0, 1, 2` with weights `1.0, 2.0, 7.0` that will correspond to which Pauli operator we apply to the qubit.

```{code-cell} ipython3
from guppylang.std.quantum import qubit, measure, x, y, z
from guppylang.std.builtins import array
from guppylang.std.qsystem.random import make_discrete_distribution

@guppy
def weighted_choice() -> None:
    q = qubit()

    paulis: array[Function[[qubit], None], 3] = array(x, y, z)
    weights = array(1.0, 2.0, 7.0)

    dist = make_discrete_distribution(weights)
    rng = RNG(123)
    choice = dist.sample(rng)

    paulis[choice](q)

    measure(q)

    rng.discard()

weighted_choice.check()
```

## Native RNG

An instance of the native Guppy RNG can be initialised using ``guppylang.std.random.seeded_pcg32`` with a `seed`. The native RNG provides the following methods for generating random numbers:

- `next_int()` returns a signed 32-bit integer.
- `next_int_bounded(bound)` returns a value in `[0, bound)`.

The following example demonstrates usage of the RNG and mirrors the platform RNG example above:

```{code-cell} ipython3
from guppylang.std.random import seeded_pcg32
from guppylang.std.num import nat

@guppy
def native_rng() -> None:
    rng = seeded_pcg32(nat(123))
    a = rng.next_int()
    b = rng.next_int_bounded(nat(10))

native_rng.check()
```

Note that the native RNG does not need to be discarded at the end of the program. Both the `seed` and `bound` arguments must be `nat` values to ensure they are non-negative.

## RNG state is mutable

Pseudo-random number generators are stateful objects; sampling mutates the state, and each draw depends on previous draws. Therefore, RNG instances should be handled like other mutable Guppy state and passed around wherever a shared stream of randomness is required.

In the case of the platform RNG, it is also a linear resource and should be explicitly discarded with `rng.discard()` when you are done.

## Which implementation to use?

Both the native and platform RNGs use the `PCG32` algorithm. However, there may be scenarios in which one should be preferred. If you are not sure, the [platform RNG](#platform-rng) is recommended as it provides a broader range of functionality.

The native RNG may be useful if any of the following apply:

- You require multiple, independent RNG instances.
- You want access to, or control of, the internal state of the RNG.
- You want to inspect the RNG implementation.
